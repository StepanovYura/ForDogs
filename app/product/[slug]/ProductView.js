'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { formatPrice } from '@/lib/money'
import Accordion from '@/components/Accordion'
import SizeGuideModal from '@/components/SizeGuideModal'
import FavoriteButton from '@/components/FavoriteButton'
import ReadMore from '@/components/ReadMore'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL']
// Порядок цветов на карточке. Из базы варианты приходят отсортированными
// по алфавиту, и первым оказывался бежевый — поэтому задаём порядок явно,
// чтобы по умолчанию выбирался основной цвет модели.
const COLOR_ORDER = ['burgundy', 'beige', 'grey', 'black']

// Рамка фото повторяет пропорции снимка: фото видно целиком и без полей.
// Совсем экзотические пропорции (панорама, «сторис») ограничиваем, чтобы
// рамка не стала вдвое выше экрана, — тогда по краям будет фон.
const DEFAULT_RATIO = 2 / 3
const clampRatio = (r) => Math.min(Math.max(r, 9 / 16), 4 / 3)

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
    return list.sort((a, b) => {
      const ia = COLOR_ORDER.indexOf(a.slug)
      const ib = COLOR_ORDER.indexOf(b.slug)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [product.variants])

  const [color, setColor] = useState(colors[0]?.slug ?? null)
  const [size, setSize] = useState(null)
  const [shot, setShot] = useState(0)
  const [flash, setFlash] = useState('')
  // Пропорции старых фото, у которых размер не записан в базе, узнаём,
  // когда картинка загрузилась.
  const [measured, setMeasured] = useState({})
  const ratioOf = (image) => {
    if (!image) return DEFAULT_RATIO
    const r = image.width && image.height ? image.width / image.height : measured[image.id]
    return clampRatio(r || DEFAULT_RATIO)
  }
  const measure = (image) => (event) => {
    const { naturalWidth: w, naturalHeight: h } = event.currentTarget
    if (!image.width && w && h && !measured[image.id]) {
      setMeasured((prev) => ({ ...prev, [image.id]: w / h }))
    }
  }

  // Размеры выбранного цвета, в привычном порядке XS → XL.
  const sizes = useMemo(() => {
    return product.variants
      .filter((v) => v.colorSlug === color)
      .sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size))
  }, [product.variants, color])

  // Фотографии выбранного цвета, за ними — общие фото товара.
  const gallery = useMemo(() => {
    const byColor = product.images.filter((i) => i.colorSlug === color)
    const common = product.images.filter((i) => !i.colorSlug)
    return [...byColor, ...common]
  }, [product.images, color])

  // Лента фото на телефоне листается пальцем; точки под ней показывают,
  // какое фото сейчас на экране.
  const slider = useRef(null)
  function onSlide() {
    const track = slider.current
    if (!track) return
    setShot(Math.round(track.scrollLeft / track.clientWidth))
  }
  function goToSlide(index) {
    const track = slider.current
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }

  const selectedVariant = sizes.find((v) => v.size === size) || null
  const activeColor = colors.find((c) => c.slug === color)
  const main = gallery[Math.min(shot, Math.max(gallery.length - 1, 0))]

  function changeColor(slug) {
    setColor(slug)
    setSize(null)
    setShot(0)
    slider.current?.scrollTo({ left: 0 })
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
        {/* Компьютер и планшет: превью слева, большое фото справа.
            Лента превью занимает ровно высоту большого фото и прокручивается
            внутри себя — карточка не растёт от количества снимков. */}
        <div className="product__gallery">
          <div className="product__thumbs">
            <div className="product__thumbs-scroll">
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
                    <img src={image.thumbUrl || image.url} alt="" loading="lazy" />
                  </button>
                ))
              ) : (
                <div className="thumb" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="product__main" style={{ '--ratio': ratioOf(main) }}>
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={main.id}
                src={main.url}
                alt={main.alt || product.title}
                fetchPriority="high"
                decoding="async"
                onLoad={measure(main)}
              />
            ) : (
              <div className="card__placeholder">Фото скоро появится</div>
            )}
          </div>
        </div>

        {/* Телефон: фото листаются пальцем, превью не нужны. */}
        <div className="product__slider">
          {/* Все слайды одной высоты — по пропорциям первого фото, иначе
              лента прыгала бы при перелистывании. */}
          <div
            className="slider"
            ref={slider}
            onScroll={onSlide}
            style={{ '--slide-ratio': ratioOf(gallery[0]) }}
          >
            {gallery.length > 0 ? (
              gallery.map((image, index) => (
                <div className="slider__slide" key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt || product.title}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onLoad={index === 0 ? measure(image) : undefined}
                  />
                </div>
              ))
            ) : (
              <div className="slider__slide">
                <div className="card__placeholder">Фото скоро появится</div>
              </div>
            )}
          </div>
          {/* Точки — пока фото немного; дальше они превращаются в бисер,
              и понятнее простой счётчик. */}
          {gallery.length > 10 ? (
            <div className="slider__counter caption">
              {Math.min(shot, gallery.length - 1) + 1} / {gallery.length}
            </div>
          ) : gallery.length > 1 && (
            <div className="slider__dots">
              {gallery.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  aria-label={`Фото ${index + 1}`}
                  aria-current={index === shot}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Правая колонка */}
        <div className="product__side">
          <div className="product__title-row">
            <h1 className="h1">{product.title}</h1>
            <FavoriteButton productId={product.id} className="fav-btn fav-btn--inline" />
          </div>
          <div className="product__price">{formatPrice(product.priceKopeks)}</div>

          {product.description && (
            <ReadMore lines={3} className="muted product__description">
              {product.description}
            </ReadMore>
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
              { title: 'Состав и уход', body: product.composition },
              { title: 'Доставка и возврат', body: product.delivery },
            ]}
          />
        </div>
      </div>
    </>
  )
}
