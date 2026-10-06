'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFavorites } from '@/context/FavoritesContext'
import ProductCard from '@/components/ProductCard'

export default function FavoritesView() {
  const { ids, ready } = useFavorites()
  const [products, setProducts] = useState(null)

  // Перезапрашиваем только при смене состава: снятое сердечко просто
  // прячет карточку, без лишнего похода на сервер.
  const key = [...ids].sort().join(',')
  useEffect(() => {
    if (!ready) return
    if (!key) {
      setProducts([])
      return
    }
    let cancelled = false
    fetch(`/api/favorites?ids=${encodeURIComponent(ids.join(','))}`)
      .then((r) => r.json())
      .then((data) => !cancelled && setProducts(data.products || []))
      .catch(() => !cancelled && setProducts([]))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key])

  if (!ready || products === null) return <p className="muted">Загружаем…</p>

  const visible = products.filter((p) => ids.includes(p.id))

  if (visible.length === 0) {
    return (
      <div className="empty">
        <p>Здесь будут товары, отмеченные сердечком.</p>
        <Link href="/catalog" className="btn">
          В каталог
        </Link>
      </div>
    )
  }

  return (
    <div className="grid-products">
      {visible.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
