import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/money'
import { STATUS_LABELS, STATUS_ORDER, statusBadgeClass } from '@/lib/orderStatus'
import { expireStalePayments } from '@/lib/payments'
import { setOrderStatusAction } from './actions'
import { METHOD_LABELS } from '@/lib/paymentMethods'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage({ searchParams }) {
  const filter = searchParams?.status
  // Чтобы в списке не висели «ожидает оплаты» заказы с давно истёкшим QR.
  await expireStalePayments().catch(() => {})
  const orders = await prisma.order.findMany({
    where: STATUS_ORDER.includes(filter) ? { status: filter } : {},
    include: { items: true, user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <>
      <div className="filters">
        <a href="/admin/orders" aria-current={!filter}>
          Все
        </a>
        {STATUS_ORDER.map((status) => (
          <a
            key={status}
            href={`/admin/orders?status=${status}`}
            aria-current={filter === status}
          >
            {STATUS_LABELS[status]}
          </a>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="empty">
          <p>Заказов с таким статусом нет.</p>
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
                  {new Date(order.createdAt).toLocaleString('ru-RU')} ·{' '}
                  {order.customerName} · {order.customerPhone} ·{' '}
                  {order.user?.email || order.customerEmail}
                </div>
                <div className="small muted">
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
                {order.status === 'CANCELED' && order.paymentStatus === 'succeeded' && (
                  <div className="small" style={{ color: 'var(--danger)', maxWidth: 260 }}>
                    Деньги пришли уже после отмены заказа: верните оплату через банк
                    или восстановите заказ вручную.
                  </div>
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
              <span className="small muted">
                Покупателю уходит письмо о новом статусе. Отмена возвращает товары на склад.
              </span>
            </form>
          </div>
        ))
      )}
    </>
  )
}
