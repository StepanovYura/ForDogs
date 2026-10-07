'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { STATUS_ORDER } from '@/lib/orderStatus'
import { notifyOrder } from '@/lib/notifications'

// Какое письмо уходит покупателю при смене статуса вручную.
const STATUS_EVENTS = { PAID: 'paid', SHIPPED: 'shipped', DONE: 'done', CANCELED: 'canceled' }

export async function setOrderStatusAction(formData) {
  await requireAdmin()

  const orderId = String(formData.get('orderId'))
  const status = String(formData.get('status'))
  const trackingNumber = String(formData.get('trackingNumber') ?? '').trim().slice(0, 64)
  if (!STATUS_ORDER.includes(status)) return

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) return

  const statusChanged = order.status !== status
  const trackingChanged = (order.trackingNumber || '') !== trackingNumber
  if (!statusChanged && !trackingChanged) return

  // Отмена заказа возвращает зарезервированные остатки на склад —
  // но только один раз, поэтому проверяем прежний статус.
  const returningStock = status === 'CANCELED' && order.status !== 'CANCELED'

  await prisma.$transaction(async (tx) => {
    if (returningStock) {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        trackingNumber: trackingNumber || null,
        paidAt: status === 'PAID' && !order.paidAt ? new Date() : order.paidAt,
      },
    })
  })

  // Письмо — только при реальной смене статуса. Если в уже отправленный
  // заказ дописали трек-номер, письмо «в доставке» уходит ещё раз — с ним.
  if (statusChanged && STATUS_EVENTS[status]) {
    notifyOrder(orderId, STATUS_EVENTS[status])
  } else if (!statusChanged && trackingChanged && status === 'SHIPPED' && trackingNumber) {
    notifyOrder(orderId, 'shipped')
  }

  revalidatePath('/admin/orders')
}
