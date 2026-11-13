'use client'

// Кнопка «Отменить заказ» у оплаченного, ещё не отправленного заказа.
// Сначала спрашиваем причину (необязательно), потом отправляем запрос.
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { requestCancelAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--sm" disabled={pending}>
      {pending ? 'Отправляем…' : 'Отправить запрос'}
    </button>
  )
}

export default function CancelRequest({ orderId }) {
  const [open, setOpen] = useState(false)
  const [state, action] = useFormState(requestCancelAction, {})

  if (state?.ok) {
    return (
      <div className="form-ok" style={{ marginTop: 16 }}>
        Запрос на отмену отправлен. Если заказ ещё не передан в доставку, мы отменим его и вернём
        деньги — обычно они приходят в течение 10 дней.
      </div>
    )
  }

  if (!open) {
    return (
      <button type="button" className="link-underline" style={{ marginTop: 16 }} onClick={() => setOpen(true)}>
        Отменить заказ
      </button>
    )
  }

  return (
    <form action={action} className="panel" style={{ marginTop: 16 }}>
      <input type="hidden" name="orderId" value={orderId} />
      <p style={{ marginTop: 0 }}>
        Мы получим запрос и, если заказ ещё не отправлен, отменим его и вернём деньги на карту или
        счёт, с которого вы платили.
      </p>
      {state?.error && <div className="form-error">{state.error}</div>}
      <div className="field">
        <label htmlFor="cancel-reason">Причина — если хотите</label>
        <textarea id="cancel-reason" name="reason" className="textarea" maxLength={500} rows={3} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Submit />
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setOpen(false)}>
          Не отменять
        </button>
      </div>
    </form>
  )
}
