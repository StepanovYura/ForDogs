import { prisma } from '@/lib/prisma'
import NewProductForm from './NewProductForm'
import ProductRow from './ProductRow'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: 'asc' } }),
    prisma.product.findMany({
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { orderBy: [{ colorName: 'asc' }, { size: 'asc' }] },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  return (
    <>
      <NewProductForm categories={JSON.parse(JSON.stringify(categories))} />

      {products.map((product) => (
        <ProductRow
          key={product.id}
          product={JSON.parse(JSON.stringify(product))}
          categories={JSON.parse(JSON.stringify(categories))}
        />
      ))}
    </>
  )
}
