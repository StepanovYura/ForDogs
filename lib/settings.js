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

// ───────────── Реквизиты продавца и соцсети ─────────────
// Заполняются в админке («Реквизиты и соцсети») и подставляются в подвал,
// контакты, оферту и политику конфиденциальности. Банк при подключении
// эквайринга проверяет, что всё это есть на сайте.
export const SITE_INFO_KEY = 'site.info'

export const REQUISITE_FIELDS = [
  { key: 'sellerName', label: 'Продавец', placeholder: 'ИП Иванов Иван Иванович' },
  { key: 'inn', label: 'ИНН', placeholder: '770000000000' },
  { key: 'ogrn', label: 'ОГРН / ОГРНИП', placeholder: '320770000000000' },
  { key: 'address', label: 'Юридический адрес', placeholder: 'г. Москва, ул. Примерная, д. 1' },
  { key: 'email', label: 'Почта для покупателей', placeholder: 'hello@nixdog.ru' },
  { key: 'phone', label: 'Телефон', placeholder: '+7 900 000-00-00' },
  { key: 'workHours', label: 'Часы работы', placeholder: 'Пн–пт, 10:00–19:00 по Москве' },
]

export const SOCIAL_FIELDS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/nixdog.studio' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/nixdogstudio' },
  { key: 'vk', label: 'ВКонтакте', placeholder: 'https://vk.com/nixdogstudio' },
]

export async function getSiteInfo() {
  const value = (await getSetting(SITE_INFO_KEY)) || {}
  return {
    requisites: value.requisites || {},
    socials: value.socials || {},
  }
}

export async function saveSiteInfo(info) {
  await setSetting(SITE_INFO_KEY, info)
}
