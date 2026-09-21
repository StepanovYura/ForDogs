// Единственный экземпляр Prisma Client на процесс.
// В dev-режиме Next.js перезагружает модули — без этого кэша
// открылось бы много лишних подключений к базе.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
