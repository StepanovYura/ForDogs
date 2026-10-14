// Подсказка под полем формы: «Заполните это поле» и т.п.
// id нужен, чтобы экранные дикторы читали подсказку вместе с полем
// (aria-describedby у самого поля).
export default function FieldError({ name, errors }) {
  const message = errors?.[name]
  if (!message) return null
  return (
    <p className="field-error" id={`${name}-error`} role="alert">
      {message}
    </p>
  )
}
