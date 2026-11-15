'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { lineKey, useCart } from '@/context/CartContext'
import { sizeLabel } from '@/lib/sizes'
import { formatPrice } from '@/lib/money'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { dolyamePart } from '@/lib/paymentMethods'
import PhoneInput from '@/components/PhoneInput'
import { useFormValidation } from '@/lib/formValidation'
import FieldError from '@/components/FieldError'

// Способы оплаты. Данные карты на нашем сайте не вводятся никогда —
// только на защищённой платёжной странице банка.
const METHODS = {
  sbp: {
    title: 'СБП',
    hint: 'QR-код или приложение вашего банка. Без комиссии и без ввода карты.',
    button: 'Оплатить по СБП',
  },
  dolyame: {
    title: 'Долями',
    hint: '4 платежа по 25% раз в две недели, без переплат. Оформление на странице Т-Банка.',
    button: 'Оформить «Долями»',
  },
  card: {
    title: 'Банковская карта',
    hint: 'Карта «Мир». Данные карты вводятся на защищённой странице банка.',
    button: 'Перейти к оплате картой',
  },
}

const REGION_TITLES = { ru: 'По России', by: 'В Беларусь', msk: 'Экспресс по Москве' }

export default function CheckoutForm({
  user,
  methods: allMethods = ['sbp'],
  dolyameLimits = {},
  delivery = { methods: [], freeFromKopeks: 0 },
}) {
  const { items, totalKopeks: itemsKopeks, ready, clear } = useCart()

  // Доставка: способ выбирает покупатель, цена прибавляется к итогу.
  // Окончательно сумму всё равно считает сервер — по ценам из базы.
  const [deliveryId, setDeliveryId] = useState('')
  const deliveryMethod = delivery.methods.find((m) => m.id === deliveryId) || null
  const freeDelivery = delivery.freeFromKopeks > 0 && itemsKopeks >= delivery.freeFromKopeks
  const deliveryKopeks = deliveryMethod && !freeDelivery ? deliveryMethod.priceKopeks : 0
  const totalKopeks = itemsKopeks + deliveryKopeks
  // «Долями» доступны только в пределах суммы, которую разрешает банк.
  const rub = totalKopeks / 100
  const methods = allMethods.filter(
    (m) => m !== 'dolyame' || (rub >= (dolyameLimits.min || 0) && rub <= (dolyameLimits.max || Infinity))
  )
  const [error, setError] = useState('')
  const errorBox = useRef(null)
  // Ошибка оформления (товар закончился, банк недоступен) показывается вверху
  // формы, а кнопка «Оплатить» — внизу: на телефоне сообщение было бы не
  // видно. Прокручиваем к нему.
  useEffect(() => {
    if (error) errorBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])
  const [busy, setBusy] = useState(false)
  const [chosen, setMethod] = useState(methods[0] || 'sbp')
  const method = methods.includes(chosen) ? chosen : methods[0] || 'sbp'

  // Подсказки о незаполненных полях — в стиле сайта, а не окнами браузера.
  const { errors, validate, clearOnInput } = useFormValidation()
  const invalid = (name) =>
    errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {}

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!validate(event.currentTarget)) return
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
      paymentMethod: method,
      deliveryMethodId: deliveryId,
      consent: form.get('consent') === 'on',
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, humanSize: i.humanSize || undefined })),
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

      // Заказ создан — корзину чистим и уходим платить: на страницу заказа
      // с QR-кодом СБП или на платёжную страницу банка.
      clear()
      window.location.href = data.redirectUrl
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
    <form className="cart-layout" onSubmit={handleSubmit} onInput={clearOnInput} onChange={clearOnInput} noValidate>
      <div>
        {error && (
          <div className="form-error" ref={errorBox} role="alert">
            {error}
          </div>
        )}

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
              {...invalid('customerName')}
            />
            <FieldError name="customerName" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="customerPhone">Телефон</label>
            <PhoneInput
              id="customerPhone"
              name="customerPhone"
              className="input"
              required
              defaultValue={user.phone || ''}
              {...invalid('customerPhone')}
            />
            <FieldError name="customerPhone" errors={errors} />
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
            {...invalid('customerEmail')}
          />
          <FieldError name="customerEmail" errors={errors} />
        </div>

        <h2 className="h3" style={{ marginTop: 32 }}>
          Доставка
        </h2>
        <div className="row-2">
          <div className="field">
            <label htmlFor="city">Город</label>
            <input id="city" name="city" className="input" required {...invalid('city')} />
            <FieldError name="city" errors={errors} />
          </div>
          <div className="field">
            <label htmlFor="postalCode">Индекс</label>
            <input id="postalCode" name="postalCode" className="input" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="address">Адрес (улица, дом, квартира)</label>
          <input id="address" name="address" className="input" required {...invalid('address')} />
          <FieldError name="address" errors={errors} />
        </div>

        <div className="field">
          <label htmlFor="comment">Комментарий к заказу</label>
          <textarea id="comment" name="comment" className="textarea" />
        </div>

        {delivery.methods.length > 0 && (
          <fieldset className="delivery-methods">
            <legend className="h3">Способ доставки</legend>
            {delivery.freeFromKopeks > 0 && (
              <p className="small muted" style={{ marginTop: 0 }}>
                {freeDelivery
                  ? 'Для этого заказа доставка бесплатная.'
                  : `Бесплатная доставка — от ${formatPrice(delivery.freeFromKopeks)}.`}
              </p>
            )}
            {Object.entries(REGION_TITLES).map(([region, title]) => {
              const list = delivery.methods.filter((m) => m.region === region)
              if (list.length === 0) return null
              return (
                <div key={region} className="delivery-methods__group">
                  <div className="caption">{title}</div>
                  {list.map((m) => (
                    <label key={m.id} className="pay-method" data-active={deliveryId === m.id}>
                      <input
                        type="radio"
                        name="deliveryMethodId"
                        value={m.id}
                        required
                        data-message="Выберите способ доставки"
                        checked={deliveryId === m.id}
                        onChange={() => setDeliveryId(m.id)}
                      />
                      <span>
                        <strong>{m.title}</strong>
                        {m.description && <span className="small muted">{m.description}</span>}
                      </span>
                      <span className="delivery-methods__price">
                        {freeDelivery || m.priceKopeks === 0 ? 'бесплатно' : formatPrice(m.priceKopeks)}
                      </span>
                    </label>
                  ))}
                </div>
              )
            })}
            <FieldError name="deliveryMethodId" errors={errors} />
          </fieldset>
        )}
      </div>

      <aside className="summary">
        <h2 className="h3">Ваш заказ</h2>
        {items.map((i) => (
          <div className="summary__row" key={lineKey(i)}>
            <span className="muted">
              {i.title}
              <br />
              <span className="small">
                {i.colorName} · {sizeLabel(i.size, i.humanSize)} · {i.quantity} шт.
              </span>
            </span>
            <span>{formatPrice(i.priceKopeks * i.quantity)}</span>
          </div>
        ))}
        {delivery.methods.length > 0 && (
          <>
            <div className="summary__row">
              <span className="muted">Товары</span>
              <span>{formatPrice(itemsKopeks)}</span>
            </div>
            <div className="summary__row">
              <span className="muted">Доставка{deliveryMethod ? `: ${deliveryMethod.title}` : ''}</span>
              <span>
                {!deliveryMethod ? 'выберите способ' : deliveryKopeks === 0 ? 'бесплатно' : formatPrice(deliveryKopeks)}
              </span>
            </div>
          </>
        )}
        <div className="summary__total">
          <span>К оплате</span>
          <span>{formatPrice(totalKopeks)}</span>
        </div>
        {methods.length > 1 && (
          <fieldset className="pay-methods">
            <legend className="caption">Способ оплаты</legend>
            {methods.map((key) => (
              <label key={key} className="pay-method" data-active={method === key}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={key}
                  checked={method === key}
                  onChange={() => setMethod(key)}
                />
                <span>
                  <strong>{METHODS[key].title}</strong>
                  <span className="small muted">
                    {METHODS[key].hint}
                    {key === 'dolyame' && ` Сегодня — ${formatPrice(dolyamePart(totalKopeks))}.`}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <ConsentCheckbox error={errors.consent} />

        <button type="submit" className="btn btn--block" disabled={busy || methods.length === 0}>
          {busy ? 'Создаём платёж…' : METHODS[method]?.button || 'Оплатить'}
        </button>
        {methods.length === 0 ? (
          <p className="small" style={{ color: 'var(--danger)', marginBottom: 0, marginTop: 14 }}>
            Оплата временно недоступна.
          </p>
        ) : (
          methods.length === 1 && (
            <p className="small muted" style={{ marginBottom: 0, marginTop: 14 }}>
              {METHODS[method].hint}
            </p>
          )
        )}
      </aside>
    </form>
  )
}
