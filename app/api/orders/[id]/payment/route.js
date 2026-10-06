// Статус оплаты заказа для страницы с QR-кодом.
//   GET    — сверить с банком и вернуть статус (страница опрашивает раз в пару секунд)
//   DELETE — покупатель отказался от оплаты: отзываем QR и снимаем резерв
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { cancelOrderPayment, syncOrderPayment } from '@/lib/payments'

export const dynamic = 'force-dynamic'

async function findOwnOrder(id) {
  const user = await getCurrentUser()
  if (!user) return null
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order || (order.userId !== user.id && user.role !== 'ADMIN')) return null
  return order
}

export async function GET(_request, { params }) {
  const order = await findOwnOrder(params.id)
  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })

  const fresh = await syncOrderPayment(order)
  return NextResponse.json({ status: fresh.status })
}

export async function DELETE(_request, { params }) {
  const order = await findOwnOrder(params.id)
  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 })

  try {
    const fresh = await cancelOrderPayment(order)
    return NextResponse.json({ status: fresh.status })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 502 })
  }
}
