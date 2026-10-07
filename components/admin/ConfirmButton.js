'use client'

// Кнопка-форма с подтверждением: для удаления размеров, цветов, категорий.
export default function ConfirmButton({ action, fields, confirm, children, className = 'link-underline' }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
    >
      {Object.entries(fields).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
