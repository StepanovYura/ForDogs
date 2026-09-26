'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage } from './compressor'

// Размеры, в которых храним фотографию.
// full  — для карточки товара, больше 1600 px на экране всё равно не видно;
// thumb — для сеток каталога и полоски превью, там картинка мелкая.
const TARGETS = { full: 1600, thumb: 600 }
const QUALITY = 0.82

// Сколько файлов обрабатываем одновременно. Три — компромисс: сеть
// загружена, но браузер не захлёбывается на десятке параллельных отправок.
const PARALLEL = 3
const RETRIES = 2

const STATUS_LABELS = {
  waiting: 'в очереди',
  compressing: 'сжимаем',
  uploading: 'загружаем',
  done: 'готово',
  error: 'ошибка',
}

function formatKb(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    : `${Math.round(bytes / 1024)} КБ`
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
  const [items, setItems] = useState([])
  const [running, setRunning] = useState(false)
  const [colorSlug, setColorSlug] = useState('')
  const [alt, setAlt] = useState('')

  // Настройки читаем в момент отправки файла, а не при постановке в очередь:
  // за время загрузки сотни снимков их менять не будут, а ссылка на
  // актуальное значение избавляет от устаревших замыканий.
  const settings = useRef({ colorSlug: '', alt: '' })
  settings.current = { colorSlug, alt }

  const update = useCallback((id, patch) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  }, [])

  const processOne = useCallback(
    async (item) => {
      let lastError = null

      for (let attempt = 0; attempt <= RETRIES; attempt++) {
        try {
          update(item.id, { status: 'compressing', error: null })
          const blobs = await compressImage(item.file, TARGETS, QUALITY)

          update(item.id, { status: 'uploading' })
          const base = item.file.name.replace(/\.[^.]+$/, '')
          const [full, thumb] = await Promise.all([
            putToStorage(blobs.full, `${base}.webp`),
            putToStorage(blobs.thumb, `${base}-thumb.webp`),
          ])

          const attach = await fetch('/api/admin/attach-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId,
              url: full.url,
              key: full.key,
              thumbUrl: thumb.url,
              thumbKey: thumb.key,
              alt: settings.current.alt,
              colorSlug: settings.current.colorSlug || null,
            }),
          })
          if (!attach.ok) {
            const data = await attach.json().catch(() => ({}))
            throw new Error(data.error || 'Не удалось привязать фото к товару')
          }

          update(item.id, {
            status: 'done',
            resultBytes: blobs.full.size + blobs.thumb.size,
          })
          return
        } catch (error) {
          lastError = error
          // Отказ хранилища по правам смысла повторять не имеет,
          // а обрыв сети — вполне.
          if (/40[13]/.test(error.message)) break
          if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
        }
      }

      update(item.id, { status: 'error', error: lastError?.message || 'Не удалось загрузить' })
    },
    [productId, update]
  )

  // Очередь с ограничением параллельности: берём следующий файл, как только
  // освободился один из трёх «слотов», а не ждём всю пачку.
  const runQueue = useCallback(
    async (queue) => {
      setRunning(true)
      let cursor = 0
      const workers = Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
        while (cursor < queue.length) {
          const item = queue[cursor++]
          await processOne(item)
        }
      })
      await Promise.all(workers)
      setRunning(false)
      router.refresh()
    },
    [processOne, router]
  )

  function handleFiles(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const queue = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file,
      name: file.name,
      sourceBytes: file.size,
      status: 'waiting',
      error: null,
      resultBytes: 0,
    }))

    setItems((prev) => [...prev, ...queue])
    event.target.value = ''
    runQueue(queue)
  }

  function retryFailed() {
    const failed = items.filter((i) => i.status === 'error')
    if (failed.length === 0) return
    setItems((prev) =>
      prev.map((i) => (i.status === 'error' ? { ...i, status: 'waiting', error: null } : i))
    )
    runQueue(failed)
  }

  function clearFinished() {
    setItems((prev) => prev.filter((i) => i.status !== 'done'))
  }

  const done = items.filter((i) => i.status === 'done').length
  const failed = items.filter((i) => i.status === 'error').length
  const saved = items
    .filter((i) => i.status === 'done')
    .reduce((sum, i) => sum + (i.sourceBytes - i.resultBytes), 0)

  return (
    <div>
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
        onChange={handleFiles}
      />

      <p className="small muted" style={{ marginBottom: 0 }}>
        Можно выбрать сразу несколько файлов. Каждый уменьшается до{' '}
        {TARGETS.full} px и пережимается в WebP прямо здесь, в браузере;
        отдельно сохраняется миниатюра {TARGETS.thumb} px для каталога.
        Цвет и подпись берутся из полей выше в момент отправки.
      </p>

      {items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <strong className="small">
              Готово {done} из {items.length}
            </strong>
            {failed > 0 && <span className="badge badge--canceled">ошибок: {failed}</span>}
            {saved > 0 && (
              <span className="small muted">сэкономлено {formatKb(saved)}</span>
            )}
            {failed > 0 && !running && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={retryFailed}>
                Повторить неудачные
              </button>
            )}
            {done > 0 && !running && (
              <button type="button" className="link-underline" onClick={clearFinished}>
                Убрать завершённые
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="table">
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{item.name}</td>
                    <td className="muted small">{formatKb(item.sourceBytes)}</td>
                    <td className="small">
                      {item.status === 'done' && item.resultBytes > 0 ? (
                        <span style={{ color: 'var(--ok)' }}>
                          → {formatKb(item.resultBytes)}
                        </span>
                      ) : (
                        <span className="muted">{STATUS_LABELS[item.status]}…</span>
                      )}
                    </td>
                    <td className="small" style={{ color: 'var(--danger)' }}>
                      {item.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
