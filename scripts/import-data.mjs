// Разовый перенос данных магазина в пустую базу на ONREZA — во время сборки.
//
// Зачем так: с компьютера разработчика соединение с базой ONREZA рвёт
// провайдер, а сборка идёт внутри ONREZA, рядом с базой. Данные (товары,
// категории, метки, таблица размеров, доставка, настройки, администратор)
// лежат зашифрованным файлом в бакете; ключ — только в переменных ONREZA.
//
// Запуск — временной командой сборки на ONREZA:
//   npx prisma db push && node scripts/import-data.mjs && npm run build
// с переменными MIGRATION_URL (адрес файла) и MIGRATION_KEY (ключ).
// Без них скрипт ничего не делает; в непустую базу ничего не пишет.
// После успешного деплоя команду сборки вернуть на `npm run build`,
// переменные MIGRATION_* удалить, файл из бакета удалить.
import { createDecipheriv } from 'crypto'
import { PrismaClient } from '@prisma/client'

const { MIGRATION_URL, MIGRATION_KEY } = process.env

async function main() {
  if (!MIGRATION_URL || !MIGRATION_KEY) {
    console.log('import-data: MIGRATION_URL / MIGRATION_KEY не заданы — пропускаю')
    return
  }

  const prisma = new PrismaClient()
  try {
    if ((await prisma.product.count()) > 0 || (await prisma.user.count()) > 0) {
      console.log('import-data: в базе уже есть данные — ничего не делаю')
      return
    }

    const response = await fetch(MIGRATION_URL)
    if (!response.ok) throw new Error(`файл данных не скачался: ${response.status}`)
    const blob = Buffer.from(await response.arrayBuffer())

    // Формат файла: 12 байт IV + 16 байт тега + шифротекст (AES-256-GCM).
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(MIGRATION_KEY, 'hex'), blob.subarray(0, 12))
    decipher.setAuthTag(blob.subarray(12, 28))
    const data = JSON.parse(Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]).toString('utf8'))

    const t = data.tables
    await prisma.$transaction(
      async (tx) => {
        await tx.user.createMany({ data: t.users })
        await tx.category.createMany({ data: t.categories })
        await tx.tag.createMany({ data: t.tags })
        await tx.product.createMany({ data: t.products })
        await tx.productImage.createMany({ data: t.productImages })
        await tx.productVariant.createMany({ data: t.productVariants })
        for (const link of t.productTags) {
          await tx.product.update({
            where: { id: link.productId },
            data: { tags: { connect: link.tagIds.map((id) => ({ id })) } },
          })
        }
        await tx.sizeGuideRow.createMany({ data: t.sizeGuideRows })
        await tx.deliveryMethod.createMany({ data: t.deliveryMethods })
        await tx.siteSetting.createMany({ data: t.siteSettings })
      },
      { timeout: 60_000 }
    )

    console.log(
      'import-data: перенесено —',
      Object.entries(t)
        .map(([name, rows]) => `${name}: ${rows.length}`)
        .join(', ')
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  // Ошибка переноса должна остановить сборку: сайт на пустой базе не нужен.
  console.error('import-data: ОШИБКА —', error.message)
  process.exit(1)
})
