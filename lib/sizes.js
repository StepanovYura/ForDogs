// Размеры и цены по размерам — общее для витрины, корзины и админки.

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

// Итоговая цена варианта: своя цена размера или цена товара.
export function variantPrice(variant, product) {
  return variant?.priceKopeks ?? product.priceKopeks
}

// Диапазон цен товара по всем его вариантам — для «от 2 900 ₽» в каталоге.
export function priceRange(product) {
  const prices = (product.variants || []).map((v) => variantPrice(v, product))
  if (prices.length === 0) return { min: product.priceKopeks, max: product.priceKopeks }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
