// Создание заказа и платежа. Порядок важен:
//  1) проверяем вход;
//  2) в одной транзакции перечитываем цены и остатки ИЗ БАЗЫ и списываем их
//     (цену из браузера не берём — её легко подменить);
//  3) создаём платёж в банке выбранным способом: QR-код СБП оплачивают на
//     странице заказа, картой — на платёжной странице банка.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkoutSchema } from '@/lib/validation'
import { cancelOrder } from '@/lib/orders'
import { expireStalePayments, startPayment } from '@/lib/payments'
import { parseHumanSizes, sizeLabel, variantPrice } from '@/lib/sizes'
import { deliveryPrice, getDeliveryOptions } from '@/lib/delivery'
import { HOSTED_METHODS } from '@/lib/paymentMethods'

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

  // Доставка: способ выбирает покупатель, цену берём из базы. Если в
  // админке заведены способы доставки — выбрать один из них обязательно.
  const delivery = await getDeliveryOptions()
  const deliveryMethod = delivery.methods.find((m) => m.id === input.deliveryMethodId) || null
  if (delivery.methods.length > 0 && !deliveryMethod) {
    return NextResponse.json({ error: 'Выберите способ доставки' }, { status: 400 })
  }

  // Снимаем резерв с заказов, чей QR истёк, — иначе последняя вещь может
  // числиться занятой за тем, кто давно ушёл со страницы оплаты.
  await expireStalePayments().catch(() => {})

  let order
  try {
    order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: input.items.map((i) => i.variantId) } },
        include: {
          product: { include: { images: { orderBy: { position: 'asc' }, take: 1 } } },
        },
      })

      // Сколько штук каждого размера собаки берут всего: у парной вещи один
      // размер собаки может лежать в корзине с разными размерами человека.
      const wanted = {}
      for (const item of input.items) wanted[item.variantId] = (wanted[item.variantId] || 0) + item.quantity

      const lines = []
      for (const item of input.items) {
        const variant = variants.find((v) => v.id === item.variantId)
        if (!variant || !variant.product.isActive) {
          throw new Error('Один из товаров больше не продаётся. Обновите корзину.')
        }
        if (variant.stock < wanted[variant.id]) {
          throw new Error(
            `«${variant.product.title}», ${variant.colorName}, размер ${variant.size}: в наличии ${variant.stock} шт.`
          )
        }
        // Парная вещь: размер человека обязателен и должен быть из списка товара.
        const humanSizes = parseHumanSizes(variant.product.humanSizes)
        const humanSize = humanSizes.length ? String(item.humanSize || '').toUpperCase() : ''
        if (humanSizes.length && !humanSizes.includes(humanSize)) {
          throw new Error(`«${variant.product.title}»: выберите размер человека. Обновите корзину.`)
        }
        lines.push({
          variantId: variant.id,
          titleSnapshot: variant.product.title,
          colorSnapshot: variant.colorName,
          sizeSnapshot: sizeLabel(variant.size, humanSize),
          imageSnapshot: variant.product.images[0]?.url || '',
          // Цена размера (или товара) со скидкой товара. Всегда из базы,
          // не из браузера.
          priceKopeks: variantPrice(variant, variant.product),
          quantity: item.quantity,
        })
      }

      const itemsKopeks = lines.reduce((sum, l) => sum + l.priceKopeks * l.quantity, 0)
      const deliveryKopeks = deliveryPrice(deliveryMethod, itemsKopeks, delivery.freeFromKopeks)
      const totalKopeks = itemsKopeks + deliveryKopeks

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
          deliveryTitle: deliveryMethod ? deliveryMethod.title : '',
          deliveryKopeks,
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
    const payment = await startPayment(order, input.paymentMethod)
    // Заказ создан — корзина аккаунта пуста на всех устройствах. Браузер
    // свою тоже очистит, но он сразу уходит на страницу банка и может не
    // успеть это сохранить.
    await prisma.cartItem.deleteMany({ where: { userId: user.id } }).catch(() => {})
    // СБП — на нашу страницу заказа с QR-кодом; карта — на платёжную
    // страницу банка, оттуда банк вернёт покупателя на страницу заказа.
    const redirectUrl = HOSTED_METHODS.includes(input.paymentMethod) ? payment.url : `/order/${order.id}`
    return NextResponse.json({ orderId: order.id, redirectUrl })
  } catch (error) {
    // Банк не создал платёж — возвращаем товары на склад и отменяем заказ,
    // иначе остатки «зависнут» в никуда.
    console.error('Оплата: не удалось создать платёж', error)
    await cancelOrder(order.id, { notify: false }).catch(() => {})
    return NextResponse.json(
      { error: error.message || 'Оплата временно недоступна' },
      { status: 502 }
    )
  }
}
