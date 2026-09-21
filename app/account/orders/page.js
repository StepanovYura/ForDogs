import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { formatPrice } from '@/lib/money'
import { STATUS_LABELS, statusBadgeClass } from '@/lib/orderStatus'

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
                <strong>Заказ №{order.number}</strong>
                <div className="small muted">
                  {new Date(order.createdAt).toLocaleString('ru-RU')}
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

            <div className="summary__total">
              <span>Итого</span>
              <span>{formatPrice(order.totalKopeks)}</span>
            </div>

            <p className="small muted" style={{ margin: 0 }}>
              Доставка: {order.city}, {order.address}
              {order.postalCode ? `, ${order.postalCode}` : ''}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
