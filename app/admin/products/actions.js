'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { deleteObject } from '@/lib/storage'
import { slugify, translit } from '@/lib/slug'

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

  const product = await prisma.product.create({
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

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
  // Сразу на страницу нового товара: дальше там добавляют цвета, размеры и фото.
  redirect(`/admin/products/${product.id}?created=1`)
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
      ...(formData.get('tagsEditable')
        ? { tags: { set: formData.getAll('tagIds').map((tagId) => ({ id: String(tagId) })) } }
        : {}),
    },
  })

  revalidatePath('/admin/products', 'layout')
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

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
  redirect('/admin/products')
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

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
}

export async function setVariantStockAction(formData) {
  await requireAdmin()

  const id = String(formData.get('variantId'))
  const stock = Math.max(0, Number(formData.get('stock') || 0) || 0)
  await prisma.productVariant.update({ where: { id }, data: { stock } })

  revalidatePath('/admin/products', 'layout')
}

export async function deleteVariantAction(formData) {
  await requireAdmin()

  await prisma.productVariant.delete({ where: { id: String(formData.get('variantId')) } })
  revalidatePath('/admin/products', 'layout')
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

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
}

// Порядок фотографий = порядок показа в галерее, а первая становится
// обложкой в каталоге. Меняем местами позиции с соседом.
export async function moveImageAction(formData) {
  await requireAdmin()

  const id = String(formData.get('imageId'))
  const direction = String(formData.get('direction')) === 'up' ? -1 : 1

  const image = await prisma.productImage.findUnique({ where: { id } })
  if (!image) return

  // Соседи — фото того же цвета: в админке и на сайте они идут своей лентой.
  const siblings = await prisma.productImage.findMany({
    where: { productId: image.productId, colorSlug: image.colorSlug },
    orderBy: { position: 'asc' },
  })

  const index = siblings.findIndex((i) => i.id === id)
  const target = siblings[index + direction]
  if (!target) return

  // Позиции могли разъехаться (дубли, пропуски), поэтому не меняем два
  // значения местами, а перенумеровываем весь список после перестановки.
  const reordered = [...siblings]
  reordered[index] = target
  reordered[index + direction] = image

  await prisma.$transaction(
    reordered.map((item, position) =>
      prisma.productImage.update({ where: { id: item.id }, data: { position } })
    )
  )

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
}

// Фото без цвета (из прежней версии админки) — переносим к цвету.
// В конец ленты этого цвета, чтобы не сбить уже выбранное главное фото.
export async function setImageColorAction(formData) {
  await requireAdmin()

  const id = String(formData.get('imageId'))
  const colorSlug = String(formData.get('colorSlug') || '')
  if (!colorSlug) return

  const image = await prisma.productImage.findUnique({ where: { id } })
  if (!image) return
  const last = await prisma.productImage.aggregate({
    where: { productId: image.productId },
    _max: { position: true },
  })

  await prisma.productImage.update({
    where: { id },
    data: { colorSlug, position: (last._max.position ?? 0) + 1 },
  })

  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
}
