'use client'

import { useState } from 'react'

// «Как выбрать размер?» — таблица замеров прямо на карточке товара.
export default function SizeGuideModal({ rows }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="link-underline" onClick={() => setOpen(true)}>
        Как выбрать размер?
      </button>

      {open && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="modal">
            <div className="modal__head">
              <h2 className="h3" style={{ margin: 0 }}>
                Как выбрать размер
              </h2>
              <button
                type="button"
                className="modal__close"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <p className="small muted">
              Измерьте собаку сантиметровой лентой: длину спины — от холки до
              основания хвоста, обхват груди — в самом широком месте за
              передними лапами. Если замер попал между размерами, берите
              больший.
            </p>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Размер</th>
                    <th>Длина спины, см</th>
                    <th>Обхват груди, см</th>
                    <th>Обхват шеи, см</th>
                    <th>Примеры пород</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.size}>
                      <td>{row.size}</td>
                      <td>{row.backLength}</td>
                      <td>{row.chest}</td>
                      <td>{row.neck}</td>
                      <td className="muted">{row.breedsHint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
