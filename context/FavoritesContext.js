'use client'

// Избранное — как и корзина: гостю в браузере, вошедшему — в аккаунте
// (lib/useAccountSync.js). Храним только id — цены и фото страница
// избранного берёт из базы, чтобы они не устаревали.
import { createContext, useContext, useMemo } from 'react'
import { useAccountSync } from '@/lib/useAccountSync'

const STORAGE_KEY = 'nixdog_favorites_v1'
const FavoritesContext = createContext(null)

// Отмеченное гостем до входа — сверху, затем избранное аккаунта.
const mergeFavorites = (server, guest) => [...new Set([...guest, ...server])]

export function FavoritesProvider({ userId = null, children }) {
  const [ids, setIds, ready] = useAccountSync({
    userId,
    storageKey: STORAGE_KEY,
    field: 'favorites',
    merge: mergeFavorites,
  })

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
    [ids, ready, setIds]
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) throw new Error('useFavorites должен вызываться внутри FavoritesProvider')
  return context
}
