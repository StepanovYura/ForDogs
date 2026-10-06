import ReadMore from '@/components/ReadMore'

export const metadata = { title: 'Доставка и оплата — NIXDOG STUDIO' }

export default function DeliveryPage() {
  return (
    <div className="page section">
      <div style={{ maxWidth: 680 }}>
        <h1 className="h1">Доставка и оплата</h1>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Как оплатить
        </h2>
        <ReadMore lines={4} as="p" className="muted">
          Банковской картой (Visa, Mastercard, МИР) или через Систему быстрых
          платежей (СБП). Карту вы вводите на защищённой странице банка — на
          наш сайт её данные не попадают. Для СБП мы покажем QR-код:
          отсканируйте его камерой телефона или в приложении своего банка, а с
          телефона просто нажмите «Оплатить в приложении банка». После оплаты
          заказ появляется в личном кабинете со статусом «Оплачен», а на
          указанный email приходит чек.
        </ReadMore>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Сроки и способы
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Куда</th>
                <th>Как</th>
                <th>Срок</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Москва</td>
                <td>Курьер</td>
                <td>день в день при заказе до 14:00</td>
              </tr>
              <tr>
                <td>Санкт-Петербург</td>
                <td>Курьер, СДЭК</td>
                <td>1–2 дня</td>
              </tr>
              <tr>
                <td>Россия</td>
                <td>СДЭК, Почта России</td>
                <td>2–7 дней</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Обмен и возврат
        </h2>
        <ReadMore lines={4}>
          <p className="muted">
            14 дней с момента получения, если изделие не носили и сохранены бирки.
            Обратную доставку оплачивает покупатель — кроме случаев, когда вещь
            пришла с браком: тогда мы оплачиваем пересылку и меняем изделие.
          </p>
          <p className="muted">
            Чтобы оформить обмен, напишите нам на почту с номером заказа — он
            указан в личном кабинете.
          </p>
        </ReadMore>
      </div>
    </div>
  )
}
