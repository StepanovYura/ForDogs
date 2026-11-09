import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProductView from './ProductView'
import { dolyameEnabled } from '@/lib/payments'
import { compareSizes, priceRange } from '@/lib/sizes'
import { SITE_NAME, jsonLd, siteOrigin } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }) {
  const product = await prisma.product
    .findUnique({
      where: { slug: params.slug },
      select: {
        title: true,
        description: true,
        category: { select: { title: true } },
        images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
      },
    })
    .catch(() => null)
  if (!product) return { title: 'Товар не найден — NIXDOG STUDIO' }
  const description =
    product.description.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `${product.title} — одежда для собак NIXDOG STUDIO. Размеры XS–XL, доставка по России.`
  const image = product.images[0]?.url
  return {
    title: `${product.title} — NIXDOG STUDIO`,
    description,
    alternates: { canonical: `/product/${params.slug}` },
    openGraph: {
      type: 'website',
      title: product.title,
      description,
      url: `/product/${params.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
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
    prisma.sizeGuideRow
      .findMany()
      .then((rows) => rows.sort((a, b) => compareSizes(a.size, b.size))),
  ])

  if (!product) notFound()

  // Разметка для поисковиков: в выдаче рядом со ссылкой видны цена,
  // наличие и путь по разделам.
  const site = siteOrigin()
  const url = `${site}/product/${product.slug}`
  const { min, max } = priceRange(product)
  const inStock = product.variants.some((v) => v.stock > 0)
  const structured = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      description: product.description || undefined,
      image: product.images.slice(0, 6).map((i) => i.url),
      brand: { '@type': 'Brand', name: SITE_NAME },
      category: product.category?.title,
      url,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'RUB',
        lowPrice: (min / 100).toFixed(2),
        highPrice: (max / 100).toFixed(2),
        offerCount: product.variants.length || 1,
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: 'Главная', item: site },
        ...(product.category
          ? [{ name: product.category.title, item: `${site}/catalog?category=${product.category.slug}` }]
          : []),
        { name: product.title, item: url },
      ].map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, ...crumb })),
    },
  ]

  return (
    <div className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
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
