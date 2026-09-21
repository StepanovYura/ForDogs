// Клиент ЮKassa. Работаем напрямую с HTTP API — отдельной библиотеки не нужно.
import 'server-only'
import { createHash, randomUUID } from 'crypto'
import { kopeksToAmountString } from './money'

const API = 'https://api.yookassa.ru/v3'

export function yookassaConfigured() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY)
}

function authHeader() {
  const pair = `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
  return `Basic ${Buffer.from(pair).toString('base64')}`
}

// Создаёт платёж и возвращает ссылку, куда нужно отправить покупателя.
export async function createPayment({ order, returnUrl }) {
  if (!yookassaConfigured()) {
    throw new Error(
      'Оплата не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY. Смотрите .env.example.'
    )
  }

  const body = {
    amount: { value: kopeksToAmountString(order.totalKopeks), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: returnUrl },
    description: `Заказ №${order.number} — NIXDOG STUDIO`,
    metadata: { orderId: order.id, orderNumber: String(order.number) },
    // Чек для 54-ФЗ. Если ваш магазин не обязан пробивать чеки через ЮKassa,
    // этот блок можно убрать — платёж создастся и без него.
    receipt: {
      customer: { email: order.customerEmail, phone: order.customerPhone || undefined },
      items: order.items.map((item) => ({
        description: `${item.titleSnapshot}, ${item.colorSnapshot}, ${item.sizeSnapshot}`.slice(0, 128),
        quantity: String(item.quantity),
        amount: { value: kopeksToAmountString(item.priceKopeks), currency: 'RUB' },
        vat_code: 1, // «без НДС»; уточните ставку у своего бухгалтера
        payment_mode: 'full_payment',
        payment_subject: 'commodity',
      })),
    },
  }

  const response = await fetch(`${API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      // Ключ идемпотентности: повторный запрос с тем же ключом не создаст
      // второй платёж. Привязываем его к заказу.
      'Idempotence-Key': createHash('sha256').update(`order:${order.id}`).digest('hex').slice(0, 36),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Ошибка ЮKassa:', data)
    throw new Error(data.description || 'ЮKassa отклонила создание платежа')
  }
  return data
}

// Перепроверка статуса платежа напрямую в ЮKassa.
// Вебхуку доверяем только после такой проверки.
export async function fetchPayment(paymentId) {
  const response = await fetch(`${API}/payments/${paymentId}`, {
    headers: { Authorization: authHeader(), 'Idempotence-Key': randomUUID() },
    cache: 'no-store',
  })
  if (!response.ok) return null
  return response.json()
}
