'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { DELIVERY_REGIONS, setFreeFromKopeks } from '@/lib/delivery'

const REGION_KEYS = DELIVERY_REGIONS.map((r) => r.key)

const rublesToKopeks = (value) => {
  const n = Number(String(value ?? '').replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0
}

function refresh() {
  revalidatePath('/admin/delivery')
  revalidatePath('/checkout')
}

export async function saveDeliveryMethodAction(formData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const region = String(formData.get('region'))
  await prisma.deliveryMethod.update({
    where: { id },
    data: {
      title: String(formData.get('title') || '').trim().slice(0, 60) || 'Доставка',
      description: String(formData.get('description') || '').trim().slice(0, 140),
      region: REGION_KEYS.includes(region) ? region : 'ru',
      priceKopeks: rublesToKopeks(formData.get('price')),
      isActive: formData.get('isActive') === 'on',
    },
  })
  refresh()
}

export async function addDeliveryMethodAction(formData) {
  await requireAdmin()
  const title = String(formData.get('title') || '').trim().slice(0, 60)
  const region = String(formData.get('region'))
  if (!title) return
  const last = await prisma.deliveryMethod.aggregate({ _max: { position: true } })
  await prisma.deliveryMethod.create({
    data: {
      title,
      region: REGION_KEYS.includes(region) ? region : 'ru',
      priceKopeks: rublesToKopeks(formData.get('price')),
      position: (last._max.position ?? 0) + 1,
    },
  })
  refresh()
}

export async function deleteDeliveryMethodAction(formData) {
  await requireAdmin()
  await prisma.deliveryMethod.delete({ where: { id: String(formData.get('id')) } }).catch(() => {})
  refresh()
}

export async function setDeliveryPositionAction(formData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const list = await prisma.deliveryMethod.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] })
  const current = list.find((m) => m.id === id)
  if (!current) return
  const target = Math.min(Math.max(Number(formData.get('position')) - 1 || 0, 0), list.length - 1)
  const reordered = list.filter((m) => m.id !== id)
  reordered.splice(target, 0, current)
  await prisma.$transaction(
    reordered.map((m, position) => prisma.deliveryMethod.update({ where: { id: m.id }, data: { position } }))
  )
  refresh()
}

// Способы из списка заказчика — одной кнопкой на пустой странице.
// Создаются выключенными: сначала вписать цены, потом включить.
const DEFAULT_METHODS = [
  { region: 'ru', title: 'СДЭК' },
  { region: 'ru', title: 'Почта России' },
  { region: 'ru', title: 'Яндекс Доставка' },
  { region: 'by', title: 'СДЭК' },
  { region: 'by', title: 'Почта России' },
  { region: 'msk', title: 'Яндекс' },
  { region: 'msk', title: 'Достависта' },
]

export async function createDefaultDeliveryAction() {
  await requireAdmin()
  if ((await prisma.deliveryMethod.count()) > 0) return
  await prisma.deliveryMethod.createMany({
    data: DEFAULT_METHODS.map((d, i) => ({ ...d, priceKopeks: 0, isActive: false, position: i })),
  })
  refresh()
}

export async function saveFreeFromAction(formData) {
  await requireAdmin()
  await setFreeFromKopeks(rublesToKopeks(formData.get('freeFrom')))
  refresh()
}
