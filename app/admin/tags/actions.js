'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { slugify, translit } from '@/lib/slug'
import { TAG_GROUP_KEYS } from '@/lib/tags'

function refresh() {
  revalidatePath('/admin/tags')
  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
}

export async function createTagAction(formData) {
  await requireAdmin()
  const group = String(formData.get('group'))
  const title = String(formData.get('title') || '').trim().slice(0, 60)
  if (!TAG_GROUP_KEYS.includes(group) || title.length < 2) return

  const slug = slugify(translit(title)) || `tag-${Date.now()}`
  const position = await prisma.tag.count({ where: { group } })
  await prisma.tag.upsert({
    where: { group_slug: { group, slug } },
    update: { title },
    create: { group, slug, title, position: position + 1 },
  })
  refresh()
}

export async function renameTagAction(formData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const title = String(formData.get('title') || '').trim().slice(0, 60)
  if (title.length < 2) return
  // Адрес метки (slug) не меняем: на него могут вести сохранённые ссылки.
  await prisma.tag.update({ where: { id }, data: { title } })
  refresh()
}

export async function deleteTagAction(formData) {
  await requireAdmin()
  await prisma.tag.delete({ where: { id: String(formData.get('id')) } }).catch(() => {})
  refresh()
}
