// Корзина и избранное вошедшего покупателя в базе. Позиции корзины
// отдаём уже «развёрнутыми» — с названием, ценой, фото и остатком из базы,
// чтобы на другом устройстве корзина выглядела так же и цены не устаревали.
import 'server-only'
import { prisma } from './prisma'
import { parseHumanSizes, variantPrice } from './sizes'

const MAX_ITEMS = 50

export async function getUserCart(userId) {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { position: 'asc' } } } },
        },
      },
    },
  })
  return rows
    .filter((row) => row.variant.product.isActive)
    .map(({ variant, humanSize, quantity }) => {
      const { product } = variant
      const image =
        product.images.find((i) => i.colorSlug === variant.colorSlug) ||
        product.images.find((i) => !i.colorSlug) ||
        product.images[0]
      return {
        variantId: variant.id,
        productSlug: product.slug,
        title: product.title,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        size: variant.size,
        ...(humanSize ? { humanSize } : {}),
        priceKopeks: variantPrice(variant, product),
        image: image?.url || '',
        stock: variant.stock,
        quantity: Math.min(quantity, Math.max(variant.stock, 1)),
      }
    })
}

// Заменяет корзину аккаунта присланной из браузера. Чужие и несуществующие
// размеры отбрасываем, размер человека — только из списка товара.
export async function setUserCart(userId, items) {
  const wanted = new Map()
  for (const item of (Array.isArray(items) ? items : []).slice(0, MAX_ITEMS)) {
    const variantId = String(item?.variantId || '')
    const quantity = Math.min(Math.max(Math.round(Number(item?.quantity) || 0), 1), 20)
    const humanSize = String(item?.humanSize || '').trim().toUpperCase().slice(0, 12)
    if (variantId) wanted.set(`${variantId}|${humanSize}`, { variantId, humanSize, quantity })
  }

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...wanted.values()].map((i) => i.variantId) } },
    select: { id: true, product: { select: { humanSizes: true } } },
  })
  const rows = [...wanted.values()].flatMap((item) => {
    const variant = variants.find((v) => v.id === item.variantId)
    if (!variant) return []
    const allowed = parseHumanSizes(variant.product.humanSizes)
    const humanSize = allowed.length ? (allowed.includes(item.humanSize) ? item.humanSize : '') : ''
    if (allowed.length && !humanSize) return []
    return [{ userId, variantId: item.variantId, humanSize, quantity: item.quantity }]
  })

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.cartItem.createMany({ data: rows, skipDuplicates: true }),
  ])
}

export async function getUserFavorites(userId) {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  })
  return rows.map((r) => r.productId)
}

// Заменяет избранное аккаунта. Порядок — как прислали: первые — свежие.
export async function setUserFavorites(userId, ids) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 100)
  const existing = await prisma.product.findMany({ where: { id: { in: list } }, select: { id: true } })
  const known = new Set(existing.map((p) => p.id))
  const now = Date.now()
  await prisma.$transaction([
    prisma.favorite.deleteMany({ where: { userId } }),
    prisma.favorite.createMany({
      // Время создания задаёт порядок: первый в списке — самый новый.
      data: list
        .filter((id) => known.has(id))
        .map((productId, index) => ({ userId, productId, createdAt: new Date(now - index * 1000) })),
      skipDuplicates: true,
    }),
  ])
}
