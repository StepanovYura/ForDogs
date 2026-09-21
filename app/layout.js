import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CartProvider } from '@/context/CartContext'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'NIXDOG STUDIO — одежда для собак',
  description:
    'Минималистичная одежда для собак: толстовки, свитшоты, куртки и аксессуары. Размеры XS–XL, доставка по России.',
}

// Шапке нужны свежие данные о входе, поэтому страницы не кэшируем статически.
export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }) {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    prisma.category.findMany({ orderBy: { position: 'asc' } }).catch(() => []),
  ])

  return (
    <html lang="ru">
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
