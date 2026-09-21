// Отсекаем неавторизованных ещё до рендера страниц кабинета и админки.
// Сама проверка прав дублируется на страницах (lib/auth.js) — middleware
// здесь только для скорости и аккуратных редиректов.
import { NextResponse } from 'next/server'
import { sessionCookie, verifySessionToken } from '@/lib/session'

export async function middleware(request) {
  const { pathname, search } = request.nextUrl
  const token = request.cookies.get(sessionCookie.name)?.value
  const session = await verifySessionToken(token)

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*'],
}
