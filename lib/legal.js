// Реквизиты для юридических страниц. Пока заказчик не заполнил их в
// админке, на месте пустых полей видна пометка — чтобы страницу не
// отправили банку недоделанной.
import 'server-only'
import { getSiteInfo } from './settings'

const MISSING = '[не заполнено — «Админка → Реквизиты и соцсети»]'

export async function getRequisites() {
  const { requisites } = await getSiteInfo().catch(() => ({ requisites: {} }))
  const r = (key) => requisites[key] || MISSING
  return {
    seller: r('sellerName'),
    inn: r('inn'),
    ogrn: r('ogrn'),
    address: r('address'),
    email: r('email'),
    phone: r('phone'),
    workHours: requisites.workHours || '',
    raw: requisites,
  }
}

export function siteDomain() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').host
  } catch {
    return 'сайт магазина'
  }
}
