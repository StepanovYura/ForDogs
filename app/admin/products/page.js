import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCategories } from '@/lib/categories'
import NewProductForm from './NewProductForm'
import ProductRow from './ProductRow'

export const dynamic = 'force-dynamic'

// Товары в админке тоже листаем: при двух сотнях позиций грузить их все
// вместе с вариантами и фотографиями — это тысячи строк на один запрос.
const PER_PAGE = 20

export default async function AdminProductsPage({ searchParams }) {
  const query = (searchParams?.q || '').trim()
  const page = Math.max(1, Number(searchParams?.page) || 1)

  const where = query
    ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
        ],
      }
    : {}

  const [categories, total, products] = await Promise.all([
    getCategories(),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: [{ colorName: 'asc' }, { size: 'asc' }] },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const pageLink = (n) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (n > 1) params.set('page', String(n))
    const search = params.toString()
    return search ? `/admin/products?${search}` : '/admin/products'
  }

  const plain = (value) => JSON.parse(JSON.stringify(value))

  return (
    <>
      <NewProductForm categories={plain(categories)} />

      <form className="panel inline-form" method="get" action="/admin/products">
        <input
          name="q"
          className="input"
          style={{ width: 280 }}
          placeholder="Поиск по названию или адресу"
          defaultValue={query}
        />
        <button type="submit" className="btn btn--sm">
          Найти
        </button>
        {query && (
          <Link href="/admin/products" className="link-underline">
            Сбросить
          </Link>
        )}
        <span className="small muted">
          Найдено: {total}
          {pages > 1 ? `, страница ${page} из ${pages}` : ''}
        </span>
      </form>

      {products.length === 0 ? (
        <div className="empty">
          <p>Ничего не найдено.</p>
        </div>
      ) : (
        products.map((product) => (
          <ProductRow
            key={product.id}
            product={plain(product)}
            categories={plain(categories)}
          />
        ))
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Страницы списка товаров">
          {page > 1 && (
            <Link href={pageLink(page - 1)} className="pager__step">
              Назад
            </Link>
          )}
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2)
            .map((n, index, list) => (
              <span key={n} style={{ display: 'contents' }}>
                {index > 0 && list[index - 1] !== n - 1 && <span className="pager__gap">…</span>}
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
    </>
  )
}
