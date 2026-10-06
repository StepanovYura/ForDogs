// Переходы заказа между статусами, которые запускает оплата.
// Каждый переход атомарный и срабатывает только из PENDING: если вебхук
// банка, страница заказа и проверка просроченных QR придут одновременно,
// остатки вернутся на склад ровно один раз.
import 'server-only'
import { prisma } from './prisma'

export async function markOrderPaid(orderId, { paymentStatus = 'succeeded' } = {}) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: 'PENDING' },
    data: { status: 'PAID', paymentStatus, paidAt: new Date() },
  })
  return updated.count === 1
}

export async function cancelOrder(orderId, { paymentStatus } = {}) {
  return prisma.$transaction(async (tx) => {
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
}
