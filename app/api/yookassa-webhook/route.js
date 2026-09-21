// HTTP-уведомления от ЮKassa о статусе платежа.
// Тело уведомления само по себе ничего не доказывает, поэтому мы
// перезапрашиваем платёж по его id в API ЮKassa и верим только ответу API.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchPayment } from '@/lib/yookassa'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  let notification
  try {
    notification = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const paymentId = notification?.object?.id
  if (!paymentId) return NextResponse.json({ ok: true })

  const payment = await fetchPayment(paymentId)
  if (!payment) {
    // Отвечаем 200, иначе ЮKassa будет слать повтор целые сутки.
    return NextResponse.json({ ok: true })
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ paymentId }, { id: payment.metadata?.orderId || '—' }] },
    include: { items: true },
  })
  if (!order) return NextResponse.json({ ok: true })

  if (payment.status === 'succeeded' && order.status === 'PENDING') {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentId,
        paymentStatus: payment.status,
        paidAt: new Date(),
      },
    })
  } else if (payment.status === 'canceled' && order.status === 'PENDING') {
    // Оплата не прошла — возвращаем зарезервированные остатки на склад.
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          })
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELED', paymentStatus: payment.status },
      })
    })
  } else {
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: payment.status },
    })
  }

  return NextResponse.json({ ok: true })
}
