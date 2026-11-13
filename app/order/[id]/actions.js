'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { notifyOrder } from '@/lib/notifications'

// Покупатель просит отменить оплаченный заказ. Сразу не отменяем: вещь
// могли уже упаковать или отправить, решает администратор. Отменит он —
// деньги вернутся автоматически.
export async function requestCancelAction(_prevState, formData) {
  const orderId = String(formData.get('orderId'))
  const user = await requireUser(`/order/${orderId}`)

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order || order.userId !== user.id) return { error: 'Заказ не найден' }
  if (order.status !== 'PAID') {
    return { error: 'Этот заказ уже передан в доставку — напишите нам, поможем с возвратом.' }
  }
  if (order.cancelRequestedAt) return { ok: true }

  // updateMany с условием — чтобы двойной клик не прислал два письма.
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: 'PAID', cancelRequestedAt: null },
    data: {
      cancelRequestedAt: new Date(),
      cancelReason: String(formData.get('reason') || '').trim().slice(0, 500),
    },
  })
  if (updated.count === 1) notifyOrder(orderId, 'cancel_requested')

  revalidatePath(`/order/${orderId}`)
  revalidatePath('/account/orders')
  revalidatePath('/admin/orders')
  return { ok: true }
}
