import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import RegisterForm from './RegisterForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Регистрация — NIXDOG STUDIO' }

export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUser()
  const next = searchParams?.next || '/'
  if (user) redirect(next.startsWith('/') ? next : '/')

  return (
    <div className="page section">
      <h1 className="h1" style={{ textAlign: 'center' }}>
        Регистрация
      </h1>
      <RegisterForm next={next} />
    </div>
  )
}
