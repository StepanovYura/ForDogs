import Link from 'next/link'

export const metadata = { title: 'Оплата не прошла — NIXDOG STUDIO' }

export default function OrderFailPage() {
  return (
    <div className="page section">
      <div className="empty">
        <h1 className="h1">Оплата не прошла</h1>
        <p>
          Деньги не списаны. Проверьте данные карты и попробуйте оформить заказ
          ещё раз — товары остались в каталоге.
        </p>
        <Link href="/cart" className="btn">
          Вернуться в корзину
        </Link>
      </div>
    </div>
  )
}
