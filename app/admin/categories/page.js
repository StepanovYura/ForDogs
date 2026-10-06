import { prisma } from '@/lib/prisma'
import DeleteCategoryButton from './DeleteCategoryButton'
import {
  createCategoryAction,
  moveCategoryAction,
  renameCategoryAction,
} from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { title: 'asc' }],
    include: { _count: { select: { products: true } } },
  })

  return (
    <>
      <p className="muted">
        Категории каталога — в этом порядке они идут в каталоге, меню и подвале.
        Категорию товара выбирают на странице товара. Раздел «Все» есть всегда.
      </p>

      <div className="panel">
        {categories.length === 0 ? (
          <p className="small muted">Категорий пока нет.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category.id}>
                    <td>
                      <form action={renameCategoryAction} className="inline-form">
                        <input type="hidden" name="id" value={category.id} />
                        <input name="title" className="input" defaultValue={category.title} style={{ width: 240 }} />
                        <button type="submit" className="btn btn--ghost btn--sm">
                          Сохранить
                        </button>
                      </form>
                    </td>
                    <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                      товаров: {category._count.products}
                    </td>
                    <td>
                      <div className="inline-form" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <form action={moveCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button type="submit" className="btn btn--ghost btn--sm" disabled={index === 0} title="Выше">
                            ↑
                          </button>
                        </form>
                        <form action={moveCategoryAction}>
                          <input type="hidden" name="id" value={category.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            className="btn btn--ghost btn--sm"
                            disabled={index === categories.length - 1}
                            title="Ниже"
                          >
                            ↓
                          </button>
                        </form>
                      </div>
                    </td>
                    <td>
                      <DeleteCategoryButton id={category.id} title={category.title} count={category._count.products} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={createCategoryAction} className="inline-form" style={{ marginTop: 16 }}>
          <input name="title" className="input" style={{ width: 240 }} placeholder="Новая категория" required />
          <button type="submit" className="btn btn--sm">
            Добавить
          </button>
        </form>
      </div>
    </>
  )
}
