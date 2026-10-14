import { prisma } from '@/lib/prisma'
import ReadMore from '@/components/ReadMore'
import SizeTable from '@/components/SizeTable'
import { compareSizes } from '@/lib/sizes'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Как выбрать размер — NIXDOG STUDIO' }

export default async function SizeGuidePage() {
  const rows = await prisma.sizeGuideRow
    .findMany()
    .then((list) => list.sort((a, b) => compareSizes(a.size, b.size)))
    .catch(() => [])

  return (
    <div className="page section">
      <div style={{ maxWidth: 760 }}>
        <h1 className="h1">Как выбрать размер</h1>

        <ReadMore lines={5}>
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
        </ReadMore>

        <div style={{ marginTop: 32 }}>
          <SizeTable rows={rows} />
        </div>
      </div>
    </div>
  )
}
