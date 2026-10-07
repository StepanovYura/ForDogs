'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { saveSiteInfoAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--sm" disabled={pending}>
      {pending ? 'Сохраняем…' : 'Сохранить'}
    </button>
  )
}

export default function SettingsForm({ info, requisiteFields, socialFields }) {
  const [state, action] = useFormState(saveSiteInfoAction, {})

  return (
    <form action={action}>
      {state?.error && <div className="form-error">{state.error}</div>}
      {state?.ok && <div className="form-ok">{state.ok}</div>}

      <div className="panel">
        <h2 className="h3">Реквизиты продавца</h2>
        <p className="small muted">
          Показываются в подвале, на странице «Контакты», в оферте и политике
          конфиденциальности. Банк при подключении эквайринга проверяет их наличие на сайте.
        </p>
        <div className="row-2">
          {requisiteFields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <input
                id={f.key}
                name={f.key}
                className="input"
                placeholder={f.placeholder}
                defaultValue={info.requisites[f.key] || ''}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 className="h3">Соцсети</h2>
        <p className="small muted">
          Заполненные ссылки появятся иконками в подвале и в меню. Пустое поле — иконки нет.
        </p>
        <div className="row-3">
          {socialFields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              <input
                id={f.key}
                name={f.key}
                className="input"
                placeholder={f.placeholder}
                defaultValue={info.socials[f.key] || ''}
              />
            </div>
          ))}
        </div>
      </div>

      <Submit />
    </form>
  )
}
