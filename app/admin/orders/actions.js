'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { STATUS_ORDER } from '@/lib/orderStatus'
import { notifyOrder } from '@/lib/notifications'
import { getProvider, refundOrderPayment } from '@/lib/payments'

// Ошибку показываем наверху списка заказов, а не падением страницы.
function fail(message) {
  redirect(`/admin/orders?error=${encodeURIComponent(message)}`)
}

// Деньги за заказ у магазина: оплачен и ещё не возвращён.
const PAID_STATUSES = ['PAID', 'SHIPPED', 'DONE']
const moneyTaken = (order) =>
  PAID_STATUSES.includes(order.status) && !['refunded', 'refund_manual'].includes(order.paymentStatus)

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

  // Отмена оплаченного заказа — сразу возврат денег через банк (или
  // «Долями»), если администратор не снял галочку: например, когда вернул
  // часть суммы сам в кабинете банка. Банк отказал — статус не меняем.
  let paymentStatus = order.paymentStatus
  if (statusChanged && status === 'CANCELED' && moneyTaken(order)) {
    if (formData.get('refund') === 'on') {
      try {
        await refundOrderPayment(order)
        paymentStatus = 'refunded'
      } catch (error) {
        console.error('Возврат не прошёл', order.paymentId, error)
        fail(`Заказ №${order.number} не отменён: банк не принял возврат — ${error.message}`)
      }
    } else {
      paymentStatus = 'refund_manual'
    }
  }

  // «Долями»: при вручении сообщаем о доставке — «Долями» пробьёт чек
  // «Полный расчёт».
  const dolyame = order.paymentProvider === 'dolyame' ? getProvider('dolyame') : null
  if (dolyame && statusChanged && status === 'DONE' && dolyame.needsDeliveryReceipt() && paymentStatus === 'succeeded') {
    try {
      await dolyame.completeDelivery(order.paymentId, order)
      paymentStatus = 'delivered'
    } catch (error) {
      console.error('Долями: не принято подтверждение доставки', order.paymentId, error)
      fail(`Заказ №${order.number}: «Долями» не приняли подтверждение доставки — ${error.message}`)
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

// Деньги пришли уже после отмены заказа (покупатель оплатил старый QR) —
// возвращаем их одной кнопкой.
export async function refundOrderAction(formData) {
  await requireAdmin()
  const order = await prisma.order.findUnique({
    where: { id: String(formData.get('orderId')) },
    include: { items: true },
  })
  if (!order || order.status !== 'CANCELED' || order.paymentStatus !== 'succeeded') return

  try {
    await refundOrderPayment(order)
  } catch (error) {
    console.error('Возврат не прошёл', order.paymentId, error)
    fail(`Заказ №${order.number}: банк не принял возврат — ${error.message}`)
  }
  await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'refunded' } })
  revalidatePath('/admin/orders')
}
