import { prisma } from '@/lib/prisma'
import { compareSizes } from '@/lib/sizes'
import ConfirmButton from '@/components/admin/ConfirmButton'
import { addSizeGuideRowAction, deleteSizeGuideRowAction, saveSizeGuideAction } from './actions'

export const dynamic = 'force-dynamic'

const MEASURES = [
  { key: 'backLength', label: 'Длина спины, см' },
  { key: 'chest', label: 'Обхват груди, см' },
  { key: 'neck', label: 'Обхват шеи, см' },
]

// Таблица размеров для окна «Как выбрать размер» и страницы /size-guide.
export default async function AdminSizeGuidePage() {
  const rows = (await prisma.sizeGuideRow.findMany()).sort((a, b) => compareSizes(a.size, b.size))

  return (
    <>
      <p className="muted">
        Таблица показывается покупателям в окне «Как выбрать размер» на карточке товара и на
        странице «Как выбрать размер». Можно писать число («25») или диапазон («25–29»).
      </p>

      <div className="panel">
        {rows.length > 0 && (
          <form action={saveSizeGuideAction}>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Размер</th>
                    {MEASURES.map((m) => (
                      <th key={m.key}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.size}</strong>
                      </td>
                      {MEASURES.map((m) => (
                        <td key={m.key}>
                          <input
                            name={`${m.key}_${row.id}`}
                            className="input"
                            style={{ width: 100 }}
                            defaultValue={row[m.key]}
                            aria-label={`${row.size}: ${m.label}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="submit" className="btn btn--sm" style={{ marginTop: 12 }}>
              Сохранить таблицу
            </button>
          </form>
        )}

        <div className="inline-form" style={{ marginTop: 24, gap: 18 }}>
          <form action={addSizeGuideRowAction} className="inline-form">
            <input name="size" className="input" style={{ width: 100 }} placeholder="XL" required />
            <button type="submit" className="btn btn--ghost btn--sm">
              Добавить размер
            </button>
          </form>
          {rows.map((row) => (
            <ConfirmButton
              key={row.id}
              action={deleteSizeGuideRowAction}
              fields={{ id: row.id }}
              confirm={`Убрать размер ${row.size} из таблицы?`}
            >
              Убрать {row.size}
            </ConfirmButton>
          ))}
        </div>
      </div>
    </>
  )
}
