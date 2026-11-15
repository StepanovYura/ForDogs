import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { STATUS_LABELS, STATUS_ORDER, statusBadgeClass } from '@/lib/orderStatus'
import { expireStalePayments } from '@/lib/payments'
import { refundOrderAction, setOrderStatusAction } from './actions'
import { METHOD_LABELS } from '@/lib/paymentMethods'

export const dynamic = 'force-dynamic'

// Дата из строки поиска: 15.11.2026, 15.11 (текущий год) или 2026-11-15.
// Возвращает сутки по Москве как промежуток в UTC.
function parseDay(q) {
  let d, m, y
  let match = q.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/)
  if (match) [, d, m, y] = match
  else if ((match = q.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [, y, m, d] = match
  else return null
  const year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : new Date().getFullYear()
  const start = new Date(Date.UTC(year, Number(m) - 1, Number(d)) - 3 * 60 * 60 * 1000)
  if (Number.isNaN(start.getTime())) return null
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) }
}

// Поиск по номеру заказа, имени, почте, телефону, городу, адресу или дате.
async function searchWhere(q) {
  if (!q) return {}
  const contains = { contains: q, mode: 'insensitive' }
  const or = [
    { customerName: contains },
    { customerEmail: contains },
    { customerPhone: contains },
    { city: contains },
    { address: contains },
    { user: { email: contains } },
  ]
  const number = q.replace(/^№\s*/, '')
  if (/^\d{1,9}$/.test(number)) or.push({ number: Number(number) })
  const day = parseDay(q)
  if (day) or.push({ createdAt: day })
  // Телефон ищем по цифрам: «9161234567», «8 916 123» и «+7 (916) 123-45-67»
  // найдут один и тот же заказ, в каком бы виде номер ни был сохранён.
  // Сохранённый номер начинается с 7 (+7 …), а покупатель мог набрать
  // его с 8 — приводим к одному виду.
  const digits = q.replace(/\D/g, '').replace(/^8(?=\d{4})/, '7')
  if (digits.length >= 4) {
    const rows = await prisma.$queryRaw`
      SELECT id FROM orders WHERE regexp_replace("customerPhone", '[^0-9]', '', 'g') LIKE ${'%' + digits + '%'}`
    if (rows.length) or.push({ id: { in: rows.map((r) => r.id) } })
  }
  return { OR: or }
}

export default async function AdminOrdersPage({ searchParams }) {
  const filter = searchParams?.status
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim().slice(0, 100) : ''
  const withQ = (href) => (q ? `${href}${href.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}` : href)
  // Чтобы в списке не висели «ожидает оплаты» заказы с давно истёкшим QR.
  await expireStalePayments().catch(() => {})
  const orders = await prisma.order.findMany({
    where: {
      ...(STATUS_ORDER.includes(filter) ? { status: filter } : {}),
      ...(await searchWhere(q)),
    },
    include: { items: true, user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const error = typeof searchParams?.error === 'string' ? searchParams.error.slice(0, 400) : ''

  return (
    <>
      {error && <div className="form-error">{error}</div>}
      <form className="inline-form" action="/admin/orders" style={{ marginBottom: 16 }}>
        {STATUS_ORDER.includes(filter) && <input type="hidden" name="status" value={filter} />}
        <input
          type="search"
          name="q"
          className="input"
          style={{ maxWidth: 420 }}
          defaultValue={q}
          placeholder="№ заказа, имя, почта, телефон, адрес или дата (15.11.2026)"
          aria-label="Поиск заказов"
        />
        <button type="submit" className="btn btn--sm">
          Найти
        </button>
        {q && (
          <a href={STATUS_ORDER.includes(filter) ? `/admin/orders?status=${filter}` : '/admin/orders'} className="link-underline small">
            Сбросить
          </a>
        )}
      </form>

      <div className="filters">
        <a href={withQ('/admin/orders')} aria-current={!filter}>
          Все
        </a>
        {STATUS_ORDER.map((status) => (
          <a
            key={status}
            href={withQ(`/admin/orders?status=${status}`)}
            aria-current={filter === status}
          >
            {STATUS_LABELS[status]}
          </a>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty">
          <p>{q ? `По запросу «${q}» заказов не найдено.` : 'Заказов с таким статусом нет.'}</p>
        </div>
      ) : (
        orders.map((order) => (
          <div className="panel" key={order.id}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <div>
                <strong>Заказ №{order.number}</strong>
                <div className="small muted">
                  {formatDateTime(order.createdAt)} ·{' '}
                  {order.customerName} · {order.customerPhone} ·{' '}
                  {order.user?.email || order.customerEmail}
                </div>
                <div className="small muted">
                  {order.deliveryTitle &&
                    `${order.deliveryTitle} (${order.deliveryKopeks ? formatPrice(order.deliveryKopeks) : 'бесплатно'}) · `}
                  {order.city}, {order.address}
                  {order.postalCode ? `, ${order.postalCode}` : ''}
                </div>
                {order.comment && (
                  <div className="small muted">Комментарий: {order.comment}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={statusBadgeClass(order.status)}>
                  {STATUS_LABELS[order.status]}
                </span>
                <div style={{ marginTop: 8, fontSize: 17 }}>
                  {formatPrice(order.totalKopeks)}
                </div>
                {order.paymentId && (
                  <div className="small muted">
                    {METHOD_LABELS[order.paymentMethod] || 'СБП'}
                    {order.paymentProvider ? ` (${order.paymentProvider})` : ''}: {order.paymentId}
                  </div>
                )}
                {order.paymentStatus === 'refunded' && (
                  <div className="small muted">Деньги возвращены покупателю</div>
                )}
                {order.paymentStatus === 'refund_manual' && (
                  <div className="small muted">Отменён без возврата через сайт — деньги вернуть в кабинете банка</div>
                )}
                {order.status === 'CANCELED' && order.paymentStatus === 'succeeded' && (
                  <form action={refundOrderAction} style={{ maxWidth: 260 }}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <div className="small" style={{ color: 'var(--danger)', margin: '4px 0 8px' }}>
                      Деньги пришли уже после отмены заказа.
                    </div>
                    <button type="submit" className="btn btn--sm">
                      Вернуть деньги
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.titleSnapshot}</td>
                      <td className="muted">{item.colorSnapshot}</td>
                      <td className="muted">{item.sizeSnapshot}</td>
                      <td className="muted">{item.quantity} шт.</td>
                      <td>{formatPrice(item.priceKopeks * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.status === 'PAID' && order.cancelRequestedAt && (
              <div className="form-error" style={{ marginTop: 16 }}>
                Покупатель просит отменить заказ ({formatDateTime(order.cancelRequestedAt)})
                {order.cancelReason ? `: «${order.cancelReason}»` : ''}. Если заказ ещё не
                отправлен — выберите статус «Отменён», деньги вернутся автоматически. Если уже
                отправлен — свяжитесь с покупателем.
              </div>
            )}

            <form action={setOrderStatusAction} className="inline-form" style={{ marginTop: 16 }}>
              <input type="hidden" name="orderId" value={order.id} />
              <label className="caption" htmlFor={`status-${order.id}`}>
                Статус
              </label>
              <select
                id={`status-${order.id}`}
                name="status"
                className="select"
                defaultValue={order.status}
                style={{ width: 'auto' }}
              >
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <input
                name="trackingNumber"
                className="input"
                style={{ width: 180 }}
                placeholder="Трек-номер"
                defaultValue={order.trackingNumber || ''}
                aria-label="Трек-номер посылки"
              />
              <button type="submit" className="btn btn--sm">
                Сохранить
              </button>
              {['PAID', 'SHIPPED', 'DONE'].includes(order.status) &&
                !['refunded', 'refund_manual'].includes(order.paymentStatus) && (
                  <label className="small" style={{ whiteSpace: 'nowrap' }}>
                    <input type="checkbox" name="refund" defaultChecked /> при отмене вернуть деньги
                  </label>
                )}
              <span className="small muted">
                Покупателю уходит письмо о новом статусе. Отмена возвращает товары на склад, а у
                оплаченного заказа — и деньги покупателю (всю сумму, вместе с доставкой).
              </span>
            </form>
          </div>
        ))
      )}
    </>
  )
}
