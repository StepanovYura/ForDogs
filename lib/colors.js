// Порядок цветов товара — один на всё: админку, каталог и карточку товара.
//
// Его задают в «Админка → товар → Цвета» кнопкой «Выше» (поле colorPosition
// у вариантов). Первый цвет — основной: его фото стоит обложкой в каталоге,
// с него открывается карточка товара. Пока порядок не меняли (у всех 0) —
// по алфавиту, как и было в админке.
export function orderedColors(variants = []) {
  const list = []
  for (const v of variants) {
    if (!list.some((c) => c.slug === v.colorSlug)) {
      list.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex, position: v.colorPosition ?? 0 })
    }
  }
  return list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'ru'))
}

// Обложка товара в каталоге: первое фото основного цвета, а если у него
// нет фото — первое общее фото, иначе просто первое фото товара.
// images — уже отсортированы по position.
export function coverImage(images = [], colors = []) {
  for (const c of colors) {
    const own = images.find((i) => i.colorSlug === c.slug)
    if (own) return own
    if (c === colors[0]) {
      const common = images.find((i) => !i.colorSlug)
      if (common) return common
    }
  }
  return images[0] ?? null
}
