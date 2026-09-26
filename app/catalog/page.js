import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCategories } from '@/lib/categories'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

// Сколько товаров на странице. При двух сотнях позиций отдавать весь каталог
// одним куском нельзя: это и мегабайты картинок, и тысячи строк вариантов
// из базы на каждый запрос.
const PER_PAGE = 24

export const metadata = {
  title: 'Каталог — NIXDOG STUDIO',
  description: 'Одежда и аксессуары для собак: толстовки, свитшоты, куртки, банданы.',
}

export default async function CatalogPage({ searchParams }) {
  const activeSlug = searchParams?.category || null
  const page = Math.max(1, Number(searchParams?.page) || 1)

  const where = {
    isActive: true,
    ...(activeSlug ? { category: { slug: activeSlug } } : {}),
  }

  const [categories, total, products] = await Promise.all([
    getCategories(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      // Берём только то, что рисуется на карточке: обложку и набор цветов
      // с остатком. Описания, состав и прочее здесь не нужны.
      select: {
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
          select: { colorSlug: true, colorHex: true, colorName: true, stock: true },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const pageLink = (n) => {
    const params = new URLSearchParams()
    if (activeSlug) params.set('category', activeSlug)
    if (n > 1) params.set('page', String(n))
    const query = params.toString()
    return query ? `/catalog?${query}` : '/catalog'
  }

  return (
    <div className="page section--tight">
      <nav className="crumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        <span>Каталог</span>
      </nav>

      <h1 className="h1">Каталог</h1>

      <div className="filters">
        <Link href="/catalog" aria-current={!activeSlug}>
          Все
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/catalog?category=${c.slug}`}
            aria-current={activeSlug === c.slug}
          >
            {c.title}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="empty">
          <p>В этой категории пока ничего нет.</p>
          <Link className="btn btn--ghost" href="/catalog">
            Смотреть все товары
          </Link>
        </div>
      ) : (
        <>
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
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
                    <Link
                      href={pageLink(n)}
                      className="pager__page"
                      aria-current={n === page}
                    >
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
            Показано {products.length} из {total}
          </p>
        </>
      )}
    </div>
  )
}
