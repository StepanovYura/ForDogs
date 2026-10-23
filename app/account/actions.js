'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { requireUser } from '@/lib/auth'
import { passwordSchema } from '@/lib/validation'

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

// Смена пароля — для любого аккаунта, в том числе администратора.
// Нужен текущий пароль: чужой человек за открытым ноутбуком не сменит.
export async function changePasswordAction(_prevState, formData) {
  const user = await requireUser('/account')

  const current = String(formData.get('currentPassword') || '')
  const next = String(formData.get('newPassword') || '')
  const repeat = String(formData.get('repeatPassword') || '')

  const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!record || !(await bcrypt.compare(current, record.passwordHash))) {
    return { error: 'Текущий пароль указан неверно' }
  }
  const parsed = passwordSchema.safeParse(next)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (next !== repeat) return { error: 'Новые пароли не совпадают' }
  if (next === current) return { error: 'Новый пароль совпадает с текущим' }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  })
  return { ok: 'Пароль изменён' }
}
