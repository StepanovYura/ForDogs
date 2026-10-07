'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { REQUISITE_FIELDS, SOCIAL_FIELDS, saveSiteInfo } from '@/lib/settings'

// Ссылка на соцсеть: только https, иначе в подвал можно было бы подсунуть
// javascript:-ссылку.
function cleanUrl(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  try {
    const url = new URL(v.startsWith('http') ? v : `https://${v}`)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export async function saveSiteInfoAction(_prev, formData) {
  await requireAdmin()

  const requisites = {}
  for (const f of REQUISITE_FIELDS) {
    requisites[f.key] = String(formData.get(f.key) || '').trim().slice(0, 300)
  }
  const socials = {}
  for (const f of SOCIAL_FIELDS) {
    const raw = String(formData.get(f.key) || '').trim()
    socials[f.key] = cleanUrl(raw)
    if (raw && !socials[f.key]) return { error: `${f.label}: нужна ссылка вида https://…` }
  }

  await saveSiteInfo({ requisites, socials })
  revalidatePath('/', 'layout')
  return { ok: 'Сохранено' }
}
