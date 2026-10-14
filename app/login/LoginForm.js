'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import PasswordInput from '@/components/PasswordInput'
import { useFormValidation } from '@/lib/formValidation'
import FieldError from '@/components/FieldError'
import { loginAction } from './actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--block" disabled={pending}>
      {pending ? 'Входим…' : 'Войти'}
    </button>
  )
}

export default function LoginForm({ next }) {
  const [state, action] = useFormState(loginAction, {})
  // Подсказки о незаполненных полях — в стиле сайта, а не окнами браузера.
  // Если что-то не так, отправку на сервер отменяем.
  const { errors, validate, clearOnInput } = useFormValidation()
  const invalid = (name) =>
    errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {}
  const onSubmit = (event) => {
    if (!validate(event.currentTarget)) event.preventDefault()
  }

  return (
    <form action={action} className="form-narrow" onSubmit={onSubmit} onInput={clearOnInput} noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error && <div className="form-error">{state.error}</div>}

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          placeholder="you@example.com"
          {...invalid('email')}
        />
        <FieldError name="email" errors={errors} />
      </div>

      <div className="field">
        <label htmlFor="password">Пароль</label>
        <PasswordInput id="password" name="password" required autoComplete="current-password" {...invalid('password')} />
        <FieldError name="password" errors={errors} />
      </div>

      <Submit />

      <p className="small muted" style={{ textAlign: 'center', marginTop: 20 }}>
        Нет аккаунта?{' '}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          style={{ textDecoration: 'underline' }}
        >
          Зарегистрироваться
        </Link>
      </p>
    </form>
  )
}
