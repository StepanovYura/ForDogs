// Всё для поисковиков в одном месте: адрес сайта, название бренда и
// общие для всех страниц метаданные.

export const SITE_NAME = 'NIXDOG STUDIO'

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

// Разметка schema.org для поисковиков — в <script type="application/ld+json">.
// «<» экранируем, чтобы текст из базы не мог закрыть тег script.
export function jsonLd(data) {
  return { __html: JSON.stringify(data).replace(/</g, '\u003c') }
}
