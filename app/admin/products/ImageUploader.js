'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Размеры, в которых храним фотографию.
// full  — для карточки товара, больше 1600 px на экране всё равно не видно;
// thumb — для сеток каталога, там картинка показывается мелко.
const FULL_SIDE = 1600
const THUMB_SIDE = 600
const QUALITY = 0.82

// Оригиналы с телефона и «зеркалки» весят по 5–15 МБ. Отдавать такое
// посетителю бессмысленно: страница грузится десятки секунд. Уменьшаем и
// пережимаем в WebP прямо в браузере — на сервер уходит уже лёгкий файл.
async function shrink(file, maxSide, quality) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality)
  )
  if (!blob) throw new Error('Не удалось обработать изображение')
  return blob
}

// Загрузка в два шага: просим у сервера подписанную ссылку, затем
// отправляем файл прямо в Yandex Object Storage, минуя наш сервер.
async function putToStorage(blob, fileName) {
  const signResponse = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, contentType: blob.type }),
  })
  const signed = await signResponse.json()
  if (!signResponse.ok) throw new Error(signed.error || 'Не удалось получить ссылку')

  // Никаких заголовков x-amz-*: в подписи участвует только host, и лишний
  // служебный заголовок хранилище сочтёт подделкой запроса (403).
  // Имена файлов уникальны, поэтому кэшировать их можно навсегда.
  const put = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': blob.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
    body: blob,
  })
  if (!put.ok) {
    const body = await put.text().catch(() => '')
    const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1]
    const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1]
    throw new Error(
      `Хранилище отклонило загрузку (${put.status}${code ? ', ' + code : ''})` +
        (message ? `: ${message}` : '')
    )
  }

  return signed
}

export default function ImageUploader({ productId, colors }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [colorSlug, setColorSlug] = useState('')
  const [alt, setAlt] = useState('')

  async function handleFiles(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setError('')

    try {
      for (const [index, file] of files.entries()) {
        const label = files.length > 1 ? ` (${index + 1} из ${files.length})` : ''

        setBusy(`Сжимаем${label}…`)
        const [full, thumb] = await Promise.all([
          shrink(file, FULL_SIDE, QUALITY),
          shrink(file, THUMB_SIDE, QUALITY),
        ])

        setBusy(`Загружаем${label}…`)
        const base = file.name.replace(/\.[^.]+$/, '')
        const [fullUpload, thumbUpload] = await Promise.all([
          putToStorage(full, `${base}.webp`),
          putToStorage(thumb, `${base}-thumb.webp`),
        ])

        const attach = await fetch('/api/admin/attach-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            url: fullUpload.url,
            key: fullUpload.key,
            thumbUrl: thumbUpload.url,
            thumbKey: thumbUpload.key,
            alt,
            colorSlug: colorSlug || null,
          }),
        })
        if (!attach.ok) {
          const data = await attach.json()
          throw new Error(data.error || 'Не удалось привязать фото к товару')
        }

        const saved = Math.round((1 - (full.size + thumb.size) / file.size) * 100)
        console.log(
          `${file.name}: ${Math.round(file.size / 1024)} КБ → ` +
            `${Math.round(full.size / 1024)} + ${Math.round(thumb.size / 1024)} КБ (−${saved}%)`
        )
      }

      event.target.value = ''
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}

      <div className="inline-form" style={{ marginBottom: 10 }}>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={colorSlug}
          onChange={(e) => setColorSlug(e.target.value)}
        >
          <option value="">Общее фото</option>
          {colors.map((c) => (
            <option key={c.slug} value={c.slug}>
              Цвет: {c.name}
            </option>
          ))}
        </select>
        <input
          className="input"
          style={{ width: 200 }}
          placeholder="Подпись (необязательно)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        disabled={Boolean(busy)}
        onChange={handleFiles}
      />
      {busy && <p className="small muted">{busy}</p>}
      <p className="small muted" style={{ marginBottom: 0 }}>
        Фотография уменьшается до {FULL_SIDE} px и пережимается в WebP прямо
        здесь, в браузере — в хранилище уходит лёгкий файл. Отдельно
        сохраняется миниатюра {THUMB_SIDE} px для каталога. Первое фото
        становится обложкой.
      </p>
    </div>
  )
}
