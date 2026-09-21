import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { fetchPayment, yookassaConfigured } from '@/lib/yookassa'
import { formatPrice } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Заказ — NIXDOG STUDIO' }

// Страница, на которую ЮKassa возвращает покупателя после оплаты.
// Вебхук может прийти на секунду позже, поэтому здесь мы дополнительно
// сами спрашиваем у ЮKassa статус — чтобы человек сразу видел правду.
export default async function OrderPage({ params }) {
  const user = await requireUser(`/order/${params.id}`)

  let order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  })

  if (!order) notFound()
  if (order.userId !== user.id && user.role !== 'ADMIN') notFound()

  if (order.status === 'PENDING' && order.paymentId && yookassaConfigured()) {
    const payment = await fetchPayment(order.paymentId).catch(() => null)
    if (payment?.status === 'succeeded') {
      order = await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', paymentStatus: 'succeeded', paidAt: new Date() },
        include: { items: true },
      })
    }
  }

  const paid = order.status !== 'PENDING' && order.status !== 'CANCELED'

  return (
    <div className="page section">
      <div className="form-narrow" style={{ maxWidth: 560 }}>
        <h1 className="h1">Заказ №{order.number}</h1>

        {paid ? (
          <div className="form-ok">
            Оплата прошла. Мы уже собираем заказ и напишем на {order.customerEmail},
            когда передадим его в доставку.
          </div>
        ) : order.status === 'CANCELED' ? (
          <div className="form-error">
            Оплата не прошла, заказ отменён. Товары вернулись в каталог — можно
            оформить заказ заново.
          </div>
        ) : (
          <div className="form-error">
            Платёж ещё не подтверждён. Если вы только что оплатили — обновите
            страницу через минуту.
          </div>
        )}

        <div className="panel" style={{ marginTop: 24 }}>
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
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/account/orders" className="btn btn--ghost">
            Мои заказы
          </Link>
          <Link href="/catalog" className="btn">
            В каталог
          </Link>
        </div>
      </div>
    </div>
  )
}
