import { getSiteInfo } from '@/lib/settings'
import SocialLinks from '@/components/SocialLinks'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Контакты — NIXDOG STUDIO' }

// Контакты и реквизиты берутся из админки («Реквизиты и соцсети»).
export default async function ContactsPage() {
  const { requisites: r, socials } = await getSiteInfo().catch(() => ({ requisites: {}, socials: {} }))
  const filled = Boolean(r.email || r.phone)

  return (
    <div className="page section">
      <div style={{ maxWidth: 560 }}>
        <h1 className="h1">Контакты</h1>

        <p className="muted">
          Пишите по любым вопросам: подбор размера, статус заказа, обмен или оптовые заказы.
          {r.workHours ? ` Отвечаем: ${r.workHours}.` : ''}
        </p>

        <div className="panel" style={{ marginTop: 28 }}>
          {r.email && (
            <>
              <div className="caption">Почта</div>
              <p style={{ marginTop: 4 }}>
                <a href={`mailto:${r.email}`}>{r.email}</a>
              </p>
            </>
          )}
          {r.phone && (
            <>
              <div className="caption" style={{ marginTop: 20 }}>
                Телефон
              </div>
              <p style={{ marginTop: 4 }}>
                <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}>{r.phone}</a>
              </p>
            </>
          )}
          {!filled && (
            <p className="muted" style={{ margin: 0 }}>
              Контакты появятся здесь, когда их заполнят в админке.
            </p>
          )}
          <SocialLinks socials={socials} />
        </div>

        {(r.sellerName || r.inn) && (
          <div className="panel">
            <div className="caption" style={{ marginBottom: 10 }}>
              Реквизиты продавца
            </div>
            <dl className="legal__requisites" style={{ margin: 0 }}>
              {r.sellerName && (
                <>
                  <dt>Продавец</dt>
                  <dd>{r.sellerName}</dd>
                </>
              )}
              {r.inn && (
                <>
                  <dt>ИНН</dt>
                  <dd>{r.inn}</dd>
                </>
              )}
              {r.ogrn && (
                <>
                  <dt>ОГРН / ОГРНИП</dt>
                  <dd>{r.ogrn}</dd>
                </>
              )}
              {r.address && (
                <>
                  <dt>Адрес</dt>
                  <dd>{r.address}</dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
