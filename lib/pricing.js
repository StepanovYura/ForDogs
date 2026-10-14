// Пересчёт «самой низкой цены» товара (Product.minPriceKopeks) — с учётом
// цен размеров и скидки. По этому полю работают фильтр и сортировка по
// цене в каталоге. Вызывается после каждого изменения цены, скидки,
// размеров или цветов товара.
import 'server-only'
import { prisma } from './prisma'
import { priceRange } from './sizes'

export async function recalcProductPrice(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { priceKopeks: true } } },
  })
  if (!product) return
  const { min } = priceRange(product)
  if (product.minPriceKopeks !== min) {
    await prisma.product.update({ where: { id: productId }, data: { minPriceKopeks: min } })
  }
}

export async function recalcAllProductPrices() {
  const products = await prisma.product.findMany({ select: { id: true } })
  for (const p of products) await recalcProductPrice(p.id)
  return products.length
}
