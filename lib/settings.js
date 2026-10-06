// Настройки витрины, которые меняет администратор (обложка главной и т.п.).
import 'server-only'
import { prisma } from './prisma'

// Обложка главной: отдельные снимки для компьютера (горизонтальный) и для
// телефона/планшета (вертикальный) — одно фото на оба экрана обрезается плохо.
export const COVER_KEYS = {
  desktop: 'home.cover.desktop',
  mobile: 'home.cover.mobile',
}

// Значение хранится JSON-строкой: { url, key }.
export async function getSetting(key) {
  const row = await prisma.siteSetting.findUnique({ where: { key } }).catch(() => null)
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

export async function setSetting(key, value) {
  const json = JSON.stringify(value)
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  })
}

export async function getHomeCover() {
  const [desktop, mobile] = await Promise.all([
    getSetting(COVER_KEYS.desktop),
    getSetting(COVER_KEYS.mobile),
  ])
  return { desktop, mobile }
}
