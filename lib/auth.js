// Server-only помощники для авторизации: кто сейчас вошёл и есть ли права.
import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from './prisma'
import { sessionCookie, verifySessionToken } from './session'

// Возвращает пользователя из базы или null. Данные берём из базы, а не из
// токена: так смена роли или удаление аккаунта действуют сразу.
export async function getCurrentUser() {
  const token = cookies().get(sessionCookie.name)?.value
  const payload = await verifySessionToken(token)
  if (!payload) return null

  // Если база временно недоступна, лучше показать сайт гостю,
  // чем уронить весь layout ошибкой.
  const user = await prisma.user
    .findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true },
    })
    .catch(() => null)
  return user
}

export async function requireUser(returnTo = '/') {
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`)
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'ADMIN') redirect('/')
  return user
}
