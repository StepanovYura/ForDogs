import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Каталог — NIXDOG STUDIO',
  description: 'Одежда и аксессуары для собак: толстовки, свитшоты, куртки, банданы.',
}

export default async function CatalogPage({ searchParams }) {
  const activeSlug = searchParams?.category || null

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(activeSlug ? { category: { slug: activeSlug } } : {}),
      },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { select: { colorSlug: true, colorHex: true, colorName: true, stock: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

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
        <div className="grid-products" style={{ paddingBottom: 40 }}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
