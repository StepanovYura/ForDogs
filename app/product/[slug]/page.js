import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductView from './ProductView'

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
      />

      {/* Лукбук-блок из референса */}
      <section className="section">
        <div className="lookbook">
          <div className="lookbook__tile">
            {product.images[0] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={product.images[0].url} alt="" />
            ) : (
              <div className="card__placeholder">Лукбук</div>
            )}
          </div>
          <div className="lookbook__tile">
            {product.images[1] ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={product.images[1].url} alt="" />
            ) : (
              <div className="card__placeholder">Лукбук</div>
            )}
          </div>
          <div className="lookbook__text">
            <h2>
              Для больших
              <br />
              и маленьких
              <br />
              приключений
            </h2>
            <div className="caption">
              Комфорт
              <br />в каждой детали
            </div>
            <div className="caption">NIXDOG STUDIO</div>
          </div>
        </div>
      </section>
    </div>
  )
}
