import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Как выбрать размер — NIXDOG STUDIO' }

export default async function SizeGuidePage() {
  const rows = await prisma.sizeGuideRow.findMany({ orderBy: { position: 'asc' } }).catch(() => [])

  return (
    <div className="page section">
      <div style={{ maxWidth: 760 }}>
        <h1 className="h1">Как выбрать размер</h1>

        <p className="muted">
          Понадобится сантиметровая лента и пара минут. Снимайте мерки, когда
          собака стоит ровно на четырёх лапах.
        </p>

        <ol className="muted" style={{ paddingLeft: 20 }}>
          <li>
            <strong>Длина спины</strong> — от холки (место между лопатками) до
            основания хвоста.
          </li>
          <li>
            <strong>Обхват груди</strong> — в самом широком месте, сразу за
            передними лапами.
          </li>
          <li>
            <strong>Обхват шеи</strong> — там, где обычно лежит ошейник.
          </li>
        </ol>

        <p className="muted">
          Ориентируйтесь в первую очередь на обхват груди — это самый узкий
          параметр. Если замер попал между двумя размерами, берите больший:
          свободная вещь сидит лучше, чем тесная.
        </p>

        <div className="table-wrap" style={{ marginTop: 32 }}>
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
                  <td>
                    <strong>{row.size}</strong>
                  </td>
                  <td>{row.backLength}</td>
                  <td>{row.chest}</td>
                  <td>{row.neck}</td>
                  <td className="muted">{row.breedsHint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="small muted" style={{ marginTop: 24 }}>
          Породы в таблице — только ориентир. Собаки одной породы бывают очень
          разными, поэтому замеры важнее.
        </p>
      </div>
    </div>
  )
}
