// Yandex Object Storage — S3-совместимое хранилище.
// Используем официальный AWS SDK v3, меняя только endpoint и регион.
import 'server-only'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const endpoint = process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net'
const region = process.env.S3_REGION || 'ru-central1'
const bucket = process.env.S3_BUCKET

export function storageConfigured() {
  return Boolean(bucket && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY)
}

function client() {
  if (!storageConfigured()) {
    throw new Error(
      'Хранилище не настроено: задайте S3_BUCKET, S3_ACCESS_KEY_ID и S3_SECRET_ACCESS_KEY. Смотрите .env.example.'
    )
  }
  return new S3Client({
    endpoint,
    region,
    forcePathStyle: false,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  })
}

// Публичный адрес файла. Если к бакету привязан CDN или свой домен —
// пропишите его в S3_PUBLIC_URL, иначе берётся прямой адрес бакета.
export function publicUrl(key) {
  const base = process.env.S3_PUBLIC_URL || `${endpoint}/${bucket}`
  return `${base.replace(/\/$/, '')}/${key}`
}

// Ссылка для прямой загрузки файла из браузера в хранилище:
// сам файл в Next.js не попадает, поэтому нет ограничений на размер тела запроса.
export async function createUploadUrl({ key, contentType }) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read',
  })
  const uploadUrl = await getSignedUrl(client(), command, { expiresIn: 600 })
  return { uploadUrl, key, url: publicUrl(key) }
}

export async function deleteObject(key) {
  if (!key || !storageConfigured()) return
  try {
    await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    // Удаление картинки не должно ронять удаление товара.
    console.error('Не удалось удалить объект из хранилища:', key, error)
  }
}

// Безопасное имя файла: только латиница, цифры, дефис и точка.
export function buildObjectKey(originalName, prefix = 'products') {
  const ext = (originalName.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}/${Date.now()}-${random}.${ext || 'jpg'}`
}
