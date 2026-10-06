'use client'

import { deleteCategoryAction } from './actions'

export default function DeleteCategoryButton({ id, title, count }) {
  return (
    <form
      action={deleteCategoryAction}
      onSubmit={(event) => {
        const note = count > 0 ? ` Её товары (${count}) останутся в каталоге без категории.` : ''
        if (!window.confirm(`Удалить категорию «${title}»?${note}`)) event.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="link-underline">
        Удалить
      </button>
    </form>
  )
}
