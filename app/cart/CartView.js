'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/money'

export default function CartView() {
  const { items, setQuantity, remove, totalKopeks, ready } = useCart()

  if (!ready) return <p className="muted">Загружаем корзину…</p>

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>В корзине пока пусто.</p>
        <Link href="/catalog" className="btn">
          Перейти в каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="cart-layout">
      <div>
        {items.map((item) => (
          <div className="cart-row" key={item.variantId}>
            <div className="cart-row__media">
              {item.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.image} alt={item.title} />
              ) : null}
            </div>

            <div>
              <Link href={`/product/${item.productSlug}`} className="card__title">
                {item.title}
              </Link>
              <p className="small muted" style={{ margin: '4px 0 12px' }}>
                {item.colorName} · размер {item.size}
              </p>

              <div className="qty">
                <button
                  type="button"
                  onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                  aria-label="Убрать одну штуку"
                >
                  −
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(item.variantId, Math.min(item.quantity + 1, item.stock ?? 20))
                  }
                  disabled={item.stock != null && item.quantity >= item.stock}
                  aria-label="Добавить одну штуку"
                >
                  +
                </button>
              </div>

              {item.stock != null && item.quantity >= item.stock && (
                <p className="small muted" style={{ margin: '8px 0 0' }}>
                  Это всё, что осталось на складе.
                </p>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <div>{formatPrice(item.priceKopeks * item.quantity)}</div>
              <button
                type="button"
                className="link-underline"
                style={{ marginTop: 10 }}
                onClick={() => remove(item.variantId)}
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <aside className="summary">
        <h2 className="h3">Итого</h2>
        <div className="summary__row">
          <span className="muted">Товары</span>
          <span>{formatPrice(totalKopeks)}</span>
        </div>
        <div className="summary__row">
          <span className="muted">Доставка</span>
          <span className="muted">рассчитается при оформлении</span>
        </div>
        <div className="summary__total">
          <span>К оплате</span>
          <span>{formatPrice(totalKopeks)}</span>
        </div>
        <Link href="/checkout" className="btn btn--block">
          Оформить заказ
        </Link>
        <p className="small muted" style={{ marginBottom: 0, marginTop: 14 }}>
          Для оплаты потребуется войти в аккаунт.
        </p>
      </aside>
    </div>
  )
}
