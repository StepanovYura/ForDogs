// Пересчитывает Product.minPriceKopeks — самую низкую цену товара с учётом
// цен размеров и скидки. По этому полю работают фильтр и сортировка по цене.
// Админка пересчитывает его сама при каждом изменении товара, а скрипт
// нужен один раз — для товаров, созданных до появления поля:
//   npm run prices:recalc
// Логика та же, что в lib/sizes.js (priceRange) — держите их одинаковыми.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function applyDiscount(kopeks, percent = 0) {
  const p = Math.min(Math.max(Number(percent) || 0, 0), 99)
  if (!p) return kopeks
  return Math.round((kopeks * (100 - p)) / 100 / 100) * 100
}

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: { select: { priceKopeks: true } } },
  })
  let changed = 0
  for (const product of products) {
    const prices = product.variants.map((v) => v.priceKopeks ?? product.priceKopeks)
    const min = applyDiscount(prices.length ? Math.min(...prices) : product.priceKopeks, product.discountPercent)
    if (product.minPriceKopeks !== min) {
      await prisma.product.update({ where: { id: product.id }, data: { minPriceKopeks: min } })
      changed++
    }
  }
  console.log(`Товаров: ${products.length}, обновлено: ${changed}`)
}

main().finally(() => prisma.$disconnect())
