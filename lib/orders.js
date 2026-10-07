// Переходы заказа между статусами, которые запускает оплата.
// Каждый переход атомарный и срабатывает только из PENDING: если вебхук
// банка, страница заказа и проверка просроченных QR придут одновременно,
// остатки вернутся на склад ровно один раз.
import 'server-only'
import { prisma } from './prisma'
import { notifyOrder } from './notifications'

export async function markOrderPaid(orderId, { paymentStatus = 'succeeded' } = {}) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID', paymentStatus, paidAt: new Date() },
  })
  const changed = updated.count === 1
  // Письма — без ожидания: оплата не должна ждать почтовый сервер.
  if (changed) notifyOrder(orderId, 'paid')
  return changed
}

// notify: false — когда покупатель и так видит ошибку на экране (банк не
// создал платёж при оформлении), письмо «заказ отменён» было бы лишним.
export async function cancelOrder(orderId, { paymentStatus, notify = true } = {}) {
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: 'PENDING' },
      data: { status: 'CANCELED', ...(paymentStatus ? { paymentStatus } : {}) },
    })
    if (updated.count === 0) return false

    const items = await tx.orderItem.findMany({ where: { orderId } })
    for (const item of items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
    return true
  })
  if (changed && notify) notifyOrder(orderId, 'canceled')
  return changed
}
