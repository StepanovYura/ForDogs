'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const POLL_MS = 3000

function formatLeft(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

// Ожидание оплаты на странице заказа.
//   СБП: на компьютере покупатель сканирует QR телефоном, на телефоне —
//   жмёт кнопку и подтверждает платёж в приложении банка.
//   Карта: кнопка ведёт на платёжную страницу банка — если покупатель
//   закрыл её, не заплатив, отсюда можно вернуться к оплате.
// Статус опрашиваем сами: вернувшись из банка, человек сразу видит
// результат, не обновляя страницу.
export default function PaymentPanel({ method = 'sbp', orderId, qrSvg, paymentUrl, expiresAt }) {
  // Карта и «Долями» оплачиваются на странице банка, СБП — по QR-коду здесь.
  const card = method === 'card' || method === 'dolyame'
  const dolyame = method === 'dolyame'
  const router = useRouter()
  const deadline = new Date(expiresAt).getTime()
  // Пока страница не ожила в браузере — null: время на сервере и в браузере
  // разойдётся на секунду, и React ругнётся на несовпадение разметки.
  const [left, setLeft] = useState(null)
  const [error, setError] = useState('')
  const [canceling, setCanceling] = useState(false)

  const check = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, { cache: 'no-store' })
      const data = await response.json()
      if (response.ok && data.status !== 'PENDING') router.refresh()
    } catch {
      // Сеть моргнула — проверим на следующем круге.
    }
  }, [orderId, router])

  useEffect(() => {
    const tick = () => setLeft(deadline - Date.now())
    tick()
    const timer = setInterval(tick, 1000)
    const poll = setInterval(check, POLL_MS)
    // Покупатель вернулся из приложения банка — проверяем сразу.
    const onVisible = () => document.visibilityState === 'visible' && check()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check, deadline])

  async function cancel() {
    if (!window.confirm('Отменить заказ? Товары вернутся в каталог.')) return
    setCanceling(true)
    setError('')
    const response = await fetch(`/api/orders/${orderId}/payment`, { method: 'DELETE' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error || 'Не удалось отменить заказ')
      setCanceling(false)
      return
    }
    router.refresh()
  }

  const expired = left !== null && left <= 0

  return (
    <div className="panel sbp">
      <div className="sbp__head">
        <span className="sbp__logo" aria-hidden="true">
          {dolyame ? 'ДОЛЯМИ' : card ? 'КАРТА' : 'СБП'}
        </span>
        <div>
          <strong>
            {dolyame ? 'Оплата долями' : card ? 'Оплата банковской картой' : 'Оплата через СБП'}
          </strong>
          <div className="small muted">
            {expired
              ? card
                ? 'Время на оплату истекло'
                : 'Срок действия QR-кода истёк'
              : `${card ? 'Оплатить можно ещё' : 'QR-код действует ещё'} ${left === null ? '…' : formatLeft(left)}`}
          </div>
        </div>
      </div>

      {expired ? (
        <p className="muted">Проверяем, не прошла ли оплата в последний момент…</p>
      ) : card ? (
        <>
          <a href={paymentUrl} className="btn btn--block">
            {dolyame ? 'Перейти к оформлению «Долями»' : 'Перейти к оплате картой'}
          </a>
          <p className="sbp__hint small muted" style={{ marginTop: 14 }}>
            {dolyame
              ? 'Оплата частями оформляется на защищённой странице Т-Банка: 4 платежа по 25% раз в две недели, без переплат.'
              : 'Данные карты вводятся на защищённой странице банка — на наш сайт они не попадают.'}{' '}
            Если вы уже оплатили, подождите: банк подтвердит платёж, и страница обновится сама.
          </p>
          <div className="sbp__waiting small muted">
            <span className="sbp__dot" aria-hidden="true" />
            Ждём подтверждения от банка
          </div>
        </>
      ) : (
        <>
          <a href={paymentUrl} className="btn btn--block sbp__mobile">
            Оплатить в приложении банка
          </a>
          <p className="sbp__hint small muted sbp__mobile">
            Откроется список банков — выберите свой и подтвердите платёж.
            Или отсканируйте QR-код с другого устройства:
          </p>

          <div className="sbp__qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="sbp__hint small muted sbp__desktop">
            Наведите камеру телефона на QR-код или отсканируйте его в
            приложении своего банка и подтвердите платёж.
          </p>

          <div className="sbp__waiting small muted">
            <span className="sbp__dot" aria-hidden="true" />
            Ждём подтверждения от банка — страница обновится сама
          </div>
        </>
      )}

      {error && <div className="form-error">{error}</div>}

      <button type="button" className="sbp__cancel" onClick={cancel} disabled={canceling}>
        {canceling ? 'Отменяем…' : 'Отменить заказ'}
      </button>
    </div>
  )
}
