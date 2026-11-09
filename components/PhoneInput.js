'use client'

// Поле телефона с маской: покупатель видит номер в виде +7 (999) 999-99-99
// и пока набирает, и после. Принимает и вставленный номер в любом виде —
// 89991234567, +79991234567, 999 123 45 67.
import { useState } from 'react'
import { PHONE_PATTERN, PHONE_PREFIX, formatPhone, phoneDigits } from '@/lib/phone'

export default function PhoneInput({ defaultValue = '', onFocus, onBlur, ...props }) {
  const [value, setValue] = useState(() => formatPhone(defaultValue))

  function change(event) {
    const next = event.target.value
    // Стёрли скобку, пробел или дефис — цифры не изменились, и маска
    // вернула бы символ на место. Тогда стираем цифру перед ним.
    if (next.length < value.length && phoneDigits(next) === phoneDigits(value)) {
      setValue(formatPhone(phoneDigits(value).slice(0, -1)))
      return
    }
    setValue(formatPhone(next))
  }

  return (
    <input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      pattern={PHONE_PATTERN}
      title="Номер целиком: +7 (999) 999-99-99"
      placeholder="+7 (999) 999-99-99"
      value={value}
      onChange={change}
      // Код страны подставляем сразу — дальше остаётся набрать сам номер.
      onFocus={(event) => {
        if (!value) setValue(PHONE_PREFIX)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        if (!phoneDigits(value)) setValue('')
        onBlur?.(event)
      }}
    />
  )
}
