'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { sendMail } from '@/lib/mail'

// Тестовое письмо на ADMIN_EMAIL: «Настроено» в сводке значит только, что
// переменные заданы, а дойдёт ли письмо — видно лишь по реальной отправке.
export async function sendTestMailAction() {
  await requireAdmin()
  const to = process.env.ADMIN_EMAIL
  let result
  if (!to) {
    result = 'Не задан ADMIN_EMAIL — некуда отправить тестовое письмо'
  } else {
    try {
      await sendMail({
        to,
        subject: 'Тестовое письмо — NIXDOG STUDIO',
        html: '<p>Почта сайта работает: это письмо отправлено из админки NIXDOG STUDIO.</p>',
        text: 'Почта сайта работает: это письмо отправлено из админки NIXDOG STUDIO.',
        throwOnError: true,
      })
      result = `ok:${to}`
    } catch (error) {
      result = `Письмо не отправлено: ${error.message}`
    }
  }
  redirect(`/admin?mail=${encodeURIComponent(result)}`)
}
