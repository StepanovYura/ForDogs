// Требования к фото товара — общие для админки и витрины.
//
// Каталог — ровная сетка одинаковых карточек 2:3 (так сняты фото
// заказчика), поэтому фото других пропорций там обрезаются по краям.
// На странице товара рамка подстраивается под само фото, и оно видно целиком.
export const CARD_RATIO = 2 / 3

// Большое фото на странице товара на экранах с высокой плотностью пикселей
// занимает около 1300 px по длинной стороне. Меньше — заметно мылится.
export const MIN_LONG_SIDE = 1200

export const PHOTO_ADVICE = 'Лучше всего: вертикальное фото 2:3, от 1600×2400 px.'

export function photoWarnings(size) {
  if (!size?.width || !size?.height) return []
  const warnings = []
  const longSide = Math.max(size.width, size.height)
  if (longSide < MIN_LONG_SIDE) {
    warnings.push(`маленькое (${size.width}×${size.height}) — на большом экране будет нечётким`)
  }
  const ratio = size.width / size.height
  if (Math.abs(ratio - CARD_RATIO) / CARD_RATIO > 0.06) {
    warnings.push('не 2:3 — в каталоге обрежется по краям, на странице товара будет целиком')
  }
  return warnings
}
