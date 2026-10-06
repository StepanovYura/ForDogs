'use client'

import { useFavorites } from '@/context/FavoritesContext'
import { HeartIcon } from './Icons'

// Сердечко «в избранное». Внутри карточки каталога оно лежит поверх ссылки
// на товар, поэтому клик не должен уводить на страницу товара.
export default function FavoriteButton({ productId, className = 'fav-btn' }) {
  const { has, toggle, ready } = useFavorites()
  const active = ready && has(productId)

  return (
    <button
      type="button"
      className={className}
      aria-pressed={active}
      aria-label={active ? 'Убрать из избранного' : 'В избранное'}
      title={active ? 'Убрать из избранного' : 'В избранное'}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle(productId)
      }}
    >
      <HeartIcon filled={active} />
    </button>
  )
}
