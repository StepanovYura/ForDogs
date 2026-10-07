'use client'

// Номер позиции вместо стрелок ↑↓: выбрал «3» — элемент встаёт третьим,
// остальные сдвигаются. Выпадающий список, а не поле ввода — так нельзя
// набрать несуществующий номер.
export default function PositionSelect({ action, fields, value, count, label = 'Позиция' }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <select
        name="position"
        className="select position-select"
        defaultValue={value}
        aria-label={label}
        title={label}
        onChange={(event) => event.currentTarget.form.requestSubmit()}
      >
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </form>
  )
}
