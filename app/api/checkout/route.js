// Создание заказа и платежа. Порядок важен:
//  1) проверяем вход;
//  2) в одной транзакции перечитываем цены и остатки ИЗ БАЗЫ и списываем их
//     (цену из браузера не берём — её легко подменить);
//  3) создаём платёж в ЮKassa и отдаём ссылку на оплату.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkoutSchema } from '@/lib/validation'
import { createPayment } from '@/lib/yookassa'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const input = parsed.data

  let order
  try {
    order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: input.items.map((i) => i.variantId) } },
        include: {
          product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
        },
      })

      const lines = []
      for (const item of input.items) {
        const variant = variants.find((v) => v.id === item.variantId)
        if (!variant || !variant.product.isActive) {
          throw new Error('Один из товаров больше не продаётся. Обновите корзину.')
        }
        if (variant.stock < item.quantity) {
          throw new Error(
            `«${variant.product.title}», ${variant.colorName}, размер ${variant.size}: в наличии ${variant.stock} шт.`
          )
        }
        lines.push({
          variantId: variant.id,
          titleSnapshot: variant.product.title,
          colorSnapshot: variant.colorName,
          sizeSnapshot: variant.size,
          imageSnapshot: variant.product.images[0]?.url || '',
          priceKopeks: variant.product.priceKopeks,
          quantity: item.quantity,
        })
      }

      const totalKopeks = lines.reduce((sum, l) => sum + l.priceKopeks * l.quantity, 0)

      // Резервируем остатки сразу: условие `stock >= quantity` в самом
      // UPDATE защищает от гонки, если двое покупают последнюю вещь.
      for (const line of lines) {
        const updated = await tx.productVariant.updateMany({
          where: { id: line.variantId, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        })
        if (updated.count === 0) {
          throw new Error('Товар разобрали, пока вы оформляли заказ. Обновите корзину.')
        }
      }

      return tx.order.create({
        data: {
          userId: user.id,
          totalKopeks,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          city: input.city,
          address: input.address,
          postalCode: input.postalCode || '',
          comment: input.comment || '',
          items: { create: lines },
        },
        include: { items: true },
      })
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Не удалось создать заказ' },
      { status: 400 }
    )
  }

  // Платёж создаём уже вне транзакции: внешний запрос не должен держать базу.
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const payment = await createPayment({
      order,
      returnUrl: `${site.replace(/\/$/, '')}/order/${order.id}`,
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: payment.id, paymentStatus: payment.status },
    })

    return NextResponse.json({
      orderId: order.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
    })
  } catch (error) {
    // Платёж не создался — возвращаем товары на склад и отменяем заказ,
    // иначе остатки «зависнут» в никуда.
    await releaseOrder(order.id).catch(() => {})
    return NextResponse.json(
      { error: error.message || 'Оплата временно недоступна' },
      { status: 502 }
    )
  }
}

async function releaseOrder(orderId) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!current || current.status !== 'PENDING') return
    for (const item of current.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELED' } })
  })
}
