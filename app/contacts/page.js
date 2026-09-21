export const metadata = { title: 'Контакты — NIXDOG STUDIO' }

export default function ContactsPage() {
  return (
    <div className="page section">
      <div style={{ maxWidth: 560 }}>
        <h1 className="h1">Контакты</h1>

        <p className="muted">
          Пишите по любым вопросам: подбор размера, статус заказа, обмен или
          оптовые заказы. Отвечаем в рабочие дни с 10:00 до 19:00 по Москве.
        </p>

        <div className="panel" style={{ marginTop: 28 }}>
          <div className="caption">Почта</div>
          <p style={{ marginTop: 4 }}>hello@nixdog.ru</p>

          <div className="caption" style={{ marginTop: 20 }}>
            Телефон
          </div>
          <p style={{ marginTop: 4 }}>+7 900 000-00-00</p>

          <div className="caption" style={{ marginTop: 20 }}>
            Мастерская
          </div>
          <p style={{ marginTop: 4, marginBottom: 0 }} className="muted">
            Москва, приём и выдача заказов по договорённости.
          </p>
        </div>

        <p className="small muted">
          Контакты в этом блоке — заглушки. Замените их на настоящие перед
          запуском магазина.
        </p>
      </div>
    </div>
  )
}
