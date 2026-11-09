// Размеры, цены по размерам и скидки — общее для витрины, корзины,
// оформления заказа и админки.

// Привычный порядок размеров. Любой другой размер, заведённый в админке
// (например «2XL» или «Щенок»), встаёт после них по алфавиту.
export const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

// Подсказки при добавлении размера в админке.
export const SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export function sizeRank(size) {
  const index = SIZE_ORDER.indexOf(size)
  return index === -1 ? SIZE_ORDER.length : index
}

export function compareSizes(a, b) {
  return sizeRank(a) - sizeRank(b) || String(a).localeCompare(String(b), 'ru')
}

// Скидка в процентах → цена, округлённая до целого рубля.
export function applyDiscount(kopeks, percent = 0) {
  const p = Math.min(Math.max(Number(percent) || 0, 0), 99)
  if (!p) return kopeks
  return Math.round((kopeks * (100 - p)) / 100 / 100) * 100
}

// Цена размера без скидки: своя цена размера или цена товара.
export function fullVariantPrice(variant, product) {
  return variant?.priceKopeks ?? product.priceKopeks
}

// Итоговая цена размера — со скидкой товара. Её платит покупатель.
export function variantPrice(variant, product) {
  return applyDiscount(fullVariantPrice(variant, product), product.discountPercent)
}

// Диапазон цен товара по всем его вариантам — для «от 2 900 ₽» в каталоге.
// full — те же цены без скидки, для зачёркнутой старой цены.
export function priceRange(product) {
  const full = (product.variants || []).map((v) => fullVariantPrice(v, product))
  if (full.length === 0) full.push(product.priceKopeks)
  const fullMin = Math.min(...full)
  const fullMax = Math.max(...full)
  return {
    min: applyDiscount(fullMin, product.discountPercent),
    max: applyDiscount(fullMax, product.discountPercent),
    fullMin,
    fullMax,
    discount: product.discountPercent || 0,
  }
}

// Размеры человека у парных вещей: строка из админки «XS, S, M» → ['XS', 'S', 'M'].
export function parseHumanSizes(value) {
  const sizes = String(value || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase().slice(0, 12))
    .filter(Boolean)
  return [...new Set(sizes)].slice(0, 12).sort(compareSizes)
}

// Как показывать размер позиции: у парной вещи — оба размера.
export function sizeLabel(size, humanSize) {
  return humanSize ? `собака ${size} / человек ${humanSize}` : size
}
