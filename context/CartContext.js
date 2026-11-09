'use client'

// Корзина живёт в localStorage браузера — войти, чтобы положить товар,
// не нужно. Авторизация требуется только на шаге оплаты.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'nixdog_cart_v1'
const CartContext = createContext(null)

// Строка корзины — размер собаки (variantId) и, у парных вещей, размер
// человека: один и тот же размер собаки с разными размерами человека —
// разные строки.
export function lineKey(item) {
  return item.humanSize ? `${item.variantId}|${item.humanSize}` : item.variantId
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // Приватный режим или заблокированное хранилище — работаем без сохранения.
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* пусто */
    }
  }, [items, ready])

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
  }, [items, ready])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart должен вызываться внутри CartProvider')
  return context
}
