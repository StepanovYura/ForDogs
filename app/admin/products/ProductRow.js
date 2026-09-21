'use client'

import { useState } from 'react'
import ImageUploader from './ImageUploader'
import {
  deleteImageAction,
  deleteProductAction,
  deleteVariantAction,
  setVariantStockAction,
  updateProductAction,
  upsertVariantAction,
} from './actions'

const SIZES = ['XS', 'S', 'M', 'L', 'XL']

export default function ProductRow({ product, categories }) {
  const [open, setOpen] = useState(false)

  const colors = []
  for (const v of product.variants) {
    if (!colors.some((c) => c.slug === v.colorSlug)) {
      colors.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
    }
  }

  return (
    <div className="panel">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <strong>{product.title}</strong>
          {!product.isActive && (
            <span className="badge badge--canceled" style={{ marginLeft: 10 }}>
              Скрыт
            </span>
          )}
          <div className="small muted">
            /product/{product.slug} · {(product.priceKopeks / 100).toLocaleString('ru-RU')} ₽ ·
            вариантов: {product.variants.length} · фото: {product.images.length}
          </div>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Редактировать'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 24 }}>
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

          {product.images.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {product.images.map((image) => (
                <div key={image.id}>
                  <div className="card__media" style={{ marginBottom: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.alt} />
                  </div>
                  <div className="small muted">{image.colorSlug || 'общее'}</div>
                  <form action={deleteImageAction}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <button type="submit" className="link-underline">
                      Удалить
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <ImageUploader productId={product.id} colors={colors} />

          {/* ─── Удаление товара ─── */}
          <form action={deleteProductAction} style={{ marginTop: 32 }}>
            <input type="hidden" name="id" value={product.id} />
            <button type="submit" className="btn btn--ghost btn--sm">
              Удалить товар целиком
            </button>
            <span className="small muted" style={{ marginLeft: 10 }}>
              Вместе с вариантами и фото. Отменить нельзя.
            </span>
          </form>
        </div>
      )}
    </div>
  )
}
