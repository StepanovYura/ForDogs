'use client'

import { useRouter } from 'next/navigation'
import { FilterIcon, SearchIcon } from '@/components/Icons'

const SORTS = [
  { value: '', title: 'По умолчанию' },
  { value: 'new', title: 'Сначала новые' },
  { value: 'price-asc', title: 'Сначала дешевле' },
  { value: 'price-desc', title: 'Сначала дороже' },
]

function plural(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}

// Строка над сеткой: поиск по названию, сортировка, количество найденного
// и — на телефоне и планшете — кнопка, открывающая панель фильтров.
export default function CatalogToolbar({ filters, total, activeCount }) {
  const router = useRouter()

  function go(patch) {
    const params = new URLSearchParams(window.location.search)
    params.delete('page')
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const query = params.toString()
    router.push(query ? `/catalog?${query}` : '/catalog', { scroll: false })
  }

  return (
    <div className="toolbar">
      <form
        className="toolbar__search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          go({ q: new FormData(event.currentTarget).get('q')?.toString().trim() })
        }}
      >
        <SearchIcon width={18} height={18} />
        <input
          key={filters.q}
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Поиск по названию"
          aria-label="Поиск по названию"
        />
      </form>

      <div className="toolbar__right">
        <span className="small muted toolbar__count">
          {total} {plural(total)}
        </span>

        <select
          className="toolbar__sort"
          value={filters.sort}
          onChange={(event) => go({ sort: event.target.value })}
          aria-label="Сортировка"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.title}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="toolbar__filters-btn"
          onClick={() => window.dispatchEvent(new Event('catalog:open-filters'))}
        >
          <FilterIcon width={18} height={18} />
          Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}
        </button>
      </div>
    </div>
  )
}
