'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { deleteObject } from '@/lib/storage'

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Транслитерация, чтобы адрес товара был латиницей.
const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function translit(value) {
  return String(value)
    .toLowerCase()
    .split('')
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join('')
}

function rublesToKopeks(value) {
  const number = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(number) || number < 0) return 0
  return Math.round(number * 100)
}

export async function createProductAction(_prevState, formData) {
  await requireAdmin()

  const title = String(formData.get('title') || '').trim()
  if (title.length < 2) return { error: 'Укажите название товара' }

  const priceKopeks = rublesToKopeks(formData.get('price'))
  if (priceKopeks <= 0) return { error: 'Укажите цену больше нуля' }

  let slug = slugify(translit(formData.get('slug') || title))
  if (!slug) slug = `product-${Date.now()}`
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`
  }

  await prisma.product.create({
    data: {
      slug,
      title,
      priceKopeks,
      description: String(formData.get('description') || '').trim(),
      composition: String(formData.get('composition') || '').trim(),
      delivery: String(formData.get('delivery') || '').trim(),
      categoryId: String(formData.get('categoryId') || '') || null,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { ok: `Товар «${title}» добавлен. Теперь добавьте цвета, размеры и фото.` }
}

export async function updateProductAction(formData) {
  await requireAdmin()

  const id = String(formData.get('id'))
  const priceKopeks = rublesToKopeks(formData.get('price'))

  await prisma.product.update({
    where: { id },
    data: {
      title: String(formData.get('title') || '').trim(),
      priceKopeks: priceKopeks > 0 ? priceKopeks : undefined,
      description: String(formData.get('description') || '').trim(),
      composition: String(formData.get('composition') || '').trim(),
      delivery: String(formData.get('delivery') || '').trim(),
      categoryId: String(formData.get('categoryId') || '') || null,
      isActive: formData.get('isActive') === 'on',
      position: Number(formData.get('position') || 0) || 0,
    },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}

export async function deleteProductAction(formData) {
  await requireAdmin()

  const id = String(formData.get('id'))
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } })
  if (!product) return

  // Сначала убираем файлы из хранилища, потом запись — иначе ключи потеряются.
  for (const image of product.images) {
    await deleteObject(image.key)
    await deleteObject(image.thumbKey)
  }
  await prisma.product.delete({ where: { id } })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}

export async function upsertVariantAction(formData) {
  await requireAdmin()

  const productId = String(formData.get('productId'))
  const colorSlug = slugify(translit(formData.get('colorSlug') || ''))
  const colorName = String(formData.get('colorName') || '').trim()
  const colorHex = String(formData.get('colorHex') || '#000000').trim()
  const size = String(formData.get('size') || '').trim().toUpperCase()
  const stock = Math.max(0, Number(formData.get('stock') || 0) || 0)

  if (!colorSlug || !colorName || !size) return

  await prisma.productVariant.upsert({
    where: { productId_colorSlug_size: { productId, colorSlug, size } },
    update: { colorName, colorHex, stock },
    create: { productId, colorSlug, colorName, colorHex, size, stock },
  })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}

export async function setVariantStockAction(formData) {
  await requireAdmin()

  const id = String(formData.get('variantId'))
  const stock = Math.max(0, Number(formData.get('stock') || 0) || 0)
  await prisma.productVariant.update({ where: { id }, data: { stock } })

  revalidatePath('/admin/products')
}

export async function deleteVariantAction(formData) {
  await requireAdmin()

  await prisma.productVariant.delete({ where: { id: String(formData.get('variantId')) } })
  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}

export async function deleteImageAction(formData) {
  await requireAdmin()

  const id = String(formData.get('imageId'))
  const image = await prisma.productImage.findUnique({ where: { id } })
  if (!image) return

  await deleteObject(image.key)
  await deleteObject(image.thumbKey)
  await prisma.productImage.delete({ where: { id } })

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
}
