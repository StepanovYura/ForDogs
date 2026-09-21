'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createProductAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--sm" disabled={pending}>
      {pending ? 'Добавляем…' : 'Добавить товар'}
    </button>
  )
}

export default function NewProductForm({ categories }) {
  const [state, action] = useFormState(createProductAction, {})

  return (
    <form action={action} className="panel">
      <h2 className="h3">Новый товар</h2>

      {state?.error && <div className="form-error">{state.error}</div>}
      {state?.ok && <div className="form-ok">{state.ok}</div>}

      <div className="row-3">
        <div className="field">
          <label htmlFor="new-title">Название</label>
          <input id="new-title" name="title" className="input" required />
        </div>
        <div className="field">
          <label htmlFor="new-price">Цена, ₽</label>
          <input id="new-price" name="price" className="input" required inputMode="decimal" />
        </div>
        <div className="field">
          <label htmlFor="new-category">Категория</label>
          <select id="new-category" name="categoryId" className="select">
            <option value="">— без категории —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="new-description">Описание</label>
        <textarea id="new-description" name="description" className="textarea" />
      </div>

      <div className="row-2">
        <div className="field">
          <label htmlFor="new-composition">Состав и уход</label>
          <textarea id="new-composition" name="composition" className="textarea" />
        </div>
        <div className="field">
          <label htmlFor="new-delivery">Доставка и возврат</label>
          <textarea id="new-delivery" name="delivery" className="textarea" />
        </div>
      </div>

      <Submit />
    </form>
  )
}
