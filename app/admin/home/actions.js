'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { deleteObject } from '@/lib/storage'
import { COVER_KEYS, getSetting, setSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'

function settingKey(kind) {
  const key = COVER_KEYS[kind]
  if (!key) throw new Error('Неизвестный вид обложки')
  return key
}

// Файл уже лежит в хранилище — запоминаем его как обложку, а прежний удаляем.
export async function saveCoverAction(kind, { url, key }) {
  await requireAdmin()
  if (!url) return { error: 'Нет адреса файла' }

  const previous = await getSetting(settingKey(kind))
  await setSetting(settingKey(kind), { url, key: key || null })
  if (previous?.key && previous.key !== key) await deleteObject(previous.key)

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true }
}

export async function removeCoverAction(formData) {
  await requireAdmin()
  const kind = String(formData.get('kind'))
  const previous = await getSetting(settingKey(kind))

  await prisma.siteSetting.delete({ where: { key: settingKey(kind) } }).catch(() => {})
  if (previous?.key) await deleteObject(previous.key)

  revalidatePath('/')
  revalidatePath('/admin/home')
}
