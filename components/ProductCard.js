import Link from 'next/link'
import { formatPrice } from '@/lib/money'
import FavoriteButton from './FavoriteButton'

// Карточка в сетке каталога. Пока нет фотографий — аккуратная заглушка
// вместо «битой» картинки.
// priority — для карточек, попадающих в первый экран. Остальные грузятся
// лениво: их всё равно не видно, пока страницу не прокрутят.
export default function ProductCard({ product, priority = false }) {
  const cover = product.images?.[0]
  const inStock = product.variants?.some((v) => v.stock > 0)

  // Уникальные цвета товара — кружочки под названием.
  const colors = []
  for (const v of product.variants || []) {
    if (!colors.some((c) => c.slug === v.colorSlug)) {
      colors.push({ slug: v.colorSlug, hex: v.colorHex, name: v.colorName })
    }
  }

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
        </div>
        <h3 className="card__title">{product.title}</h3>
        <div className="card__price">{formatPrice(product.priceKopeks)}</div>
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
