'use client'

// Корзина. Гостю — в браузере (войти, чтобы положить товар, не нужно),
// вошедшему — в аккаунте, одна на все устройства. Как это устроено —
// lib/useAccountSync.js.
import { createContext, useContext, useMemo } from 'react'
import { useAccountSync } from '@/lib/useAccountSync'

const STORAGE_KEY = 'nixdog_cart_v1'
const CartContext = createContext(null)

// Строка корзины — размер собаки (variantId) и, у парных вещей, размер
// человека: один и тот же размер собаки с разными размерами человека —
// разные строки.
export function lineKey(item) {
  return item.humanSize ? `${item.variantId}|${item.humanSize}` : item.variantId
}

// Корзина аккаунта + то, что гость положил до входа. Одинаковая строка —
// берём большее количество, а не сумму: скорее всего, это та же вещь.
function mergeCarts(server, guest) {
  const result = [...server]
  for (const item of guest) {
    const index = result.findIndex((i) => lineKey(i) === lineKey(item))
    if (index === -1) result.push(item)
    else result[index] = { ...result[index], quantity: Math.max(result[index].quantity, item.quantity) }
  }
  return result
}

// На сервер — только то, что нужно, чтобы восстановить строку.
const cartToServer = (items) =>
  items.map(({ variantId, humanSize, quantity }) => ({ variantId, humanSize, quantity }))

export function CartProvider({ userId = null, children }) {
  const [items, setItems, ready] = useAccountSync({
    userId,
    storageKey: STORAGE_KEY,
    field: 'cart',
    merge: mergeCarts,
    toServer: cartToServer,
  })

  const value = useMemo(() => {
    // item: { variantId, productSlug, title, colorName, colorHex, size,
    //         humanSize?, priceKopeks, image, quantity, stock }
    function add(item, quantity = 1) {
      setItems((prev) => {
        const key = lineKey(item)
        const found = prev.find((i) => lineKey(i) === key)
        if (found) {
          return prev.map((i) =>
            lineKey(i) === key
              ? { ...i, quantity: Math.min(i.quantity + quantity, item.stock ?? 20) }
              : i
          )
        }
        return [...prev, { ...item, quantity }]
      })
    }

    function setQuantity(key, quantity) {
      setItems((prev) =>
        prev
          .map((i) => (lineKey(i) === key ? { ...i, quantity } : i))
          .filter((i) => i.quantity > 0)
      )
    }

    function remove(key) {
      setItems((prev) => prev.filter((i) => lineKey(i) !== key))
    }

    function clear() {
      setItems([])
    }

    const count = items.reduce((sum, i) => sum + i.quantity, 0)
    const totalKopeks = items.reduce((sum, i) => sum + i.priceKopeks * i.quantity, 0)

    return { items, add, setQuantity, remove, clear, count, totalKopeks, ready }
  }, [items, ready, setItems])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart должен вызываться внутри CartProvider')
  return context
}
