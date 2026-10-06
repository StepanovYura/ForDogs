'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CloseIcon } from '@/components/Icons'

function plural(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'товар'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'товара'
  return 'товаров'
}

// Параметры адреса из формы фильтров: пустые поля отбрасываем.
function formQuery(form) {
  const params = new URLSearchParams()
  for (const [key, value] of new FormData(form).entries()) {
    const v = String(value).trim()
    if (v) params.append(key, v)
  }
  return params.toString()
}

// Панель фильтров. На компьютере — колонка слева от товаров, на телефоне
// и планшете — выезжающая панель. Выбор галочек сам по себе каталог не
// меняет: пока фильтры не применены, кнопка показывает, сколько товаров
// найдётся («Показать 12 товаров»), а применяются они по нажатию.
export default function CatalogFilters({ facets, filters, resetHref, activeCount }) {
  const router = useRouter()
  const form = useRef(null)
  const [open, setOpen] = useState(false)
  // null — фильтры в форме совпадают с применёнными; число — сколько
  // товаров покажет каталог, если применить то, что выбрано сейчас.
  const [preview, setPreview] = useState(null)
  const [counting, setCounting] = useState(false)
  const applied = useRef('')
  const timer = useRef(null)
  const request = useRef(0)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('catalog:open-filters', show)
    return () => window.removeEventListener('catalog:open-filters', show)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Запоминаем, какие фильтры применены сейчас: с ними сравниваем выбор.
  const filtersKey = JSON.stringify(filters)
  useEffect(() => {
    if (form.current) applied.current = formQuery(form.current)
    setPreview(null)
    setCounting(false)
  }, [filtersKey])

  useEffect(() => () => clearTimeout(timer.current), [])

  function apply() {
    const query = formQuery(form.current)
    setOpen(false)
    setPreview(null)
    router.push(query ? `/catalog?${query}` : '/catalog', { scroll: false })
  }

  // Любое изменение в форме — пересчитываем, сколько товаров найдётся.
  // Запрос уходит с небольшой паузой, чтобы не дёргать сервер на каждую
  // цифру в цене.
  function onChange() {
    clearTimeout(timer.current)
    const query = formQuery(form.current)
    if (query === applied.current) {
      setPreview(null)
      setCounting(false)
      return
    }
    setCounting(true)
    timer.current = setTimeout(async () => {
      const id = ++request.current
      try {
        const response = await fetch(`/api/catalog/count?${query}`)
        const data = await response.json()
        if (id === request.current) setPreview(data.count)
      } catch {
        if (id === request.current) setPreview(null)
      } finally {
        if (id === request.current) setCounting(false)
      }
    }, 250)
  }

  let applyLabel = 'Показать'
  if (counting && preview === null) applyLabel = 'Считаем…'
  else if (preview !== null) applyLabel = preview > 0 ? `Показать ${preview} ${plural(preview)}` : 'Ничего не найдено'

  const checked = (list, value) => list.includes(value)

  return (
    <aside className={open ? 'filters-panel is-open' : 'filters-panel'} aria-label="Фильтры">
      <div className="filters-panel__backdrop" onClick={() => setOpen(false)} />

      {/* key пересоздаёт форму при смене фильтров извне (крестик на плашке,
          «назад» в браузере) — иначе галочки остались бы старыми. */}
      <form
        key={JSON.stringify(filters)}
        ref={form}
        className="filters-panel__body"
        onChange={onChange}
        onInput={onChange}
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        <div className="filters-panel__head">
          <span className="h3" style={{ margin: 0 }}>
            Фильтры
          </span>
          <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Закрыть фильтры">
            <CloseIcon />
          </button>
        </div>

        {/* Категория, поиск и сортировка выбираются в другом месте страницы,
            но должны пережить применение фильтров. */}
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}

        <fieldset className="facet">
          <legend className="facet__title">Цена, ₽</legend>
          <div className="facet__price">
            <input
              type="number"
              name="min"
              inputMode="numeric"
              min="0"
              className="input"
              placeholder={`от ${facets.priceMin}`}
              defaultValue={filters.min || ''}
            />
            <span className="muted">—</span>
            <input
              type="number"
              name="max"
              inputMode="numeric"
              min="0"
              className="input"
              placeholder={`до ${facets.priceMax}`}
              defaultValue={filters.max || ''}
            />
          </div>
        </fieldset>

        {facets.colors.length > 0 && (
          <fieldset className="facet">
            <legend className="facet__title">Цвет</legend>
            <div className="facet__list">
              {facets.colors.map((c) => (
                <label key={c.slug} className="facet__option">
                  <input type="checkbox" name="color" value={c.slug} defaultChecked={checked(filters.colors, c.slug)} />
                  <span className="facet__swatch" style={{ background: c.hex }} />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {facets.sizes.length > 0 && (
          <fieldset className="facet">
            <legend className="facet__title">Размер</legend>
            <div className="facet__sizes">
              {facets.sizes.map((s) => (
                <label key={s} className="facet__size">
                  <input type="checkbox" name="size" value={s} defaultChecked={checked(filters.sizes, s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {facets.tagGroups.map((group) => (
          <fieldset className="facet" key={group.key}>
            <legend className="facet__title">{group.title}</legend>
            <div className="facet__list">
              {group.tags.map((t) => (
                <label key={t.slug} className="facet__option">
                  <input
                    type="checkbox"
                    name={group.key}
                    value={t.slug}
                    defaultChecked={checked(filters.tags[group.key] || [], t.slug)}
                  />
                  {t.title}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <fieldset className="facet">
          <label className="facet__option">
            <input type="checkbox" name="stock" value="1" defaultChecked={filters.inStock} />
            Только в наличии
          </label>
        </fieldset>

        <div className="filters-panel__actions">
          <button type="submit" className="btn btn--block" disabled={preview === 0}>
            {applyLabel}
          </button>
          {activeCount > 0 && (
            <Link href={resetHref} className="link-underline" onClick={() => setOpen(false)}>
              Сбросить фильтры
            </Link>
          )}
        </div>
      </form>
    </aside>
  )
}
