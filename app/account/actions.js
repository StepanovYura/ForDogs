'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function updateProfileAction(_prevState, formData) {
  const user = await requireUser('/account')

  const name = String(formData.get('name') || '').trim().slice(0, 120)
  const phone = String(formData.get('phone') || '').trim().slice(0, 20)

  await prisma.user.update({
    where: { id: user.id },
    data: { name: name || null, phone: phone || null },
  })

  revalidatePath('/account')
  return { ok: 'Сохранено' }
}
