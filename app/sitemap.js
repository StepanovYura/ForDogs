// sitemap.xml — список страниц для поисковиков: главная, каталог, разделы,
// все товары в продаже и информационные страницы. Обновляется раз в час.
import { prisma } from '@/lib/prisma'
import { siteOrigin } from '@/lib/seo'

export const revalidate = 3600

const PAGES = ['/about', '/delivery', '/size-guide', '/contacts', '/offer', '/privacy']

export default async function sitemap() {
  const site = siteOrigin()
  const [products, categories] = await Promise.all([
    prisma.product
      .findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } })
      .catch(() => []),
    prisma.category.findMany({ select: { slug: true } }).catch(() => []),
  ])

  return [
    { url: site, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/catalog`, changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({ url: `${site}/catalog?category=${c.slug}`, changeFrequency: 'weekly', priority: 0.8 })),
    ...products.map((p) => ({ url: `${site}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly', priority: 0.8 })),
    ...PAGES.map((path) => ({ url: `${site}${path}`, changeFrequency: 'monthly', priority: 0.4 })),
  ]
}
