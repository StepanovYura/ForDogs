'use client'

import ImageUploader from './ImageUploader'
import { photoWarnings } from '@/lib/photoQuality'
import {
  deleteImageAction,
  moveImageAction,
  setImageColorAction,
  deleteProductAction,
  deleteVariantAction,
  setVariantStockAction,
  updateProductAction,
  upsertVariantAction,
} from './actions'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']

// Редактор товара — отдельная страница /admin/products/<id>: основные поля,
// метки, варианты, фотографии.
export default function ProductEditor({ product, categories, tagGroups = [] }) {
  const colors = []
  for (const v of product.variants) {
    if (!colors.some((c) => c.slug === v.colorSlug)) {
      colors.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
    }
  }

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

      {/* ─── Цвета и размеры ─── */}
      <h3 className="h3" style={{ marginTop: 32 }}>
        Цвета и размеры
      </h3>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Цвет</th>
              <th>Размер</th>
              <th>Остаток</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {product.variants.map((variant) => (
              <tr key={variant.id}>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: variant.colorHex,
                      border: '1px solid #ddd',
                      marginRight: 8,
                      verticalAlign: 'middle',
                    }}
                  />
                  {variant.colorName}
                </td>
                <td>{variant.size}</td>
                <td>
                  <form action={setVariantStockAction} className="inline-form">
                    <input type="hidden" name="variantId" value={variant.id} />
                    <input
                      name="stock"
                      className="input"
                      style={{ width: 80 }}
                      defaultValue={variant.stock}
                      inputMode="numeric"
                    />
                    <button type="submit" className="btn btn--ghost btn--sm">
                      ОК
                    </button>
                  </form>
                </td>
                <td>
                  <form action={deleteVariantAction}>
                    <input type="hidden" name="variantId" value={variant.id} />
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

      <form action={upsertVariantAction} className="inline-form" style={{ marginTop: 14 }}>
        <input type="hidden" name="productId" value={product.id} />
        <input name="colorName" className="input" style={{ width: 140 }} placeholder="Бордовый" required />
        <input name="colorSlug" className="input" style={{ width: 120 }} placeholder="burgundy" required />
        <input name="colorHex" type="color" className="input" style={{ width: 56, padding: 4 }} defaultValue="#7b1e2b" />
        <select name="size" className="select" style={{ width: 90 }}>
          {SIZES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input name="stock" className="input" style={{ width: 80 }} placeholder="Остаток" defaultValue={10} />
        <button type="submit" className="btn btn--sm">
          Добавить вариант
        </button>
      </form>

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
                      {!group.legacy && (
                        <>
                          <form action={moveImageAction}>
                            <input type="hidden" name="imageId" value={image.id} />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              className="btn btn--ghost btn--sm"
                              disabled={index === 0}
                              title="Раньше в этой группе"
                            >
                              ↑
                            </button>
                          </form>
                          <form action={moveImageAction}>
                            <input type="hidden" name="imageId" value={image.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              className="btn btn--ghost btn--sm"
                              disabled={index === groupImages.length - 1}
                              title="Позже в этой группе"
                            >
                              ↓
                            </button>
                          </form>
                        </>
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
