// Отправка писем по SMTP — подходит любой почтовый сервис: Яндекс 360,
// Mail.ru для бизнеса, Unisender, SendPulse и т.д. Настройки — переменные
// SMTP_* в .env (см. .env.example).
//
// Пока SMTP не настроен, письма никуда не уходят: в режиме разработки они
// сохраняются HTML-файлами в папку .outbox (её можно открыть в браузере
// и посмотреть, как выглядит письмо), на проде — только пишутся в лог.
import 'server-only'
import nodemailer from 'nodemailer'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const env = (name, fallback = '') => process.env[name] || fallback

export function mailConfigured() {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD') && env('MAIL_FROM'))
}

let transport = null
function getTransport() {
  if (transport) return transport
  const port = Number(env('SMTP_PORT', '465'))
  transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 — сразу шифрованное соединение, 587 — STARTTLS.
    secure: env('SMTP_SECURE') ? env('SMTP_SECURE') === '1' : port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASSWORD') },
  })
  return transport
}

async function saveToOutbox({ to, subject, html }) {
  const dir = path.join(process.cwd(), '.outbox')
  await mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safe = subject.replace(/[^a-zа-яё0-9№]+/gi, '-').slice(0, 60)
  const file = path.join(dir, `${stamp}-${safe}.html`)
  const header = `<!-- Кому: ${to} | Тема: ${subject} -->\n`
  await writeFile(file, header + html, 'utf8')
  return file
}

// Отправляет письмо. Никогда не бросает исключение наружу: письмо не должно
// ломать оплату или смену статуса заказа — ошибка только пишется в лог.
export async function sendMail({ to, subject, html, text }) {
  if (!to) return false
  try {
    if (!mailConfigured()) {
      if (process.env.NODE_ENV !== 'production') {
        const file = await saveToOutbox({ to, subject, html })
        console.log(`Письмо «${subject}» для ${to} сохранено: ${file}`)
      } else {
        console.warn(`SMTP не настроен — письмо «${subject}» для ${to} не отправлено`)
      }
      return false
    }
    await getTransport().sendMail({ from: env('MAIL_FROM'), to, subject, html, text })
    return true
  } catch (error) {
    console.error(`Не удалось отправить письмо «${subject}» для ${to}:`, error.message)
    return false
  }
}
