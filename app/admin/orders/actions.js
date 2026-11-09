'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { STATUS_ORDER } from '@/lib/orderStatus'
import { notifyOrder } from '@/lib/notifications'
import { getProvider } from '@/lib/payments'

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

  // «Долями»: деньги за оплаченный заказ при отмене возвращаем через API,
  // а при вручении сообщаем о доставке — «Долями» пробьёт чек «Полный
  // расчёт». Если «Долями» отказали, статус не меняем и показываем ошибку.
  let paymentStatus = order.paymentStatus
  const provider = order.paymentProvider === 'dolyame' ? getProvider('dolyame') : null
  if (provider && statusChanged && order.paymentId) {
    const wasPaid = ['PAID', 'SHIPPED', 'DONE'].includes(order.status)
    if (status === 'CANCELED' && wasPaid && paymentStatus !== 'refunded') {
      try {
        await provider.refund(order.paymentId, order, { delivered: paymentStatus === 'delivered' })
        paymentStatus = 'refunded'
      } catch (error) {
        console.error('Долями: возврат не прошёл', order.paymentId, error)
        throw new Error(`Долями не приняли возврат: ${error.message}`)
      }
    } else if (status === 'DONE' && provider.needsDeliveryReceipt() && paymentStatus === 'succeeded') {
      try {
        await provider.completeDelivery(order.paymentId, order)
        paymentStatus = 'delivered'
      } catch (error) {
        console.error('Долями: не принято подтверждение доставки', order.paymentId, error)
        throw new Error(`Долями не приняли подтверждение доставки: ${error.message}`)
      }
    }
  }

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
        paymentStatus,
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
