'use client'

import ImageUploader from './ImageUploader'
import { photoWarnings } from '@/lib/photoQuality'
import ConfirmButton from '@/components/admin/ConfirmButton'
import PositionSelect from '@/components/admin/PositionSelect'
import { SIZE_SUGGESTIONS, compareSizes } from '@/lib/sizes'
import {
  addColorAction,
  addSizeAction,
  createFirstVariantAction,
  deleteImageAction,
  deleteProductAction,
  removeColorAction,
  removeSizeAction,
  saveStockAction,
  setImageColorAction,
  setImagePositionAction,
  setSizePriceAction,
  updateColorAction,
  updateProductAction,
} from './actions'

// Формы «добавить размер / цвет» после отправки очищаются, чтобы можно
// было сразу вводить следующий.
const afterSubmitReset = (action) => async (formData) => {
  await action(formData)
  for (const form of document.querySelectorAll('form[data-reset]')) form.reset()
}

// Редактор товара — отдельная страница /admin/products/<id>: основные поля,
// метки, варианты, фотографии.
export default function ProductEditor({ product, categories, tagGroups = [] }) {
  const colors = []
  for (const v of product.variants) {
    if (!colors.some((c) => c.slug === v.colorSlug)) {
      colors.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
    }
  }
  const sizes = [...new Set(product.variants.map((v) => v.size))].sort(compareSizes)
  // Цена размера одна на все цвета — берём с любого варианта этого размера.
  const sizePrice = Object.fromEntries(product.variants.map((v) => [v.size, v.priceKopeks]))
  const variantOf = (colorSlug, size) =>
    product.variants.find((v) => v.colorSlug === colorSlug && v.size === size)

  return (
    <div>
      {/* ─── Основные поля ─── */}
      <form action={updateProductAction}>
        <input type="hidden" name="id" value={product.id} />

        <div className="row-3">
          <div className="field">
            <label>Название</label>
            <input name="title" className="input" defaultValue={product.title} required />
          </div>
          <div className="field">
            <label>Цена, ₽</label>
            <input
              name="price"
              className="input"
              defaultValue={product.priceKopeks / 100}
              inputMode="decimal"
            />
          </div>
          <div className="field">
            <label>Категория</label>
            <select name="categoryId" className="select" defaultValue={product.categoryId || ''}>
              <option value="">— без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Описание</label>
          <textarea name="description" className="textarea" defaultValue={product.description} />
        </div>

        <div className="row-2">
          <div className="field">
            <label>Состав и уход</label>
            <textarea
              name="composition"
              className="textarea"
              defaultValue={product.composition}
            />
          </div>
          <div className="field">
            <label>Доставка и возврат</label>
            <textarea name="delivery" className="textarea" defaultValue={product.delivery} />
          </div>
        </div>

        {/* Метки для фильтров каталога: сезон, назначение, коллекция. */}
        {tagGroups.some((g) => g.tags.length > 0) && (
          <div className="row-3" style={{ marginBottom: 16 }}>
            {tagGroups
              .filter((g) => g.tags.length > 0)
              .map((group) => (
                <div className="field" key={group.key}>
                  <label>{group.title}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
                    {group.tags.map((tag) => (
                      <label className="small" key={tag.id} style={{ whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          name="tagIds"
                          value={tag.id}
                          defaultChecked={product.tags?.some((t) => t.id === tag.id)}
                        />{' '}
                        {tag.title}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
        <input type="hidden" name="tagsEditable" value="1" />

        <div className="inline-form">
          <label className="small">
            <input type="checkbox" name="isActive" defaultChecked={product.isActive} />{' '}
            Показывать в каталоге
          </label>
          <label className="small">
            Порядок{' '}
            <input
              name="position"
              className="input"
              style={{ width: 70, display: 'inline-block' }}
              defaultValue={product.position}
            />
          </label>
          <button type="submit" className="btn btn--sm">
            Сохранить
          </button>
        </div>
      </form>

      {/* ─── Цвета, размеры, цены и остатки ─── */}
      <h3 className="h3" style={{ marginTop: 32 }}>
        Цвета, размеры и остатки
      </h3>

      {colors.length === 0 ? (
        <form action={createFirstVariantAction} className="inline-form">
          <input type="hidden" name="productId" value={product.id} />
          <span className="small muted">Первый цвет и размер:</span>
          <input name="colorName" className="input" style={{ width: 150 }} placeholder="Бордовый" required />
          <input name="colorHex" type="color" className="input" style={{ width: 56, padding: 4 }} defaultValue="#7b1e2b" />
          <input name="size" className="input" style={{ width: 90 }} placeholder="M" list="size-suggestions" required />
          <button type="submit" className="btn btn--sm">
            Добавить
          </button>
        </form>
      ) : (
        <>
          {/* Размеры и их цены */}
          <div className="variant-block">
            <div className="caption">Размеры и цены</div>
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {sizes.map((size) => (
                    <tr key={size}>
                      <td style={{ width: 80 }}>
                        <strong>{size}</strong>
                      </td>
                      <td>
                        <form action={setSizePriceAction} className="inline-form">
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="size" value={size} />
                          <input
                            name="price"
                            className="input"
                            style={{ width: 120 }}
                            inputMode="decimal"
                            defaultValue={sizePrice[size] != null ? sizePrice[size] / 100 : ''}
                            placeholder={`${product.priceKopeks / 100}`}
                            aria-label={`Цена размера ${size}, ₽`}
                          />
                          <span className="small muted">₽</span>
                          <button type="submit" className="btn btn--ghost btn--sm">
                            ОК
                          </button>
                          <span className="small muted">
                            {sizePrice[size] != null ? 'своя цена' : 'как у товара'}
                          </span>
                        </form>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ConfirmButton
                          action={removeSizeAction}
                          fields={{ productId: product.id, size }}
                          confirm={`Убрать размер ${size} во всех цветах?`}
                        >
                          Убрать
                        </ConfirmButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form action={afterSubmitReset(addSizeAction)} data-reset className="inline-form" style={{ marginTop: 10 }}>
              <input type="hidden" name="productId" value={product.id} />
              <input name="size" className="input" style={{ width: 110 }} placeholder="XXL" list="size-suggestions" required />
              <button type="submit" className="btn btn--sm">
                Добавить размер
              </button>
              <span className="small muted">Пустая цена — действует цена товара.</span>
            </form>
          </div>

          {/* Цвета */}
          <div className="variant-block">
            <div className="caption">Цвета</div>
            {colors.map((color) => (
              <div className="inline-form" key={color.slug} style={{ marginBottom: 8 }}>
                <form action={updateColorAction} className="inline-form">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="colorSlug" value={color.slug} />
                  <input
                    name="colorHex"
                    type="color"
                    className="input"
                    style={{ width: 48, padding: 4 }}
                    defaultValue={color.hex}
                    aria-label="Оттенок"
                  />
                  <input name="colorName" className="input" style={{ width: 170 }} defaultValue={color.name} />
                  <button type="submit" className="btn btn--ghost btn--sm">
                    Сохранить
                  </button>
                </form>
                <ConfirmButton
                  action={removeColorAction}
                  fields={{ productId: product.id, colorSlug: color.slug }}
                  confirm={`Убрать цвет «${color.name}» со всеми размерами? Его фото перейдут в «Фото без цвета».`}
                >
                  Убрать
                </ConfirmButton>
              </div>
            ))}
            <form action={afterSubmitReset(addColorAction)} data-reset className="inline-form" style={{ marginTop: 10 }}>
              <input type="hidden" name="productId" value={product.id} />
              <input name="colorHex" type="color" className="input" style={{ width: 48, padding: 4 }} defaultValue="#1c1c1c" />
              <input name="colorName" className="input" style={{ width: 170 }} placeholder="Чёрный" required />
              <button type="submit" className="btn btn--sm">
                Добавить цвет
              </button>
            </form>
          </div>

          {/* Остатки: цвет × размер */}
          <form action={saveStockAction} className="variant-block">
            <input type="hidden" name="productId" value={product.id} />
            <div className="caption">Остатки на складе, шт.</div>
            <div className="table-wrap">
              <table className="table stock-table">
                <thead>
                  <tr>
                    <th>Цвет</th>
                    {sizes.map((size) => (
                      <th key={size}>{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map((color) => (
                    <tr key={color.slug}>
                      <td>
                        <span className="stock-table__swatch" style={{ background: color.hex }} />
                        {color.name}
                      </td>
                      {sizes.map((size) => {
                        const variant = variantOf(color.slug, size)
                        return (
                          <td key={size}>
                            {variant ? (
                              <input
                                name={`stock_${variant.id}`}
                                className="input"
                                style={{ width: 64 }}
                                inputMode="numeric"
                                defaultValue={variant.stock}
                                aria-label={`${color.name}, ${size}`}
                              />
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="submit" className="btn btn--sm" style={{ marginTop: 10 }}>
              Сохранить остатки
            </button>
          </form>
        </>
      )}

      <datalist id="size-suggestions">
        {SIZE_SUGGESTIONS.filter((s) => !sizes.includes(s)).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* ─── Фотографии ─── */}
      <h3 className="h3" style={{ marginTop: 32 }}>
        Фотографии
      </h3>
      <p className="small muted" style={{ marginTop: -6 }}>
        Фотографии привязаны к цвету: покупатель переключает цвет на
        карточке и видит снимки именно этой расцветки. Первое фото цвета —
        главное, оно же обложка в каталоге.
      </p>

      {colors.length === 0 && (
        <p className="small muted">Сначала добавьте цвет и размеры — фото загружаются к цвету.</p>
      )}

      {[
        ...colors,
        // Фото без цвета остались от прежней версии админки: новые так не
        // загружаются. Блок виден, только пока такие фото есть, — их можно
        // перенести к нужному цвету или удалить.
        ...(product.images.some((image) => !image.colorSlug)
          ? [{ slug: null, name: 'Фото без цвета', hex: null, legacy: true }]
          : []),
      ].map((group) => {
        const groupImages = product.images.filter(
          (image) => (image.colorSlug || null) === group.slug
        )

        return (
          <div
            key={group.slug || 'legacy'}
            className="panel"
            style={{ marginTop: 16, background: 'var(--bg-soft)' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 14,
              }}
            >
              {group.hex && (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: group.hex,
                    border: '1px solid var(--line)',
                  }}
                />
              )}
              <strong>{group.name}</strong>
              <span className="small muted">
                {groupImages.length === 0
                  ? 'пока нет фотографий'
                  : `${groupImages.length} шт.`}
              </span>
            </div>

            {group.legacy && (
              <p className="small muted" style={{ marginTop: -6 }}>
                Загружены раньше и сейчас показываются при любом цвете.
                Перенесите каждое к нужному цвету или удалите — после этого блок исчезнет.
              </p>
            )}

            {groupImages.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                {groupImages.map((image, index) => (
                  <div key={image.id}>
                    <div className="card__media" style={{ marginBottom: 6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.thumbUrl || image.url} alt="" loading="lazy" />
                      {index === 0 && !group.legacy && (
                        <span className="card__sold-out">главное</span>
                      )}
                    </div>
                    {photoWarnings(image).length > 0 && (
                      <div className="small" style={{ color: '#8a6d1f', marginBottom: 6 }}>
                        Фото {photoWarnings(image).join('; ')}
                      </div>
                    )}

                    {group.legacy && colors.length > 0 && (
                      <form action={setImageColorAction} className="inline-form" style={{ gap: 6, marginBottom: 6 }}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <select name="colorSlug" className="select" style={{ flex: 1, minWidth: 0 }} defaultValue="">
                          <option value="" disabled>
                            К цвету…
                          </option>
                          {colors.map((c) => (
                            <option key={c.slug} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn btn--ghost btn--sm">
                          ОК
                        </button>
                      </form>
                    )}

                    <div className="inline-form" style={{ gap: 6 }}>
                      {!group.legacy && groupImages.length > 1 && (
                        <PositionSelect
                          action={setImagePositionAction}
                          fields={{ imageId: image.id }}
                          value={index + 1}
                          count={groupImages.length}
                          label="Место фото в ленте цвета"
                        />
                      )}
                      <form action={deleteImageAction}>
                        <input type="hidden" name="imageId" value={image.id} />
                        <button type="submit" className="link-underline">
                          Удалить
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!group.legacy && (
              <ImageUploader productId={product.id} colorSlug={group.slug} colorName={group.name} />
            )}
          </div>
        )
      })}

      {/* ─── Удаление товара ─── */}
      <form
        action={deleteProductAction}
        style={{ marginTop: 32 }}
        onSubmit={(event) => {
          if (!window.confirm(`Удалить «${product.title}» вместе с вариантами и фото?`)) {
            event.preventDefault()
          }
        }}
      >
        <input type="hidden" name="id" value={product.id} />
        <button type="submit" className="btn btn--ghost btn--sm">
          Удалить товар целиком
        </button>
        <span className="small muted" style={{ marginLeft: 10 }}>
          Вместе с вариантами и фото. Отменить нельзя.
        </span>
      </form>
    </div>
  )
}
