// Проставляет ширину и высоту фото товаров, загруженных до того, как
// размеры стали записываться при загрузке. Запускается один раз:
//   npm run images:sizes
// Из хранилища читаются только первые 30 байт файла — заголовок WebP.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Размер из заголовка WebP: форматы VP8X, VP8 (с потерями) и VP8L (без потерь).
function webpSize(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') {
    return null
  }
  const chunk = b.toString('ascii', 12, 16)
  if (chunk === 'VP8X') {
    return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) }
  }
  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    }
  }
  return null
}

async function main() {
  const images = await prisma.productImage.findMany({
    where: { OR: [{ width: null }, { height: null }] },
    select: { id: true, url: true },
  })
  console.log(`Фото без размеров: ${images.length}`)

  let done = 0
  for (const image of images) {
    try {
      const response = await fetch(image.url, { headers: { Range: 'bytes=0-29' } })
      const size = webpSize(Buffer.from(await response.arrayBuffer()))
      if (!size) {
        console.warn('Не WebP или не прочитался заголовок:', image.url)
        continue
      }
      await prisma.productImage.update({ where: { id: image.id }, data: size })
      done++
    } catch (error) {
      console.warn('Не удалось прочитать', image.url, error.message)
    }
  }
  console.log(`Готово: ${done} из ${images.length}`)
}

main().finally(() => prisma.$disconnect())
