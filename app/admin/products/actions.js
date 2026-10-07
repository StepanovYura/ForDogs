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

// ─────────────────── Цвета, размеры, цены, остатки ───────────────────
// Варианты товара — все сочетания «цвет × размер». Админка управляет ими
// целиком: добавить размер — он появляется во всех цветах, убрать цвет —
// пропадают все его размеры.

function refreshProduct() {
  revalidatePath('/admin/products', 'layout')
  revalidatePath('/catalog')
  revalidatePath('/product/[slug]', 'page')
}

function cleanSize(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ').slice(0, 12)
}

async function productColorsAndSizes(productId) {
  const variants = await prisma.productVariant.findMany({ where: { productId } })
  const colors = []
  for (const v of variants) {
    if (!colors.some((c) => c.slug === v.colorSlug)) {
      colors.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
    }
  }
  const sizes = [...new Set(variants.map((v) => v.size))]
  // Цена размера — общая для всех цветов, берём с любого его варианта.
  const sizePrice = Object.fromEntries(variants.map((v) => [v.size, v.priceKopeks]))
  return { variants, colors, sizes, sizePrice }
}

// Первый вариант товара: цвет и размер сразу.
export async function createFirstVariantAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const colorName = String(formData.get('colorName') || '').trim().slice(0, 40)
  const colorHex = String(formData.get('colorHex') || '#000000').trim()
  const size = cleanSize(formData.get('size'))
  const colorSlug = slugify(translit(colorName))
  if (!colorName || !colorSlug || !size) return

  await prisma.productVariant.upsert({
    where: { productId_colorSlug_size: { productId, colorSlug, size } },
    update: {},
    create: { productId, colorSlug, colorName, colorHex, size, stock: 0 },
  })
  refreshProduct()
}

export async function addSizeAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const size = cleanSize(formData.get('size'))
  if (!size) return

  const { colors } = await productColorsAndSizes(productId)
  await prisma.$transaction(
    colors.map((c) =>
      prisma.productVariant.upsert({
        where: { productId_colorSlug_size: { productId, colorSlug: c.slug, size } },
        update: {},
        create: { productId, colorSlug: c.slug, colorName: c.name, colorHex: c.hex, size, stock: 0 },
      })
    )
  )
  refreshProduct()
}

// Убрать размер — во всех цветах. Уже оформленные заказы не страдают:
// в них сохранён снимок товара, а ссылка на вариант просто обнулится.
export async function removeSizeAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const size = String(formData.get('size'))
  await prisma.productVariant.deleteMany({ where: { productId, size } })
  refreshProduct()
}

// Цена размера: пустое поле — как у товара.
export async function setSizePriceAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const size = String(formData.get('size'))
  const raw = String(formData.get('price') || '').trim()
  const priceKopeks = raw ? rublesToKopeks(raw) : null
  if (priceKopeks === 0) return

  await prisma.productVariant.updateMany({ where: { productId, size }, data: { priceKopeks } })
  refreshProduct()
}

export async function addColorAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const colorName = String(formData.get('colorName') || '').trim().slice(0, 40)
  const colorHex = String(formData.get('colorHex') || '#000000').trim()
  const colorSlug = slugify(translit(colorName))
  if (!colorName || !colorSlug) return

  const { sizes, sizePrice } = await productColorsAndSizes(productId)
  await prisma.$transaction(
    sizes.map((size) =>
      prisma.productVariant.upsert({
        where: { productId_colorSlug_size: { productId, colorSlug, size } },
        update: { colorName, colorHex },
        create: {
          productId,
          colorSlug,
          colorName,
          colorHex,
          size,
          stock: 0,
          priceKopeks: sizePrice[size] ?? null,
        },
      })
    )
  )
  refreshProduct()
}

export async function updateColorAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const colorSlug = String(formData.get('colorSlug'))
  const colorName = String(formData.get('colorName') || '').trim().slice(0, 40)
  const colorHex = String(formData.get('colorHex') || '#000000').trim()
  if (!colorName) return
  // Адрес цвета (colorSlug) не меняем: к нему привязаны фотографии.
  await prisma.productVariant.updateMany({
    where: { productId, colorSlug },
    data: { colorName, colorHex },
  })
  refreshProduct()
}

// Убрать цвет со всеми его размерами. Фото этого цвета не удаляем, а
// переводим в «Фото без цвета» — там их можно перенести или удалить.
export async function removeColorAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const colorSlug = String(formData.get('colorSlug'))
  await prisma.$transaction([
    prisma.productVariant.deleteMany({ where: { productId, colorSlug } }),
    prisma.productImage.updateMany({ where: { productId, colorSlug }, data: { colorSlug: null } }),
  ])
  refreshProduct()
}

// Таблица остатков сохраняется целиком: поля называются stock_<id варианта>.
export async function saveStockAction(formData) {
  await requireAdmin()
  const productId = String(formData.get('productId'))
  const updates = []
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('stock_')) continue
    const stock = Math.max(0, Math.floor(Number(value) || 0))
    updates.push(
      prisma.productVariant.updateMany({ where: { id: key.slice(6), productId }, data: { stock } })
    )
  }
  await prisma.$transaction(updates)
  refreshProduct()
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
// обложкой в каталоге. Админ выбирает номер места внутри ленты цвета,
// остальные фото этого цвета сдвигаются.
export async function setImagePositionAction(formData) {
  await requireAdmin()

  const id = String(formData.get('imageId'))
  const image = await prisma.productImage.findUnique({ where: { id } })
  if (!image) return

  const siblings = await prisma.productImage.findMany({
    where: { productId: image.productId, colorSlug: image.colorSlug },
    orderBy: { position: 'asc' },
  })
  const target = Math.min(Math.max(Number(formData.get('position')) - 1 || 0, 0), siblings.length - 1)
  const reordered = siblings.filter((i) => i.id !== id)
  reordered.splice(target, 0, image)

  // Позиции у разных цветов не пересекаются: ставим ленту этого цвета на
  // те же номера, что она занимала, только в новом порядке.
  const slots = siblings.map((i) => i.position).sort((x, y) => x - y)
  const unique = new Set(slots).size === slots.length
  await prisma.$transaction(
    reordered.map((item, index) =>
      prisma.productImage.update({
        where: { id: item.id },
        data: { position: unique ? slots[index] : index },
      })
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
