import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatPrice } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { STATUS_LABELS, statusBadgeClass } from '@/lib/orderStatus'
import CancelRequest from '@/app/order/[id]/CancelRequest'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Мои заказы — NIXDOG STUDIO' }

export default async function MyOrdersPage() {
  const user = await requireUser('/account/orders')

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="page section--tight" style={{ paddingBottom: 56 }}>
      <nav className="crumbs">
        <Link href="/account">Личный кабинет</Link>
        <span>/</span>
        <span>Заказы</span>
      </nav>

      <h1 className="h1">Мои заказы</h1>

      {orders.length === 0 ? (
        <div className="empty">
          <p>Заказов пока нет.</p>
          <Link href="/catalog" className="btn">
            В каталог
          </Link>
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
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div>
                <Link href={`/order/${order.id}`}>
                  <strong>Заказ №{order.number}</strong>
                </Link>
                <div className="small muted">
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
              <span className={statusBadgeClass(order.status)}>
                {STATUS_LABELS[order.status]}
              </span>
            </div>

            {order.items.map((item) => (
              <div className="summary__row" key={item.id}>
                <span className="muted">
                  {item.titleSnapshot}
                  <br />
                  <span className="small">
                    {item.colorSnapshot} · {item.sizeSnapshot} · {item.quantity} шт.
                  </span>
                </span>
                <span>{formatPrice(item.priceKopeks * item.quantity)}</span>
              </div>
            ))}

            {order.deliveryTitle && (
              <div className="summary__row">
                <span className="muted">Доставка: {order.deliveryTitle}</span>
                <span>{order.deliveryKopeks ? formatPrice(order.deliveryKopeks) : 'бесплатно'}</span>
              </div>
            )}
            <div className="summary__total">
              <span>Итого</span>
              <span>{formatPrice(order.totalKopeks)}</span>
            </div>

            <p className="small muted" style={{ margin: 0 }}>
              Доставка: {order.city}, {order.address}
              {order.postalCode ? `, ${order.postalCode}` : ''}
            </p>

            {order.status === 'SHIPPED' && order.trackingNumber && (
              <p className="small" style={{ margin: '8px 0 0' }}>
                Трек-номер: {order.trackingNumber}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
              {order.status === 'PENDING' && order.paymentUrl ? (
                <Link href={`/order/${order.id}`} className="btn btn--sm">
                  Перейти к оплате
                </Link>
              ) : (
                <Link href={`/order/${order.id}`} className="btn btn--sm btn--ghost">
                  Открыть заказ
                </Link>
              )}
            </div>

            {/* Оплаченный, ещё не отправленный заказ можно попросить отменить. */}
            {order.status === 'PAID' &&
              (order.cancelRequestedAt ? (
                <div className="form-ok" style={{ marginTop: 16 }}>
                  Запрос на отмену отправлен {formatDateTime(order.cancelRequestedAt)}. Если заказ
                  ещё не передан в доставку, мы отменим его и вернём деньги.
                </div>
              ) : (
                <CancelRequest orderId={order.id} />
              ))}
          </div>
        ))
      )}
    </div>
  )
}
