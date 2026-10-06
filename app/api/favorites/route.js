// Данные для страницы «Избранное»: id товаров приходят из localStorage
// браузера, а цены, фото и наличие берём из базы — чтобы не устаревали.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CARD_SELECT } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const ids = (request.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100)

  if (ids.length === 0) return NextResponse.json({ products: [] })

  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: CARD_SELECT,
  })

  // Порядок — как в избранном: последние отмеченные сверху.
  products.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
  return NextResponse.json({ products })
}
