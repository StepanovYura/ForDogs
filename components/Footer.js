import Link from 'next/link'

export default function Footer({ categories = [] }) {
  return (
    <footer className="footer">
      <div className="page">
        <div className="footer__grid">
          <div>
            <div className="logo__name">NIXDOG</div>
            <div className="logo__sub" style={{ marginBottom: 14 }}>
              STUDIO
            </div>
            <p className="small muted" style={{ maxWidth: 260, margin: 0 }}>
              Минималистичная одежда для собак. Шьём небольшими партиями,
              проверяем посадку на живых собаках, а не на манекенах.
            </p>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              Каталог
            </div>
            <ul className="footer__list">
              <li>
                <Link href="/catalog">Все товары</Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/catalog?category=${c.slug}`}>{c.title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              Покупателям
            </div>
            <ul className="footer__list">
              <li>
                <Link href="/size-guide">Как выбрать размер</Link>
              </li>
              <li>
                <Link href="/delivery">Доставка и оплата</Link>
              </li>
              <li>
                <Link href="/account/orders">Мои заказы</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              О нас
            </div>
            <ul className="footer__list">
              <li>
                <Link href="/about">О бренде</Link>
              </li>
              <li>
                <Link href="/contacts">Контакты</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} NIXDOG STUDIO</span>
          <span>Оплата картой через ЮKassa</span>
        </div>
      </div>
    </footer>
  )
}
