// Выдаёт админу временную ссылку на прямую загрузку файла
// в Yandex Object Storage. Сам файл через Next.js не проходит,
// поэтому нет ограничения на размер тела запроса.
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { buildObjectKey, createUploadUrl, storageConfigured } from '@/lib/storage'

export const dynamic = 'force-dynamic'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function POST(request) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Нет доступа' }, { status: 403 })
  }
  if (!storageConfigured()) {
    return NextResponse.json(
      { error: 'Хранилище не настроено: задайте переменные S3_* (см. .env.example)' },
      { status: 400 }
    )
  }

  const { fileName, contentType } = await request.json().catch(() => ({}))
  if (!ALLOWED.includes(contentType)) {
    return NextResponse.json(
      { error: 'Допустимы только изображения JPEG, PNG, WebP или AVIF' },
      { status: 400 }
    )
  }

  const key = buildObjectKey(fileName || 'image.jpg')
  const result = await createUploadUrl({ key, contentType })
  return NextResponse.json(result)
}
