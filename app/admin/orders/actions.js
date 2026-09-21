'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { STATUS_ORDER } from '@/lib/orderStatus'

export async function setOrderStatusAction(formData) {
  await requireAdmin()

  const orderId = String(formData.get('orderId'))
  const status = String(formData.get('status'))
  if (!STATUS_ORDER.includes(status)) return

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order || order.status === status) return

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
        paidAt: status === 'PAID' && !order.paidAt ? new Date() : order.paidAt,
      },
    })
  })

  revalidatePath('/admin/orders')
}
