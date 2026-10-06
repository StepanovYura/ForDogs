// После успешной загрузки в хранилище админка сообщает сюда,
// какой файл к какому товару относится.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }

  const { productId, url, key, thumbUrl, thumbKey, alt, colorSlug, width, height } =
    await request.json().catch(() => ({}))
  if (!productId || !url) {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 })
  }

  const count = await prisma.productImage.count({ where: { productId } })
  const image = await prisma.productImage.create({
    data: {
      productId,
      url,
      key: key || null,
      thumbUrl: thumbUrl || null,
      thumbKey: thumbKey || null,
      alt: alt || '',
      colorSlug: colorSlug || null,
      width: Number.isInteger(width) && width > 0 ? width : null,
      height: Number.isInteger(height) && height > 0 ? height : null,
      position: count,
    },
  })

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
  return NextResponse.json({ image })
}
