'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { registerAction } from '../login/actions'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn--block" disabled={pending}>
      {pending ? 'Создаём…' : 'Создать аккаунт'}
    </button>
  )
}

export default function RegisterForm({ next }) {
  const [state, action] = useFormState(registerAction, {})

  return (
    <form action={action} className="form-narrow">
      <input type="hidden" name="next" value={next} />

      {state?.error && <div className="form-error">{state.error}</div>}

      <div className="field">
        <label htmlFor="name">Имя</label>
        <input id="name" name="name" className="input" autoComplete="name" placeholder="Как к вам обращаться" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>

      <div className="field">
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Не короче 8 символов.
        </p>
      </div>

      <Submit />

      <p className="small muted" style={{ textAlign: 'center', marginTop: 20 }}>
        Уже есть аккаунт?{' '}
        <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ textDecoration: 'underline' }}>
          Войти
        </Link>
      </p>
    </form>
  )
}
