'use client'

// Избранное живёт в localStorage, как и корзина: отметить товар можно без
// входа в аккаунт. Храним только id — цены и фото страница избранного
// берёт из базы, чтобы они не устаревали.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'nixdog_favorites_v1'
const FavoritesContext = createContext(null)

export function FavoritesProvider({ children }) {
  const [ids, setIds] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setIds(JSON.parse(raw))
    } catch {
      // Приватный режим или заблокированное хранилище — работаем без сохранения.
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch {
      /* пусто */
    }
  }, [ids, ready])

  const value = useMemo(
    () => ({
      ids,
      ready,
      count: ids.length,
      has: (id) => ids.includes(id),
      toggle: (id) =>
        setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev])),
      remove: (id) => setIds((prev) => prev.filter((x) => x !== id)),
    }),
    [ids, ready]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites должен вызываться внутри FavoritesProvider')
  return context
}
