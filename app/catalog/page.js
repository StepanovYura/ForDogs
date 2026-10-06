import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCategories } from '@/lib/categories'
import {
  CARD_SELECT,
  PER_PAGE,
  buildOrderBy,
  buildWhere,
  catalogHref,
  getFacets,
  parseFilters,
} from '@/lib/catalog'
import ProductCard from '@/components/ProductCard'
import CatalogFilters from './CatalogFilters'
import CatalogToolbar from './CatalogToolbar'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Каталог — NIXDOG STUDIO',
  description: 'Одежда и аксессуары для собак: толстовки, свитшоты, куртки, банданы.',
}

export default async function CatalogPage({ searchParams }) {
  const filters = parseFilters(searchParams)
  const where = buildWhere(filters)

  const [categories, facets, total, products] = await Promise.all([
    getCategories(),
    getFacets(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: CARD_SELECT,
      orderBy: buildOrderBy(filters.sort),
      skip: (filters.page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const page = Math.min(filters.page, pages)
  const pageLink = (n) => catalogHref(filters, { page: n })

  // Выбранные фильтры — плашками над сеткой, у каждой свой крестик.
  const chips = []
  if (filters.q) chips.push({ label: `«${filters.q}»`, href: catalogHref(filters, { q: '' }) })
  if (filters.min || filters.max) {
    const label = [filters.min && `от ${filters.min} ₽`, filters.max && `до ${filters.max} ₽`]
      .filter(Boolean)
      .join(' ')
    chips.push({ label, href: catalogHref(filters, { min: null, max: null }) })
  }
  for (const slug of filters.colors) {
    const color = facets.colors.find((c) => c.slug === slug)
    chips.push({
      label: color?.name || slug,
      href: catalogHref(filters, { colors: filters.colors.filter((c) => c !== slug) }),
    })
  }
  for (const size of filters.sizes) {
    chips.push({
      label: `Размер ${size}`,
      href: catalogHref(filters, { sizes: filters.sizes.filter((s) => s !== size) }),
    })
  }
  for (const [group, slugs] of Object.entries(filters.tags)) {
    const groupFacet = facets.tagGroups.find((g) => g.key === group)
    for (const slug of slugs) {
      chips.push({
        label: groupFacet?.tags.find((t) => t.slug === slug)?.title || slug,
        href: catalogHref(filters, {
          tags: { ...filters.tags, [group]: slugs.filter((s) => s !== slug) },
        }),
      })
    }
  }
  if (filters.inStock) chips.push({ label: 'В наличии', href: catalogHref(filters, { inStock: false }) })

  const resetHref = catalogHref({ ...parseFilters({}), category: filters.category })
  const activeCategory = categories.find((c) => c.slug === filters.category)

  return (
    <div className="page section--tight">
      <nav className="crumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        {activeCategory ? (
          <>
            <Link href="/catalog">Каталог</Link>
            <span>/</span>
            <span>{activeCategory.title}</span>
          </>
        ) : (
          <span>Каталог</span>
        )}
      </nav>

      <h1 className="h1">{activeCategory?.title || 'Каталог'}</h1>

      <div className="filters">
        <Link href={catalogHref({ ...filters, category: '' })} aria-current={!filters.category}>
          Все
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={catalogHref({ ...filters, category: c.slug })}
            aria-current={filters.category === c.slug}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <div className="catalog">
        <CatalogFilters facets={facets} filters={filters} resetHref={resetHref} activeCount={chips.length} />

        <div className="catalog__main">
          <CatalogToolbar filters={filters} total={total} activeCount={chips.length} />

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((chip) => (
                <Link key={chip.label + chip.href} href={chip.href} className="chip">
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={resetHref} className="chip chip--reset">
                Сбросить всё
              </Link>
            </div>
          )}

          {products.length === 0 ? (
            <div className="empty">
              <p>
                {chips.length
                  ? 'По выбранным фильтрам ничего не нашлось.'
                  : 'В этой категории пока ничего нет.'}
              </p>
              <Link className="btn btn--ghost" href={chips.length ? resetHref : '/catalog'}>
                {chips.length ? 'Сбросить фильтры' : 'Смотреть все товары'}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid-products grid-products--catalog">
                {products.map((p, index) => (
                  <ProductCard key={p.id} product={p} priority={index < 3} />
                ))}
              </div>

              {pages > 1 && (
                <nav className="pager" aria-label="Страницы каталога">
                  {page > 1 && (
                    <Link href={pageLink(page - 1)} className="pager__step">
                      Назад
                    </Link>
                  )}

                  {Array.from({ length: pages }, (_, i) => i + 1)
                    // Показываем начало, конец и соседей текущей страницы,
                    // иначе при двадцати страницах номера расползутся на экран.
                    .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
                    .map((n, index, list) => (
                      <span key={n} style={{ display: 'contents' }}>
                        {index > 0 && list[index - 1] !== n - 1 && (
                          <span className="pager__gap">…</span>
                        )}
                        <Link href={pageLink(n)} className="pager__page" aria-current={n === page}>
                          {n}
                        </Link>
                      </span>
                    ))}

                  {page < pages && (
                    <Link href={pageLink(page + 1)} className="pager__step">
                      Вперёд
                    </Link>
                  )}
                </nav>
              )}

              <p className="small muted" style={{ textAlign: 'center', paddingBottom: 40 }}>
                Показано {(page - 1) * PER_PAGE + 1}–{(page - 1) * PER_PAGE + products.length} из {total}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
