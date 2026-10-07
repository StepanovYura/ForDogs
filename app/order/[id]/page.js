import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { syncOrderPayment } from '@/lib/payments'
import { formatPrice } from '@/lib/money'
import PaymentPanel from './PaymentPanel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Заказ — NIXDOG STUDIO' }

// Страница заказа: пока он не оплачен — здесь QR-код СБП или кнопка
// оплаты картой на странице банка, после оплаты — подтверждение. Статус при каждом открытии сверяем с банком сами, не
// дожидаясь вебхука, — чтобы человек сразу видел правду.
export default async function OrderPage({ params }) {
  const user = await requireUser(`/order/${params.id}`)

  let order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  })

  if (!order) notFound()
  if (order.userId !== user.id && user.role !== 'ADMIN') notFound()

  if (order.status === 'PENDING') {
    order = await syncOrderPayment(order).catch(() => order)
  }

  const paid = order.status !== 'PENDING' && order.status !== 'CANCELED'
  const awaitingPayment = order.status === 'PENDING' && order.paymentUrl && order.paymentExpiresAt

  const qrSvg = awaitingPayment && order.paymentMethod === 'sbp'
    ? await QRCode.toString(order.paymentUrl, {
        type: 'svg',
        margin: 0,
        errorCorrectionLevel: 'M',
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
    : null

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
            Заказ отменён, деньги не списаны. Товары вернулись в каталог — можно
            оформить заказ заново.
          </div>
        ) : awaitingPayment ? (
          <PaymentPanel
            method={order.paymentMethod}
            orderId={order.id}
            qrSvg={qrSvg}
            paymentUrl={order.paymentUrl}
            expiresAt={order.paymentExpiresAt.toISOString()}
          />
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
            <span>{paid ? 'Оплачено' : 'К оплате'}</span>
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
