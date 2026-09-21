'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateProfileAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--sm" disabled={pending}>
      {pending ? 'Сохраняем…' : 'Сохранить'}
    </button>
  )
}

export default function ProfileForm({ user }) {
  const [state, action] = useFormState(updateProfileAction, {})

  return (
    <form action={action}>
      {state?.ok && <div className="form-ok">{state.ok}</div>}

      <div className="field">
        <label htmlFor="name">Имя</label>
        <input id="name" name="name" className="input" defaultValue={user.name || ''} />
      </div>

      <div className="field">
        <label htmlFor="phone">Телефон</label>
        <input
          id="phone"
          name="phone"
          className="input"
          defaultValue={user.phone || ''}
          placeholder="+7 900 000-00-00"
        />
      </div>

      <Submit />
    </form>
  )
}
