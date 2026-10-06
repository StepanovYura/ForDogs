'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { slugify, translit } from '@/lib/slug'

// Категории видны в шапке, подвале, каталоге и админке — сбрасываем кэш
// списка и все страницы разом.
function refresh() {
  revalidateTag('categories')
  revalidatePath('/', 'layout')
}

export async function createCategoryAction(formData) {
  await requireAdmin()
  const title = String(formData.get('title') || '').trim().slice(0, 60)
  if (title.length < 2) return

  let slug = slugify(translit(title)) || `category-${Date.now()}`
  if (await prisma.category.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`
  }
  const last = await prisma.category.aggregate({ _max: { position: true } })
  await prisma.category.create({
    data: { title, slug, position: (last._max.position ?? 0) + 1 },
  })
  refresh()
}

export async function renameCategoryAction(formData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const title = String(formData.get('title') || '').trim().slice(0, 60)
  if (title.length < 2) return
  // Адрес категории (slug) не меняем: на него могут вести ссылки
  // и закладки покупателей.
  await prisma.category.update({ where: { id }, data: { title } })
  refresh()
}

export async function moveCategoryAction(formData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const direction = String(formData.get('direction')) === 'up' ? -1 : 1

  const list = await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] })
  const index = list.findIndex((c) => c.id === id)
  const target = list[index + direction]
  if (index < 0 || !target) return

  const reordered = [...list]
  reordered[index] = target
  reordered[index + direction] = list[index]
  await prisma.$transaction(
    reordered.map((c, position) => prisma.category.update({ where: { id: c.id }, data: { position } }))
  )
  refresh()
}

// Товары удалённой категории не пропадают — остаются «без категории»
// и видны в каталоге в разделе «Все».
export async function deleteCategoryAction(formData) {
  await requireAdmin()
  await prisma.category.delete({ where: { id: String(formData.get('id')) } }).catch(() => {})
  refresh()
}
