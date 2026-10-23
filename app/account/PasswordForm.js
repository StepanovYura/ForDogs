'use client'

import { useEffect, useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import PasswordInput from '@/components/PasswordInput'
import { changePasswordAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--sm" disabled={pending}>
      {pending ? 'Меняем…' : 'Сменить пароль'}
    </button>
  )
}

export default function PasswordForm() {
  const [state, action] = useFormState(changePasswordAction, {})
  const form = useRef(null)

  // После успешной смены поля очищаем: пароли на экране не нужны.
  useEffect(() => {
    if (state?.ok) form.current?.reset()
  }, [state])

  return (
    <form action={action} ref={form}>
      {state?.error && <div className="form-error">{state.error}</div>}
      {state?.ok && <div className="form-ok">{state.ok}</div>}

      <div className="field">
        <label htmlFor="currentPassword">Текущий пароль</label>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required />
      </div>

      <div className="field">
        <label htmlFor="newPassword">Новый пароль</label>
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" minLength={8} required />
      </div>

      <div className="field">
        <label htmlFor="repeatPassword">Новый пароль ещё раз</label>
        <PasswordInput id="repeatPassword" name="repeatPassword" autoComplete="new-password" minLength={8} required />
      </div>

      <Submit />
    </form>
  )
}
