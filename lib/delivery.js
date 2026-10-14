// Доставка: способы с ценами из «Админка → Доставка» и порог бесплатной
// доставки. Цена доставки считается на сервере и прибавляется к заказу —
// из браузера берётся только выбранный способ, не цена.
//
// Сейчас цены фиксированные для каждого способа. Когда появится договор
// с перевозчиком (СДЭК, Яндекс Доставка), здесь же можно будет считать
// стоимость по городу через их API.
import 'server-only'
import { prisma } from './prisma'
import { getSetting, setSetting } from './settings'

export const DELIVERY_REGIONS = [
  { key: 'ru', title: 'По России' },
  { key: 'by', title: 'В Беларусь' },
  { key: 'msk', title: 'Экспресс по Москве' },
]

const FREE_FROM_KEY = 'delivery.freeFrom'

// Порог бесплатной доставки в копейках; 0 — порога нет.
export async function getFreeFromKopeks() {
  const value = await getSetting(FREE_FROM_KEY).catch(() => null)
  return Number(value?.kopeks) || 0
}

export async function setFreeFromKopeks(kopeks) {
  await setSetting(FREE_FROM_KEY, { kopeks: Math.max(0, Math.round(kopeks) || 0) })
}

export async function getDeliveryOptions() {
  const [methods, freeFromKopeks] = await Promise.all([
    prisma.deliveryMethod
      .findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { title: 'asc' }] })
      .catch(() => []),
    getFreeFromKopeks(),
  ])
  return {
    methods: methods.map((m) => ({
      id: m.id,
      title: m.title,
      region: m.region,
      description: m.description,
      priceKopeks: m.priceKopeks,
    })),
    freeFromKopeks,
  }
}

// Цена выбранного способа для заказа на такую сумму.
export function deliveryPrice(method, subtotalKopeks, freeFromKopeks) {
  if (!method) return 0
  if (freeFromKopeks > 0 && subtotalKopeks >= freeFromKopeks) return 0
  return method.priceKopeks
}
