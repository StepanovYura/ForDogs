'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import PasswordInput from '@/components/PasswordInput'
import ConsentCheckbox from '@/components/ConsentCheckbox'
import { useFormValidation } from '@/lib/formValidation'
import FieldError from '@/components/FieldError'
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
  // Подсказки о незаполненных полях — в стиле сайта, а не окнами браузера.
  // Если что-то не так, отправку на сервер отменяем.
  const { errors, validate, clearOnInput } = useFormValidation()
  const invalid = (name) =>
    errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {}
  const onSubmit = (event) => {
    if (!validate(event.currentTarget)) event.preventDefault()
  }

  return (
    <form action={action} className="form-narrow" onSubmit={onSubmit} onInput={clearOnInput} onChange={clearOnInput} noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error && <div className="form-error">{state.error}</div>}

      <div className="field">
        <label htmlFor="name">Имя</label>
        <input id="name" name="name" className="input" autoComplete="name" placeholder="Как к вам обращаться" />
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" {...invalid('email')} />
        <FieldError name="email" errors={errors} />
      </div>

      <div className="field">
        <label htmlFor="password">Пароль</label>
        <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" {...invalid('password')} />
        {errors.password ? (
          <FieldError name="password" errors={errors} />
        ) : (
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            Не короче 8 символов.
          </p>
        )}
      </div>

      <ConsentCheckbox withOffer={false} error={errors.consent} />

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
