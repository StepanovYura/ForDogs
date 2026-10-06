'use client'

// Загрузка в два шага: просим у сервера подписанную ссылку, затем
// отправляем файл прямо в Yandex Object Storage, минуя наш сервер.
export async function putToStorage(blob, fileName) {
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
