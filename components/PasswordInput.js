'use client'

import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './Icons'

// Поле пароля с «глазиком»: можно проверить, что набрано, перед отправкой.
export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-field">
      <input {...props} type={visible ? 'text' : 'password'} className="input" />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        title={visible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {visible ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
      </button>
    </div>
  )
}
