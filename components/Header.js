'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/context/CartContext'

export default function Header({ user, categories = [] }) {
  const { count } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <header className="header">
      <div className="page header__inner">
        <Link href="/" className="logo" onClick={() => setOpen(false)}>
          <div className="logo__name">NIXDOG</div>
          <div className="logo__sub">STUDIO</div>
        </Link>

        <nav className={open ? 'nav nav--open' : 'nav'} onClick={() => setOpen(false)}>
          <Link href="/catalog">Каталог</Link>
          {categories.slice(0, 2).map((c) => (
            <Link key={c.id} href={`/catalog?category=${c.slug}`}>
              {c.title}
            </Link>
          ))}
          <Link href="/about">О бренде</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/contacts">Контакты</Link>
        </nav>

        <div className="header__actions">
          {user ? (
            <Link href={user.role === 'ADMIN' ? '/admin' : '/account'}>
              {user.role === 'ADMIN' ? 'Админка' : 'Кабинет'}
            </Link>
          ) : (
            <Link href="/login">Вход</Link>
          )}
          <Link href="/cart" className="cart-link">
            Корзина
            {count > 0 && <span className="cart-count">{count}</span>}
          </Link>
          <button
            type="button"
            className="burger"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Меню"
          >
            {open ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>
    </header>
  )
}
