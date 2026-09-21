'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Загрузка в два шага:
//  1) просим у сервера подписанную ссылку;
//  2) отправляем файл прямо в Yandex Object Storage;
//  3) сообщаем серверу, что файл привязан к товару.
export default function ImageUploader({ productId, colors }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [colorSlug, setColorSlug] = useState('')
  const [alt, setAlt] = useState('')

  async function handleFiles(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setBusy(true)
    setError('')

    try {
      for (const file of files) {
        const signResponse = await fetch('/api/admin/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        })
        const signed = await signResponse.json()
        if (!signResponse.ok) throw new Error(signed.error || 'Не удалось получить ссылку')

        const put = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
          body: file,
        })
        if (!put.ok) throw new Error('Хранилище отклонило загрузку файла')

        const attach = await fetch('/api/admin/attach-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            url: signed.url,
            key: signed.key,
            alt,
            colorSlug: colorSlug || null,
          }),
        })
        if (!attach.ok) {
          const data = await attach.json()
          throw new Error(data.error || 'Не удалось привязать фото к товару')
        }
      }

      event.target.value = ''
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
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
        disabled={busy}
        onChange={handleFiles}
      />
      {busy && <p className="small muted">Загружаем…</p>}
      <p className="small muted" style={{ marginBottom: 0 }}>
        Файлы уходят напрямую в Yandex Object Storage. Первое фото становится
        обложкой в каталоге.
      </p>
    </div>
  )
}
