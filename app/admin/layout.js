import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Админка — NIXDOG STUDIO' }

export default async function AdminLayout({ children }) {
  await requireAdmin()

  return (
    <div className="page section--tight" style={{ paddingBottom: 56 }}>
      <h1 className="h1">Админка</h1>
      <nav className="admin-tabs">
        <Link href="/admin">Сводка</Link>
        <Link href="/admin/orders">Заказы</Link>
        <Link href="/admin/products">Товары</Link>
        <Link href="/">На сайт</Link>
      </nav>
      {children}
    </div>
  )
}
