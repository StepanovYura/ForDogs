import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCategories } from '@/lib/categories'
import { TAG_GROUPS } from '@/lib/tags'
import { formatPrice } from '@/lib/money'
import ProductEditor from '../ProductEditor'

export const dynamic = 'force-dynamic'

// Страница одного товара в админке: всё редактирование здесь,
// остальные товары не мешаются.
export default async function AdminProductPage({ params, searchParams }) {
  const [product, categories, tags] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: [{ colorName: 'asc' }, { size: 'asc' }] },
        tags: { select: { id: true } },
      },
    }),
    getCategories(),
    prisma.tag.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
  ])
  if (!product) notFound()

  const plain = (value) => JSON.parse(JSON.stringify(value))
  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0)

  return (
    <>
      <nav className="crumbs" style={{ paddingTop: 0 }}>
        <Link href="/admin/products">Товары</Link>
        <span>/</span>
        <span>{product.title}</span>
      </nav>

      <div className="admin-product-head">
        <div>
          <h2 className="h2" style={{ marginBottom: 6 }}>
            {product.title}
            {!product.isActive && (
              <span className="badge badge--canceled" style={{ marginLeft: 12, verticalAlign: 'middle' }}>
                Скрыт
              </span>
            )}
          </h2>
          <div className="small muted">
            {formatPrice(product.priceKopeks)} · вариантов: {product.variants.length} · на складе:{' '}
            {stock} шт. · фото: {product.images.length}
          </div>
        </div>
        <div className="inline-form">
          {product.isActive && (
            <Link href={`/product/${product.slug}`} className="btn btn--ghost btn--sm" target="_blank">
              Открыть на сайте
            </Link>
          )}
          <Link href="/admin/products" className="btn btn--ghost btn--sm">
            ← Ко всем товарам
          </Link>
        </div>
      </div>

      {searchParams?.created && (
        <div className="form-ok">Товар создан. Добавьте цвета, размеры и фотографии.</div>
      )}

      <div className="panel">
        <ProductEditor
          product={plain(product)}
          categories={plain(categories)}
          tagGroups={TAG_GROUPS.map((g) => ({ ...g, tags: plain(tags.filter((t) => t.group === g.key)) }))}
        />
      </div>
    </>
  )
}
