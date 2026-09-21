'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
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

  return (
    <form action={action} className="form-narrow">
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
        />
      </div>

      <div className="field">
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          autoComplete="current-password"
        />
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
