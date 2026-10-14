// Таблица размеров в виде, как у заказчика: размеры по столбцам, мерки по
// строкам. Общая для окна «Как выбрать размер» и страницы /size-guide.
// Данные редактируются в «Админка → Таблица размеров».
const MEASURES = [
  { key: 'backLength', label: 'длина спины' },
  { key: 'chest', label: 'обхват груди' },
  { key: 'neck', label: 'обхват шеи' },
]

export default function SizeTable({ rows }) {
  if (!rows?.length) return <p className="small muted">Таблица размеров скоро появится.</p>

  return (
    <div className="table-wrap">
      <table className="size-table">
        <thead>
          <tr>
            <th aria-label="Мерка" />
            {rows.map((row) => (
              <th key={row.size} scope="col">
                {row.size}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEASURES.map((m) => (
            <tr key={m.key}>
              <th scope="row">{m.label}</th>
              {rows.map((row) => (
                <td key={row.size}>{row[m.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted" style={{ margin: '8px 0 0' }}>
        Все мерки — в сантиметрах.
      </p>
    </div>
  )
}
