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
          Банковской картой «Мир» или через Систему быстрых
          платежей (СБП). Карту вы вводите на защищённой странице банка — на
          наш сайт её данные не попадают. Для СБП мы покажем QR-код:
          отсканируйте его камерой телефона или в приложении своего банка, а с
          телефона просто нажмите «Оплатить в приложении банка». После оплаты
          заказ появляется в личном кабинете со статусом «Оплачен», а на
          указанный email приходит чек.
        </ReadMore>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Способы доставки
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Куда</th>
                <th>Кто доставляет</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>По России</td>
                <td>СДЭК, Почта России, Яндекс Доставка</td>
              </tr>
              <tr>
                <td>В Беларусь</td>
                <td>СДЭК, Почта России</td>
              </tr>
              <tr>
                <td>Экспресс-доставка по Москве</td>
                <td>Яндекс, Достависта</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="muted">Доставка осуществляется за счёт покупателя.</p>

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
