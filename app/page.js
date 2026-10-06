import Link from 'next/link'
import { getHomeCover } from '@/lib/settings'

export const dynamic = 'force-dynamic'

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
  )
}
