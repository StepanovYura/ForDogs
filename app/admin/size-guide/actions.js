'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { sizeRank } from '@/lib/sizes'

const clean = (v, max = 20) => String(v ?? '').trim().slice(0, max)

function refresh() {
  revalidatePath('/size-guide')
  revalidatePath('/product/[slug]', 'page')
  revalidatePath('/admin/size-guide')
}

// Вся таблица сохраняется одной кнопкой: поля называются <мерка>_<id>.
export async function saveSizeGuideAction(formData) {
  await requireAdmin()
  const rows = await prisma.sizeGuideRow.findMany()
  await prisma.$transaction(
    rows.map((row) =>
      prisma.sizeGuideRow.update({
        where: { id: row.id },
        data: {
          backLength: clean(formData.get(`backLength_${row.id}`)),
          chest: clean(formData.get(`chest_${row.id}`)),
          neck: clean(formData.get(`neck_${row.id}`)),
        },
      })
    )
  )
  refresh()
}

export async function addSizeGuideRowAction(formData) {
  await requireAdmin()
  const size = clean(formData.get('size'), 12).toUpperCase()
  if (!size) return
  await prisma.sizeGuideRow.upsert({
    where: { size },
    update: {},
    create: { size, backLength: '', chest: '', neck: '', position: sizeRank(size) },
  })
  refresh()
}

export async function deleteSizeGuideRowAction(formData) {
  await requireAdmin()
  await prisma.sizeGuideRow.delete({ where: { id: String(formData.get('id')) } }).catch(() => {})
  refresh()
}
