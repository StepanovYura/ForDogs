import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import SignOutButton from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Админка — NIXDOG STUDIO' }

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()

  return (
    <div className="page section--tight" style={{ paddingBottom: 56 }}>
      <div className="admin-head">
        <h1 className="h1">Админка</h1>
        <div className="admin-head__user">
          <span className="small muted">{admin.email}</span>
          <SignOutButton />
        </div>
      </div>
      <nav className="admin-tabs">
        <Link href="/admin">Сводка</Link>
        <Link href="/admin/orders">Заказы</Link>
        <Link href="/admin/products">Товары</Link>
        <Link href="/admin/categories">Категории</Link>
        <Link href="/admin/tags">Фильтры</Link>
        <Link href="/admin/home">Главная</Link>
        <Link href="/">На сайт</Link>
      </nav>
      {children}
    </div>
  )
}
