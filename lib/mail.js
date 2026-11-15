// Отправка писем.
//
// На проде — Yandex Cloud Postbox по HTTPS API (совместим с Amazon SES):
// хостинг ONREZA закрывает SMTP-порты, поэтому обычная почта отсюда не
// уходит. Переменные POSTBOX_* (см. .env.example).
// Локально можно по-прежнему слать через SMTP — переменные SMTP_*.
//
// Отправитель — адрес на домене сайта (MAIL_FROM), ответы покупателей
// уходят на MAIL_REPLY_TO — например, ящик магазина на mail.ru.
//
// Пока почта не настроена, письма никуда не уходят: в режиме разработки они
// сохраняются HTML-файлами в папку .outbox (её можно открыть в браузере
// и посмотреть, как выглядит письмо), на проде — только пишутся в лог.
import 'server-only'
import nodemailer from 'nodemailer'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const env = (name, fallback = '') => process.env[name] || fallback

const postboxConfigured = () => Boolean(env('POSTBOX_ACCESS_KEY_ID') && env('POSTBOX_SECRET_ACCESS_KEY'))
const smtpConfigured = () => Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD'))

export function mailConfigured() {
  return Boolean(env('MAIL_FROM') && (postboxConfigured() || smtpConfigured()))
}

let postbox = null
function getPostbox() {
  if (!postbox) {
    postbox = new SESv2Client({
      region: 'ru-central1',
      endpoint: env('POSTBOX_ENDPOINT', 'https://postbox.cloud.yandex.net'),
      credentials: {
        accessKeyId: env('POSTBOX_ACCESS_KEY_ID'),
        secretAccessKey: env('POSTBOX_SECRET_ACCESS_KEY'),
      },
    })
  }
  return postbox
}

async function sendViaPostbox({ to, subject, html, text }) {
  const replyTo = env('MAIL_REPLY_TO')
  await getPostbox().send(
    new SendEmailCommand({
      FromEmailAddress: env('MAIL_FROM'),
      Destination: { ToAddresses: [to] },
      ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: html, Charset: 'UTF-8' },
            ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
          },
        },
      },
    })
  )
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
// throwOnError — для тестового письма из админки: там нужна сама ошибка.
export async function sendMail({ to, subject, html, text, throwOnError = false }) {
  if (!to) return false
  try {
    if (!mailConfigured()) {
      if (process.env.NODE_ENV !== 'production') {
        const file = await saveToOutbox({ to, subject, html })
        console.log(`Письмо «${subject}» для ${to} сохранено: ${file}`)
      } else {
        console.warn(`Почта не настроена — письмо «${subject}» для ${to} не отправлено`)
      }
      if (throwOnError) throw new Error('Почта не настроена: нужны MAIL_FROM и POSTBOX_* (или SMTP_*)')
      return false
    }
    if (postboxConfigured()) {
      await sendViaPostbox({ to, subject, html, text })
    } else {
      const replyTo = env('MAIL_REPLY_TO') || undefined
      await getTransport().sendMail({ from: env('MAIL_FROM'), to, replyTo, subject, html, text })
    }
    return true
  } catch (error) {
    console.error(`Не удалось отправить письмо «${subject}» для ${to}:`, error.message)
    if (throwOnError) throw error
    return false
  }
}
