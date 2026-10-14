'use client'

// Подсказки о незаполненных полях в стиле сайта — вместо стандартных
// всплывающих окон браузера. Проверка та же, что у браузера (required,
// type="email", minLength…), меняется только то, как она показана:
// форма с noValidate, поле подсвечивается, под ним — короткий текст.
import { useCallback, useState } from 'react'

function messageFor(el) {
  const v = el.validity
  if (el.type === 'checkbox' && v.valueMissing) {
    return el.dataset.message || 'Отметьте, чтобы продолжить'
  }
  if (v.valueMissing) return el.dataset.message || 'Заполните это поле'
  if (v.typeMismatch && el.type === 'email') return 'Проверьте адрес почты — например, name@mail.ru'
  if (v.tooShort) return `Не короче ${el.minLength} символов`
  if (v.patternMismatch) return el.title || 'Проверьте, как заполнено поле'
  return el.validationMessage
}

export function useFormValidation() {
  const [errors, setErrors] = useState({})

  // Проверяет форму; если что-то не так — показывает подсказки, ставит
  // курсор в первое проблемное поле и возвращает false.
  const validate = useCallback((form) => {
    const found = {}
    let first = null
    for (const el of form.elements) {
      if (!el.name || !el.willValidate || el.checkValidity()) continue
      if (!found[el.name]) found[el.name] = messageFor(el)
      if (!first) first = el
    }
    setErrors(found)
    if (first) {
      first.scrollIntoView({ behavior: 'smooth', block: 'center' })
      first.focus({ preventScroll: true })
      return false
    }
    return true
  }, [])

  // Как только человек начал исправлять поле — подсказку убираем.
  const clearOnInput = useCallback((event) => {
    const name = event.target?.name
    if (!name) return
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  return { errors, validate, clearOnInput }
}
