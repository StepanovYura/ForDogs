// Наполняет базу демонстрационным каталогом.
// Запуск: npm run db:seed
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const COLORS = [
  { slug: 'burgundy', name: 'Бордовый', hex: '#7B1E2B' },
  { slug: 'beige', name: 'Бежевый', hex: '#D9CFC2' },
  { slug: 'grey', name: 'Серый', hex: '#8E8E8E' },
  { slug: 'black', name: 'Чёрный', hex: '#1C1C1C' },
]
const SIZES = ['XS', 'S', 'M', 'L', 'XL']

const CATEGORIES = [
  { slug: 'odezhda', title: 'Одежда для питомцев', position: 1 },
  { slug: 'verhnyaya-odezhda', title: 'Верхняя одежда', position: 2 },
  { slug: 'aksessuary', title: 'Аксессуары', position: 3 },
]

const PRODUCTS = [
  {
    slug: 'tolstovka-na-molnii',
    title: 'Толстовка на молнии',
    categorySlug: 'odezhda',
    priceKopeks: 390000,
    description:
      'Стильная и удобная толстовка для вашего питомца. Мягкий материал, комфортная посадка и минималистичный дизайн — для прогулок в любое время года.',
    composition:
      'Основной материал: 80% хлопок, 20% полиэстер (футер с начёсом). Манжеты и резинка — эластичный рибана-трикотаж.\nСтирка при 30 °C в деликатном режиме, без отбеливателя. Сушить в расправленном виде, не отжимать в барабане. Гладить при низкой температуре с изнанки.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней. По Москве — курьер день в день при заказе до 14:00.\nОбмен и возврат в течение 14 дней, если изделие не носили и сохранены бирки. Доставку возврата оплачивает покупатель, кроме случаев брака.',
    colors: ['burgundy', 'beige', 'grey', 'black'],
    position: 1,
  },
  {
    slug: 'svitshot-basic',
    title: 'Свитшот Basic',
    categorySlug: 'odezhda',
    priceKopeks: 320000,
    description:
      'Базовый свитшот без лишних деталей. Широкая горловина не давит на шею, спинка удлинённая — закрывает поясницу на прогулке.',
    composition:
      'Основной материал: 85% хлопок, 15% полиэстер. Манжеты — рибана.\nСтирка при 30 °C, сушить в расправленном виде.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней.\nОбмен и возврат в течение 14 дней при сохранении бирок.',
    colors: ['beige', 'grey', 'black'],
    position: 2,
  },
  {
    slug: 'kurtka-utepljonnaja',
    title: 'Куртка утеплённая',
    categorySlug: 'verhnyaya-odezhda',
    priceKopeks: 590000,
    description:
      'Тёплая куртка для холодной погоды. Водоотталкивающая ткань снаружи, мягкий флис внутри, отверстие под шлейку на спине.',
    composition:
      'Верх: 100% полиэстер с водоотталкивающей пропиткой. Подкладка: флис 100% полиэстер. Утеплитель: синтепон 150 г/м².\nСтирка при 30 °C без отжима, не гладить, не отбеливать.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней.\nОбмен и возврат в течение 14 дней при сохранении бирок.',
    colors: ['burgundy', 'black'],
    position: 3,
  },
  {
    slug: 'dozhdevik',
    title: 'Дождевик',
    categorySlug: 'verhnyaya-odezhda',
    priceKopeks: 280000,
    description:
      'Лёгкий дождевик на каждый день. Складывается в небольшой чехол, который помещается в карман.',
    composition:
      'Основной материал: 100% полиэстер с полиуретановым покрытием.\nПротирать влажной тканью, машинная стирка не рекомендуется.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней.\nОбмен и возврат в течение 14 дней при сохранении бирок.',
    colors: ['beige', 'grey'],
    position: 4,
  },
  {
    slug: 'bandana-trikotazh',
    title: 'Бандана трикотажная',
    categorySlug: 'aksessuary',
    priceKopeks: 90000,
    description:
      'Мягкая бандана из того же трикотажа, что и толстовки. Застёгивается на кнопку, не съезжает.',
    composition:
      'Основной материал: 80% хлопок, 20% полиэстер.\nСтирка при 30 °C.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней.\nОбмен и возврат в течение 14 дней при сохранении бирок.',
    colors: ['burgundy', 'beige', 'grey', 'black'],
    position: 5,
  },
  {
    slug: 'sharf-vyazanyj',
    title: 'Шарф вязаный',
    categorySlug: 'aksessuary',
    priceKopeks: 140000,
    description:
      'Вязаный шарф-снуд. Надевается через голову, не развязывается и не тянется по земле.',
    composition:
      'Основной материал: 50% шерсть, 50% акрил.\nРучная стирка при 30 °C, сушить в расправленном виде.',
    delivery:
      'Доставка по России — СДЭК и Почта России, 2–7 дней.\nОбмен и возврат в течение 14 дней при сохранении бирок.',
    colors: ['burgundy', 'grey'],
    position: 6,
  },
]

const SIZE_GUIDE = [
  { size: 'XS', backLength: '20–24', chest: '30–36', neck: '20–24', breedsHint: 'чихуахуа, той-терьер', position: 1 },
  { size: 'S', backLength: '25–29', chest: '37–43', neck: '25–29', breedsHint: 'йоркширский терьер, шпиц', position: 2 },
  { size: 'M', backLength: '30–35', chest: '44–52', neck: '30–34', breedsHint: 'мопс, french bulldog', position: 3 },
  { size: 'L', backLength: '36–42', chest: '53–62', neck: '35–40', breedsHint: 'корги, бигль', position: 4 },
  { size: 'XL', backLength: '43–50', chest: '63–74', neck: '41–46', breedsHint: 'кокер-спаниель, бордер-колли', position: 5 },
]

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: c, create: c })
  }

  for (const row of SIZE_GUIDE) {
    await prisma.sizeGuideRow.upsert({ where: { size: row.size }, update: row, create: row })
  }

  for (const p of PRODUCTS) {
    const category = await prisma.category.findUnique({ where: { slug: p.categorySlug } })

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        priceKopeks: p.priceKopeks,
        description: p.description,
        composition: p.composition,
        delivery: p.delivery,
        position: p.position,
        categoryId: category?.id ?? null,
      },
      create: {
        slug: p.slug,
        title: p.title,
        priceKopeks: p.priceKopeks,
        description: p.description,
        composition: p.composition,
        delivery: p.delivery,
        position: p.position,
        categoryId: category?.id ?? null,
      },
    })

    // Варианты: все размеры для каждого доступного цвета.
    for (const colorSlug of p.colors) {
      const color = COLORS.find((c) => c.slug === colorSlug)
      for (const size of SIZES) {
        await prisma.productVariant.upsert({
          where: { productId_colorSlug_size: { productId: product.id, colorSlug, size } },
          update: { colorName: color.name, colorHex: color.hex },
          create: {
            productId: product.id,
            colorSlug,
            colorName: color.name,
            colorHex: color.hex,
            size,
            stock: 10,
            sku: `${p.slug}-${colorSlug}-${size}`.toUpperCase(),
          },
        })
      }
    }
  }

  // Администратор по умолчанию — пароль обязательно поменяйте после входа.
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@nixdog.ru'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin12345'
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: 'Администратор',
      role: 'ADMIN',
    },
  })

  console.log('Каталог загружен. Админ:', adminEmail, '/ пароль:', adminPassword)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
