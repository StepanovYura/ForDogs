// Своя авторизация: сессия — подписанный JWT в httpOnly-cookie.
// Работает и в Node-рантайме (серверные компоненты, route handlers),
// и в middleware на Edge, поэтому используется `jose`, а не `jsonwebtoken`.
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'nixdog_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 дней

function secret() {
  const value = process.env.AUTH_SECRET
  if (!value || value.length < 16) {
    throw new Error(
      'Не задана переменная окружения AUTH_SECRET (минимум 16 символов). Смотрите .env.example.'
    )
  }
  return new TextEncoder().encode(value)
}

export async function createSessionToken(user) {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
}

export async function verifySessionToken(token) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return { id: payload.sub, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  },
}
