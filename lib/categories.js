// Список категорий нужен в шапке и подвале, то есть на каждой странице,
// а меняется он раз в месяц. Держим его в кэше, чтобы не ходить в базу
// на каждый запрос — включая служебные предзагрузки от Next.js.
import 'server-only'
import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

export const getCategories = unstable_cache(
  async () => {
    try {
      return await prisma.category.findMany({ orderBy: { position: 'asc' } })
    } catch {
      // База недоступна — пусть сайт откроется без меню категорий,
      // а не упадёт целиком.
      return []
    }
  },
  ['categories'],
  { revalidate: 300, tags: ['categories'] }
)
