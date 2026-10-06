// Сколько товаров покажет каталог с такими фильтрами — для кнопки
// «Показать N товаров» в панели фильтров, пока фильтры ещё не применены.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildWhere, parseFilters } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const params = request.nextUrl.searchParams
  // parseFilters ждёт объект как у searchParams страницы: повторяющиеся
  // ключи (color=a&color=b) — массивом.
  const query = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    query[key] = values.length > 1 ? values : values[0]
  }
  const count = await prisma.product.count({ where: buildWhere(parseFilters(query)) })
  return NextResponse.json({ count })
}
