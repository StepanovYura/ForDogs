'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/money'
import Accordion from '@/components/Accordion'
import SizeGuideModal from '@/components/SizeGuideModal'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL']

export default function ProductView({ product, sizeGuide }) {
  const router = useRouter()
  const { add } = useCart()

  // Уникальные цвета в порядке появления вариантов.
  const colors = useMemo(() => {
    const list = []
    for (const v of product.variants) {
      if (!list.some((c) => c.slug === v.colorSlug)) {
        list.push({ slug: v.colorSlug, name: v.colorName, hex: v.colorHex })
      }
    }
    return list
  }, [product.variants])

  const [color, setColor] = useState(colors[0]?.slug ?? null)
  const [size, setSize] = useState(null)
  const [shot, setShot] = useState(0)
  const [flash, setFlash] = useState('')

  // Размеры выбранного цвета, в привычном порядке XS → XL.
  const sizes = useMemo(() => {
    return product.variants
      .filter((v) => v.colorSlug === color)
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
  }, [product.variants, color])

  // Фото: сначала снимки выбранного цвета, затем общие.
  const gallery = useMemo(() => {
    const byColor = product.images.filter((i) => i.colorSlug === color)
    const common = product.images.filter((i) => !i.colorSlug)
    return byColor.length ? [...byColor, ...common] : product.images
  }, [product.images, color])

  const selectedVariant = sizes.find((v) => v.size === size) || null
  const activeColor = colors.find((c) => c.slug === color)
  const main = gallery[Math.min(shot, Math.max(gallery.length - 1, 0))]

  function changeColor(slug) {
    setColor(slug)
    setSize(null)
    setShot(0)
  }

  function addToCart(thenCheckout = false) {
    if (!selectedVariant) {
      setFlash('Выберите размер')
      return
    }
    add(
      {
        variantId: selectedVariant.id,
        productSlug: product.slug,
        title: product.title,
        colorName: selectedVariant.colorName,
        colorHex: selectedVariant.colorHex,
        size: selectedVariant.size,
        priceKopeks: product.priceKopeks,
        image: main?.url || '',
        stock: selectedVariant.stock,
      },
      1
    )
    if (thenCheckout) router.push('/cart')
    else setFlash('Добавлено в корзину')
  }

  return (
    <>
      <div className="product">
        {/* Миниатюры слева */}
        <div className="product__thumbs">
          {gallery.length > 0 ? (
            gallery.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className="thumb"
                aria-current={index === shot}
                onClick={() => setShot(index)}
                aria-label={`Фото ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" />
              </button>
            ))
          ) : (
            <div className="thumb" aria-hidden="true" />
          )}
        </div>

        {/* Основное фото */}
        <div className="product__main">
          {main ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={main.url} alt={main.alt || product.title} />
          ) : (
            <div className="card__placeholder">Фото скоро появится</div>
          )}
        </div>

        {/* Правая колонка */}
        <div className="product__side">
          <h1 className="h1">{product.title}</h1>
          <div className="product__price">{formatPrice(product.priceKopeks)}</div>

          {product.description && (
            <p className="muted" style={{ marginTop: 0 }}>
              {product.description}
            </p>
          )}

          {colors.length > 0 && (
            <div className="option-group">
              <div className="option-group__label">
                Цвет: {activeColor?.name}
              </div>
              <div className="swatches">
                {colors.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    className="swatch"
                    style={{ background: c.hex }}
                    aria-pressed={c.slug === color}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => changeColor(c.slug)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="option-group">
            <div className="option-group__label">Размер:</div>
            <div className="sizes">
              {sizes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="size"
                  aria-pressed={v.size === size}
                  disabled={v.stock <= 0}
                  title={v.stock <= 0 ? 'Нет в наличии' : `В наличии: ${v.stock}`}
                  onClick={() => {
                    setSize(v.size)
                    setFlash('')
                  }}
                >
                  {v.size}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <SizeGuideModal rows={sizeGuide} />
            </div>
          </div>

          {flash && (
            <div className={flash === 'Выберите размер' ? 'form-error' : 'form-ok'}>
              {flash}
              {flash !== 'Выберите размер' && (
                <>
                  {' — '}
                  <Link href="/cart" style={{ textDecoration: 'underline' }}>
                    перейти в корзину
                  </Link>
                </>
              )}
            </div>
          )}

          <div className="buy-row">
            <button type="button" className="btn btn--block" onClick={() => addToCart(false)}>
              Добавить в корзину
            </button>
          </div>

          {selectedVariant && selectedVariant.stock <= 3 && selectedVariant.stock > 0 && (
            <p className="small muted" style={{ marginTop: 0 }}>
              Осталось {selectedVariant.stock} шт.
            </p>
          )}

          <Accordion
            items={[
              { title: 'Описание', body: product.description },
              { title: 'Состав и уход', body: product.composition },
              { title: 'Доставка и возврат', body: product.delivery },
            ]}
          />
        </div>
      </div>

      {/* Плитки с деталями — как в референсе */}
      {gallery.length > 1 && (
        <div className="detail-grid">
          {gallery.slice(1, 4).map((image, index) => (
            <div key={image.id}>
              <div className="detail-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt || product.title} loading="lazy" />
              </div>
              <div className="detail-caption caption">
                {image.alt || ['Вид сзади', 'Детали', 'Манжеты'][index]}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
