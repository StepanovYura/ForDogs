import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductView from './ProductView'
import { dolyameEnabled } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const product = await prisma.product
    .findUnique({ where: { slug: params.slug }, select: { title: true, description: true } })
    .catch(() => null)
  if (!product) return { title: 'Товар не найден — NIXDOG STUDIO' }
  return {
    title: `${product.title} — NIXDOG STUDIO`,
    description: product.description.slice(0, 160),
  }
}

export default async function ProductPage({ params }) {
  const [product, sizeGuide] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: params.slug, isActive: true },
      include: {
        category: true,
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: [{ colorSlug: 'asc' }, { size: 'asc' }] },
      },
    }),
    prisma.sizeGuideRow.findMany({ orderBy: { position: 'asc' } }),
  ])

  if (!product) notFound()

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/catalog?category=${product.category.slug}`}>
              {product.category.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span>{product.title}</span>
      </nav>

      <ProductView
        product={JSON.parse(JSON.stringify(product))}
        sizeGuide={sizeGuide}
        dolyame={
          dolyameEnabled()
            ? { min: Number(process.env.DOLYAME_MIN_RUB) || 0, max: Number(process.env.DOLYAME_MAX_RUB) || 0 }
            : null
        }
      />
    </div>
  )
}
