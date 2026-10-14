// Порядок цветов товара — общий для каталога и карточки товара.
//
// Первым всегда идёт цвет, чьё фото стоит обложкой в каталоге (первое фото
// товара): что покупатель видел в каталоге, то он и видит, открыв товар.
// Остальные — в привычном порядке, а незнакомые цвета — в порядке, в
// котором их завели.
const COLOR_ORDER = ['burgundy', 'beige', 'grey', 'black']

export function orderedColors(variants = [], coverColorSlug = null) {
  const list = []
  for (const v of variants) {
    if (!list.some((c) => c.slug === v.colorSlug)) {
      list.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
    }
  }
  const rank = (slug) => {
    if (coverColorSlug && slug === coverColorSlug) return -1
    const i = COLOR_ORDER.indexOf(slug)
    return i === -1 ? COLOR_ORDER.length : i
  }
  // sort устойчивый: незнакомые цвета сохраняют порядок, в котором их завели.
  return list.sort((a, b) => rank(a.slug) - rank(b.slug))
}
