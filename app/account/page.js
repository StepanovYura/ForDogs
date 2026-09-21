import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import SignOutButton from '@/components/SignOutButton'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Личный кабинет — NIXDOG STUDIO' }

export default async function AccountPage() {
  const user = await requireUser('/account')

  return (
    <div className="page section--tight" style={{ paddingBottom: 56 }}>
      <h1 className="h1">Личный кабинет</h1>

      <div className="row-2" style={{ gap: 32, alignItems: 'start' }}>
        <div className="panel">
          <h2 className="h3">Профиль</h2>
          <p className="small muted">{user.email}</p>
          <ProfileForm user={JSON.parse(JSON.stringify(user))} />
        </div>

        <div className="panel">
          <h2 className="h3">Заказы</h2>
          <p className="small muted">
            История покупок, статусы и состав каждого заказа.
          </p>
          <Link href="/account/orders" className="btn btn--ghost btn--sm">
            Смотреть заказы
          </Link>
          {user.role === 'ADMIN' && (
            <p style={{ marginTop: 24, marginBottom: 0 }}>
              <Link href="/admin" className="link-underline">
                Перейти в админку
              </Link>
            </p>
          )}
          <div style={{ marginTop: 24 }}>
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
