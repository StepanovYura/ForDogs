// Фильтры каталога: разбор параметров адреса, условие для базы и набор
// значений, из которых строится панель фильтров.
//
// Все фильтры живут в адресе страницы (/catalog?color=grey&size=M&max=5000),
// поэтому выборкой можно поделиться ссылкой, а кнопка «назад» работает
// как ожидается.
import 'server-only'
import { prisma } from './prisma'
import { TAG_GROUPS } from './tags'
import { compareSizes } from './sizes'

// 18 делится и на 3 колонки (компьютер, планшет), и на 2 (телефон) — на
// любом экране последний ряд страницы получается полным.
export const PER_PAGE = 18


export const SORTS = [
  { value: '', title: 'По умолчанию' },
  { value: 'new', title: 'Сначала новые' },
  { value: 'price-asc', title: 'Сначала дешевле' },
  { value: 'price-desc', title: 'Сначала дороже' },
]

// Поля, которые рисует карточка товара в сетке.
export const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  priceKopeks: true,
  images: {
    orderBy: { position: 'asc' },
    take: 1,
    select: { url: true, thumbUrl: true, alt: true },
  },
  variants: {
    select: { colorSlug: true, colorHex: true, colorName: true, stock: true, priceKopeks: true },
  },
}

const list = (value) =>
  (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 30)

const rubles = (value) => {
  const n = Number(String(value ?? '').replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export function parseFilters(searchParams = {}) {
  const sort = SORTS.some((s) => s.value === searchParams.sort) ? searchParams.sort : ''
  const tags = {}
  for (const group of TAG_GROUPS) {
    const values = list(searchParams[group.key])
    if (values.length) tags[group.key] = values
  }
  return {
    category: searchParams.category ? String(searchParams.category) : '',
    q: String(searchParams.q || '').trim().slice(0, 80),
    min: rubles(searchParams.min),
    max: rubles(searchParams.max),
    colors: list(searchParams.color),
    sizes: list(searchParams.size).map((s) => s.toUpperCase()),
    inStock: searchParams.stock === '1',
    tags,
    sort,
    page: Math.max(1, Number(searchParams.page) || 1),
  }
}

// Адрес каталога с изменёнными параметрами. Пустые значения выкидываем,
// номер страницы сбрасываем при любой смене фильтров.
export function catalogHref(filters, patch = {}) {
  const f = { ...filters, page: 1, ...patch }
  const params = new URLSearchParams()
  if (f.category) params.set('category', f.category)
  if (f.q) params.set('q', f.q)
  if (f.min) params.set('min', String(f.min))
  if (f.max) params.set('max', String(f.max))
  for (const c of f.colors || []) params.append('color', c)
  for (const s of f.sizes || []) params.append('size', s)
  for (const [group, values] of Object.entries(f.tags || {})) {
    for (const v of values) params.append(group, v)
  }
  if (f.inStock) params.set('stock', '1')
  if (f.sort) params.set('sort', f.sort)
  if (f.page > 1) params.set('page', String(f.page))
  const query = params.toString()
  return query ? `/catalog?${query}` : '/catalog'
}

export function buildWhere(f) {
  const and = [{ isActive: true }]

  if (f.category) and.push({ category: { slug: f.category } })
  if (f.q) and.push({ title: { contains: f.q, mode: 'insensitive' } })
  // Цена: товар подходит, если в диапазон попадает хоть один его размер —
  // со своей ценой или с ценой товара.
  if (f.min || f.max) {
    const range = {
      ...(f.min ? { gte: f.min * 100 } : {}),
      ...(f.max ? { lte: f.max * 100 } : {}),
    }
    and.push({
      OR: [
        { variants: { some: { priceKopeks: range } } },
        { priceKopeks: range, variants: { some: { priceKopeks: null } } },
        { priceKopeks: range, variants: { none: {} } },
      ],
    })
  }

  // Цвет, размер и наличие проверяем на одном и том же варианте: «серый M
  // в наличии» — это конкретная вещь, а не серый XS плюс чёрный M.
  if (f.colors.length || f.sizes.length || f.inStock) {
    and.push({
      variants: {
        some: {
          ...(f.colors.length ? { colorSlug: { in: f.colors } } : {}),
          ...(f.sizes.length ? { size: { in: f.sizes } } : {}),
          ...(f.inStock ? { stock: { gt: 0 } } : {}),
        },
      },
    })
  }

  // Внутри группы — «или» (зима или осень), между группами — «и».
  for (const [group, slugs] of Object.entries(f.tags)) {
    and.push({ tags: { some: { group, slug: { in: slugs } } } })
  }

  return { AND: and }
}

export function buildOrderBy(sort) {
  if (sort === 'new') return [{ createdAt: 'desc' }]
  if (sort === 'price-asc') return [{ priceKopeks: 'asc' }, { position: 'asc' }]
  if (sort === 'price-desc') return [{ priceKopeks: 'desc' }, { position: 'asc' }]
  return [{ position: 'asc' }, { createdAt: 'desc' }]
}

// Размеры, которые показываются в фильтре всегда, даже если товаров
// такого размера сейчас нет.
export const BASE_SIZES = ['XS', 'S', 'M', 'L', 'XL']

// Значения для панели фильтров. Панель всегда одна и та же, в какой бы
// категории ни был покупатель и что бы ни лежало на складе: все цвета,
// которые когда-либо заводились у товаров, все размеры и все метки из
// раздела «Фильтры» в админке. Так панель не прыгает по высоте, а вариант,
// под который сейчас ничего нет, просто вернёт пустую выдачу.
export async function getFacets() {
  const [colorRows, sizeRows, price, sizePrice, tags] = await Promise.all([
    prisma.productVariant.findMany({
      distinct: ['colorSlug'],
      select: { colorSlug: true, colorName: true, colorHex: true },
      orderBy: { colorName: 'asc' },
    }),
    prisma.productVariant.findMany({ distinct: ['size'], select: { size: true } }),
    prisma.product.aggregate({
      where: { isActive: true },
      _min: { priceKopeks: true },
      _max: { priceKopeks: true },
    }),
    // Цены размеров, если они отличаются от цены товара.
    prisma.productVariant.aggregate({
      where: { product: { isActive: true }, priceKopeks: { not: null } },
      _min: { priceKopeks: true },
      _max: { priceKopeks: true },
    }),
    prisma.tag.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
  ])

  const sizes = [...new Set([...BASE_SIZES, ...sizeRows.map((r) => r.size)])]
  const mins = [price._min.priceKopeks, sizePrice._min.priceKopeks].filter((v) => v != null)
  const maxs = [price._max.priceKopeks, sizePrice._max.priceKopeks].filter((v) => v != null)

  return {
    colors: colorRows.map((c) => ({ slug: c.colorSlug, name: c.colorName, hex: c.colorHex })),
    sizes: sizes.sort(compareSizes),
    priceMin: Math.floor((mins.length ? Math.min(...mins) : 0) / 100),
    priceMax: Math.ceil((maxs.length ? Math.max(...maxs) : 0) / 100),
    // Группа показывается, если в ней заведена хотя бы одна метка.
    tagGroups: TAG_GROUPS.map((g) => ({
      ...g,
      tags: tags.filter((t) => t.group === g.key).map((t) => ({ slug: t.slug, title: t.title })),
    })).filter((g) => g.tags.length > 0),
  }
}
