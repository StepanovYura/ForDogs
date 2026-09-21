'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/money'

export default function CheckoutForm({ user }) {
  const { items, totalKopeks, ready, clear } = useCart()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    const form = new FormData(event.currentTarget)
    const payload = {
      customerName: form.get('customerName'),
      customerEmail: form.get('customerEmail'),
      customerPhone: form.get('customerPhone'),
      city: form.get('city'),
      address: form.get('address'),
      postalCode: form.get('postalCode') || '',
      comment: form.get('comment') || '',
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    }

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Не удалось создать заказ')
        setBusy(false)
        return
      }

      // Заказ создан — корзину чистим и уходим на страницу оплаты ЮKassa.
      clear()
      window.location.href = data.confirmationUrl
    } catch {
      setError('Сеть недоступна. Попробуйте ещё раз.')
      setBusy(false)
    }
  }

  if (!ready) return <p className="muted">Загружаем корзину…</p>

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>Корзина пуста — оформлять нечего.</p>
        <Link href="/catalog" className="btn">
          В каталог
        </Link>
      </div>
    )
  }

  return (
    <form className="cart-layout" onSubmit={handleSubmit}>
      <div>
        {error && <div className="form-error">{error}</div>}

        <h2 className="h3">Получатель</h2>
        <div className="row-2">
          <div className="field">
            <label htmlFor="customerName">Имя и фамилия</label>
            <input
              id="customerName"
              name="customerName"
              className="input"
              required
              defaultValue={user.name || ''}
            />
          </div>
          <div className="field">
            <label htmlFor="customerPhone">Телефон</label>
            <input
              id="customerPhone"
              name="customerPhone"
              className="input"
              required
              placeholder="+7 900 000-00-00"
              defaultValue={user.phone || ''}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="customerEmail">Email для чека</label>
          <input
            id="customerEmail"
            name="customerEmail"
            type="email"
            className="input"
            required
            defaultValue={user.email}
          />
        </div>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Доставка
        </h2>
        <div className="row-2">
          <div className="field">
            <label htmlFor="city">Город</label>
            <input id="city" name="city" className="input" required />
          </div>
          <div className="field">
            <label htmlFor="postalCode">Индекс</label>
            <input id="postalCode" name="postalCode" className="input" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="address">Адрес (улица, дом, квартира)</label>
          <input id="address" name="address" className="input" required />
        </div>

        <div className="field">
          <label htmlFor="comment">Комментарий к заказу</label>
          <textarea id="comment" name="comment" className="textarea" />
        </div>
      </div>

      <aside className="summary">
        <h2 className="h3">Ваш заказ</h2>
        {items.map((i) => (
          <div className="summary__row" key={i.variantId}>
            <span className="muted">
              {i.title}
              <br />
              <span className="small">
                {i.colorName} · {i.size} · {i.quantity} шт.
              </span>
            </span>
            <span>{formatPrice(i.priceKopeks * i.quantity)}</span>
          </div>
        ))}
        <div className="summary__total">
          <span>К оплате</span>
          <span>{formatPrice(totalKopeks)}</span>
        </div>
        <button type="submit" className="btn btn--block" disabled={busy}>
          {busy ? 'Создаём платёж…' : 'Перейти к оплате'}
        </button>
        <p className="small muted" style={{ marginBottom: 0, marginTop: 14 }}>
          Оплата картой на защищённой странице ЮKassa. Данные карты на наш
          сайт не передаются.
        </p>
      </aside>
    </form>
  )
}
