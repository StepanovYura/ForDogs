import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import LoginForm from './LoginForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Вход — NIXDOG STUDIO' }

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser()
  const next = searchParams?.next || '/'
  if (user) redirect(next.startsWith('/') ? next : '/')

  return (
    <div className="page section">
      <h1 className="h1" style={{ textAlign: 'center' }}>
        Вход
      </h1>
      <p className="muted small" style={{ textAlign: 'center', marginBottom: 32 }}>
        Каталог и корзина доступны без входа. Аккаунт нужен, чтобы оформить
        заказ и видеть его историю.
      </p>
      <LoginForm next={next} />
    </div>
  )
}
