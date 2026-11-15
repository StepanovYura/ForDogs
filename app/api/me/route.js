// Корзина и избранное вошедшего покупателя: браузер читает их при входе и
// при возвращении на вкладку, а после каждого изменения присылает целиком.
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserCart, getUserFavorites, setUserCart, setUserFavorites } from '@/lib/userStore'

export const dynamic = 'force-dynamic'

async function snapshot(userId) {
  const [cart, favorites] = await Promise.all([getUserCart(userId), getUserFavorites(userId)])
  return { cart, favorites }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужно войти' }, { status: 401 })
  return NextResponse.json(await snapshot(user.id))
}

export async function PUT(request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Нужно войти' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (body.cart !== undefined) await setUserCart(user.id, body.cart)
  if (body.favorites !== undefined) await setUserFavorites(user.id, body.favorites)
  return NextResponse.json(await snapshot(user.id))
}
