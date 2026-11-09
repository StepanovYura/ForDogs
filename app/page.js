import Link from 'next/link'
import { getHomeCover } from '@/lib/settings'
import { SITE_NAME, jsonLd, siteOrigin } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata = { alternates: { canonical: '/' } }

// Для поисковиков: кто мы и где искать.
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  name: SITE_NAME,
  url: siteOrigin(),
  logo: `${siteOrigin()}/apple-icon.png`,
  description: 'Минималистичная одежда для собак',
  sameAs: ['https://www.instagram.com/nixdogstudio'],
}

// Главная — одна обложка на весь экран.
//   Компьютер: шапка с разделами словами, под ней фото до низа экрана,
//   ниже — подвал.
//   Телефон и планшет: фото на весь экран, шапка с иконками лежит поверх.
// Фото загружается в админке (раздел «Главная»): горизонтальное для
// компьютера и вертикальное для телефона.
export default async function HomePage() {
  const cover = await getHomeCover().catch(() => ({}))
  const desktop = cover.desktop || cover.mobile
  const mobile = cover.mobile || cover.desktop

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ORGANIZATION)} />
    {/* Заголовок страницы для поисковиков и экранных чтецов — на обложке его не видно. */}
    <h1 className="visually-hidden">NIXDOG STUDIO — одежда для собак</h1>
    <Link href="/catalog" className="cover" aria-label="Перейти в каталог">
      {desktop ? (
        <picture>
          {mobile && <source media="(max-width: 1024px)" srcSet={mobile.url} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={desktop.url} alt="NIXDOG STUDIO — одежда для собак" fetchPriority="high" decoding="async" />
        </picture>
      ) : (
        <div className="cover__placeholder caption">Здесь будет фото обложки</div>
      )}
    </Link>
    </>
  )
}
