'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createSessionToken, sessionCookie } from '@/lib/session'
import { loginSchema, registerSchema } from '@/lib/validation'

// Открытый редирект — дыра, поэтому разрешаем только внутренние адреса.
function safeNext(value) {
  if (typeof value !== 'string') return '/'
  if (!value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

async function startSession(user) {
  const token = await createSessionToken(user)
  cookies().set(sessionCookie.name, token, sessionCookie.options)
}

export async function loginAction(_prevState, formData) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  // Одинаковый текст для «нет такого email» и «неверный пароль» —
  // чтобы нельзя было перебором узнать, кто зарегистрирован.
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash))
  if (!ok) {
    return { error: 'Неверный email или пароль' }
  }

  await startSession(user)
  redirect(safeNext(formData.get('next')))
}

export async function registerAction(_prevState, formData) {
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name') || '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) {
    return { error: 'Пользователь с таким email уже зарегистрирован' }
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name || null,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
    },
  })

  await startSession(user)
  redirect(safeNext(formData.get('next')))
}

export async function logoutAction() {
  cookies().delete(sessionCookie.name)
  redirect('/')
}
