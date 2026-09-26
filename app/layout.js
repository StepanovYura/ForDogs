import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CartProvider } from '@/context/CartContext'
import { getCurrentUser } from '@/lib/auth'
import { getCategories } from '@/lib/categories'

export const metadata = {
  title: 'NIXDOG STUDIO — одежда для собак',
  description:
    'Минималистичная одежда для собак: толстовки, свитшоты, куртки и аксессуары. Размеры XS–XL, доставка по России.',
}

// Шапке нужны свежие данные о входе, поэтому страницы не кэшируем статически.
export const dynamic = 'force-dynamic'

// Домен хранилища берём из той же переменной, что и сами адреса картинок,
// чтобы подсказка не разъехалась с реальностью при смене бакета или CDN.
function getStorageOrigin() {
  const base = process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT
  try {
    return new URL(base).origin
  } catch {
    return 'https://storage.yandexcloud.net'
  }
}

export default async function RootLayout({ children }) {
  const storageOrigin = getStorageOrigin()

  const [user, categories] = await Promise.all([getCurrentUser(), getCategories()])

  return (
    <html lang="ru">
      <head>
        {/* Картинки лежат на другом домене. Без этой подсказки браузер
            начинает знакомиться с ним только увидев первый <img>, и до
            первого байта уходит три обмена пакетами. */}
        <link rel="preconnect" href={storageOrigin} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={storageOrigin} />
      </head>
      <body>
        <CartProvider>
          <div className="layout">
            <Header user={user} categories={categories} />
            <main>{children}</main>
            <Footer categories={categories} />
          </div>
        </CartProvider>
      </body>
    </html>
  )
}
