import { prisma } from '@/lib/prisma'
import { TAG_GROUPS } from '@/lib/tags'
import { createTagAction, deleteTagAction, renameTagAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { products: true } } },
  })

  return (
    <>
      <p className="muted">
        Метки для фильтров каталога. Отметить товар — в разделе «Товары» → «Редактировать».
        В каталоге группа появляется, когда в ней есть хотя бы одна метка с товарами.
      </p>

      {TAG_GROUPS.map((group) => {
        const groupTags = tags.filter((t) => t.group === group.key)
        return (
          <div className="panel" key={group.key}>
            <h2 className="h3">{group.title}</h2>

            {groupTags.length === 0 ? (
              <p className="small muted">Меток пока нет.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {groupTags.map((tag) => (
                      <tr key={tag.id}>
                        <td>
                          <form action={renameTagAction} className="inline-form">
                            <input type="hidden" name="id" value={tag.id} />
                            <input name="title" className="input" defaultValue={tag.title} style={{ width: 220 }} />
                            <button type="submit" className="btn btn--ghost btn--sm">
                              Сохранить
                            </button>
                          </form>
                        </td>
                        <td className="small muted">товаров: {tag._count.products}</td>
                        <td>
                          <form action={deleteTagAction}>
                            <input type="hidden" name="id" value={tag.id} />
                            <button type="submit" className="link-underline">
                              Удалить
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form action={createTagAction} className="inline-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="group" value={group.key} />
              <input
                name="title"
                className="input"
                style={{ width: 220 }}
                placeholder={group.key === 'collection' ? 'Например: Осень 2026' : 'Новая метка'}
                required
              />
              <button type="submit" className="btn btn--sm">
                Добавить
              </button>
            </form>
          </div>
        )
      })}
    </>
  )
}
