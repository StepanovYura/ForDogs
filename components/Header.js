'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/context/FavoritesContext'
import { logoutAction } from '@/app/login/actions'
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from './Icons'

// Шапка.
//   Компьютер: логотип — разделы словами — иконки поиска, избранного,
//   аккаунта и корзины.
//   Телефон и планшет: только иконки — каталог и поиск слева, логотип по
//   центру, избранное, аккаунт и корзина справа. На главной шапка
//   прозрачная и лежит поверх обложки.
export default function Header({ user, categories = [] }) {
  const { count } = useCart()
  const favorites = useFavorites()
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInput = useRef(null)

  const overHero = pathname === '/'
  const accountHref = user ? (user.role === 'ADMIN' ? '/admin' : '/account') : '/login'
  const accountLabel = user ? (user.role === 'ADMIN' ? 'Админка' : 'Личный кабинет') : 'Войти'

  // Переход на другую страницу закрывает меню и поиск.
  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  // Пока открыто меню, страница под ним не прокручивается.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submitSearch(event) {
    event.preventDefault()
    const q = new FormData(event.currentTarget).get('q')?.toString().trim()
    setSearchOpen(false)
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : '/catalog')
  }

  const badge = (value) => (value > 0 ? <span className="icon-badge">{value}</span> : null)

  return (
    <header className={overHero && !searchOpen ? 'header header--hero' : 'header'}>
      <div className="page header__inner">
        <div className="header__left">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Каталог и меню"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Поиск"
            aria-expanded={searchOpen}
          >
            <SearchIcon />
          </button>
        </div>

        <Link href="/" className="logo">
          <div className="logo__name">NIXDOG</div>
          <div className="logo__sub">STUDIO</div>
        </Link>

        <nav className="nav">
          <Link href="/catalog">Каталог</Link>
          <Link prefetch={false} href="/about">О бренде</Link>
          <Link prefetch={false} href="/delivery">Доставка</Link>
          <Link prefetch={false} href="/contacts">Контакты</Link>
        </nav>

        <div className="header__actions">
          <button
            type="button"
            className="icon-btn icon-btn--desktop"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Поиск"
            aria-expanded={searchOpen}
          >
            <SearchIcon />
          </button>
          <Link prefetch={false} href="/favorites" className="icon-btn" aria-label="Избранное" title="Избранное">
            <HeartIcon />
            {badge(favorites.ready ? favorites.count : 0)}
          </Link>
          <Link prefetch={false} href={accountHref} className="icon-btn" aria-label={accountLabel} title={accountLabel}>
            <UserIcon />
          </Link>
          <Link prefetch={false} href="/cart" className="icon-btn" aria-label="Корзина" title="Корзина">
            <BagIcon />
            {badge(count)}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <form className="page search-bar__form" onSubmit={submitSearch} role="search">
            <SearchIcon />
            <input
              ref={searchInput}
              name="q"
              type="search"
              className="search-bar__input"
              placeholder="Поиск по названию"
              autoComplete="off"
            />
            <button type="button" className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="Закрыть поиск">
              <CloseIcon />
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Меню">
          <div className="drawer__backdrop" onClick={() => setMenuOpen(false)} />
          <div className="drawer__panel">
            <div className="drawer__head">
              <span className="caption">Меню</span>
              <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="Закрыть меню">
                <CloseIcon />
              </button>
            </div>

            <div className="drawer__group">
              <div className="caption">Каталог</div>
              <Link href="/catalog">Все товары</Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/catalog?category=${c.slug}`}>
                  {c.title}
                </Link>
              ))}
            </div>

            <div className="drawer__group">
              <div className="caption">Покупателям</div>
              <Link prefetch={false} href="/size-guide">Как выбрать размер</Link>
              <Link prefetch={false} href="/delivery">Доставка и оплата</Link>
              <Link prefetch={false} href="/favorites">Избранное</Link>
              <Link prefetch={false} href={accountHref}>{accountLabel}</Link>
              {user && (
                <form action={logoutAction}>
                  <button type="submit" className="drawer__link-btn">
                    Выйти
                  </button>
                </form>
              )}
            </div>

            <div className="drawer__group">
              <div className="caption">О нас</div>
              <Link prefetch={false} href="/about">О бренде</Link>
              <Link prefetch={false} href="/contacts">Контакты</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
