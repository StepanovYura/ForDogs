'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { compressImage } from '../products/compressor'
import { putToStorage } from '../upload'
import { saveCoverAction } from './actions'

// Обложка крупнее фото товара: на широком мониторе она во весь экран.
const TARGETS = { desktop: { full: 2560 }, mobile: { full: 1600 } }

export default function CoverUploader({ kind }) {
  const router = useRouter()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      setStatus('Сжимаем…')
      const blobs = await compressImage(file, TARGETS[kind], 0.85)
      setStatus('Загружаем…')
      const uploaded = await putToStorage(blobs.full, `cover-${kind}.webp`)
      const result = await saveCoverAction(kind, { url: uploaded.url, key: uploaded.key })
      if (result?.error) throw new Error(result.error)
      setStatus('')
      router.refresh()
    } catch (e) {
      setStatus('')
      setError(e.message || 'Не удалось загрузить фото')
    }
  }

  return (
    <div>
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile} disabled={Boolean(status)} />
      {status && <p className="small muted">{status}</p>}
      {error && <div className="form-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  )
}
