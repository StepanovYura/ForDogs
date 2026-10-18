import Link from 'next/link'
import { formatPrice } from '@/lib/money'
import FavoriteButton from './FavoriteButton'
import { priceRange } from '@/lib/sizes'
import { orderedColors, coverImage } from '@/lib/colors'

// Карточка в сетке каталога. Пока нет фотографий — аккуратная заглушка
// вместо «битой» картинки.
// priority — для карточек, попадающих в первый экран. Остальные грузятся
// лениво: их всё равно не видно, пока страницу не прокрутят.
export default function ProductCard({ product, priority = false }) {
  // Цвета — в порядке из админки; обложка — фото основного (первого) цвета.
  const colors = orderedColors(product.variants)
  const cover = coverImage(product.images, colors)
  const inStock = product.variants?.some((v) => v.stock > 0)
  // Если размеры стоят по-разному — «от самой низкой цены».
  const range = priceRange(product)

  return (
    <div className="card">
      <Link href={`/product/${product.slug}`} className="card__link">
        <div className="card__media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.thumbUrl || cover.url}
              alt={cover.alt || product.title}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
            />
          ) : (
            <div className="card__placeholder">{product.title}</div>
          )}
          {!inStock && <span className="card__sold-out">Нет в наличии</span>}
          {range.discount > 0 && <span className="card__sale">−{range.discount}%</span>}
        </div>
        <h3 className="card__title">{product.title}</h3>
        <div className="card__price">
          {range.min === range.max ? formatPrice(range.min) : `от ${formatPrice(range.min)}`}
          {/* Старая цена — зачёркнутой, рядом с новой. */}
          {range.discount > 0 && <s className="price-old">{formatPrice(range.fullMin)}</s>}
        </div>
        {colors.length > 0 && (
          <div className="card__colors">
            {colors.map((c) => (
              <span key={c.slug} style={{ background: c.hex }} title={c.name} />
            ))}
          </div>
        )}
      </Link>
      {/* Сердечко лежит рядом со ссылкой, а не внутри неё: кнопка внутри
          ссылки — некорректная разметка. */}
      <FavoriteButton productId={product.id} className="fav-btn fav-btn--card" />
    </div>
  )
}
