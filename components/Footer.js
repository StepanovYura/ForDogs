import Link from 'next/link'
import SocialLinks from './SocialLinks'

// Способы оплаты в подвале. Банк просит показывать логотипы платёжных
// систем: когда Т-Банк пришлёт официальный набор логотипов, текстовые
// значки можно заменить картинками.
const PAYMENT_BADGES = ['МИР', 'СБП']

export default function Footer({ categories = [], siteInfo = { requisites: {}, socials: {} }, dolyame = false }) {
  const badges = dolyame ? [...PAYMENT_BADGES, 'Долями'] : PAYMENT_BADGES
  const r = siteInfo.requisites
  const requisitesLine = [r.sellerName, r.inn && `ИНН ${r.inn}`, r.ogrn && `ОГРН ${r.ogrn}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <footer className="footer">
      <div className="page">
        <div className="footer__grid">
          <div>
            <div className="logo__name">NIXDOG</div>
            <div className="logo__sub" style={{ marginBottom: 14 }}>
              STUDIO
            </div>
            <p className="footer__tagline">Everyday wear for every pet.</p>
            <p className="small muted footer__about" style={{ maxWidth: 280, margin: 0 }}>
              Минимализм, комфорт и продуманный крой. Одежда, созданная с любовью к
              деталям и уважением к индивидуальности каждого питомца.
            </p>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              Каталог
            </div>
            <ul className="footer__list">
              <li>
                <Link prefetch={false} href="/catalog">Все товары</Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link prefetch={false} href={`/catalog?category=${c.slug}`}>{c.title}</Link>
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
                <Link prefetch={false} href="/size-guide">Как выбрать размер</Link>
              </li>
              <li>
                <Link prefetch={false} href="/delivery">Доставка и оплата</Link>
              </li>
              <li>
                <Link prefetch={false} href="/account/orders">Мои заказы</Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="caption" style={{ marginBottom: 14 }}>
              О нас
            </div>
            <ul className="footer__list">
              <li>
                <Link prefetch={false} href="/about">О бренде</Link>
              </li>
              <li>
                <Link prefetch={false} href="/contacts">Контакты</Link>
              </li>
              <li>
                <Link prefetch={false} href="/offer">Публичная оферта</Link>
              </li>
              <li>
                <Link prefetch={false} href="/privacy">Политика конфиденциальности</Link>
              </li>
            </ul>
            {/* Соцсети — внизу колонки «О нас». */}
            <SocialLinks socials={siteInfo.socials} />
          </div>
        </div>

        <div className="footer__bottom">
          <span>
            © {new Date().getFullYear()} NIXDOG STUDIO
            {requisitesLine && <span className="footer__requisites">{requisitesLine}</span>}
          </span>
          <span className="pay-badges" aria-label="Способы оплаты">
            {badges.map((b) => (
              <span key={b} className="pay-badge">
                {b}
              </span>
            ))}
          </span>
        </div>
        {siteInfo.socials.instagram && (
          <p className="footer__note">
            * Instagram принадлежит компании Meta, признанной экстремистской
            организацией и запрещённой в России.
          </p>
        )}
      </div>
    </footer>
  )
}
