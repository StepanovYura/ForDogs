// Эмулятор банка для разработки: ведёт себя как настоящий СБП-эквайринг,
// только «приложение банка» — страница /dev/bank/<id> на этом же сайте.
// Там можно оплатить или отклонить платёж, и эмулятор пришлёт уведомление
// на вебхук так же, как это делает банк.
//
// Платежи хранятся в памяти процесса: после перезапуска dev-сервера
// неоплаченные QR просто истекут по таймеру.
import 'server-only'
import { randomUUID } from 'crypto'

const payments = (globalThis.__mockSbpPayments ??= new Map())

function getStatus(id) {
  return payments.get(id)?.status || 'pending'
}

function setStatus(id, status) {
  const payment = payments.get(id)
  if (!payment || payment.status !== 'pending') return getStatus(id)
  payment.status = status
  return status
}

function createMockPayment(method, { order, expiresAt, notificationUrl, returnUrl }) {
  const id = `mock_${randomUUID()}`
  payments.set(id, {
    method,
    status: 'pending',
    amountKopeks: order.totalKopeks,
    orderNumber: order.number,
    expiresAt,
    notificationUrl,
    returnUrl,
  })
  const site = new URL(returnUrl).origin
  return { id, url: `${site}/dev/bank/${id}`, status: 'pending' }
}

const mock = {
  label: 'Эмулятор банка (только для разработки)',

  // В боевой сборке эмулятор выключен: иначе любой мог бы «оплатить» заказ
  // кнопкой на /dev/bank и получить товар бесплатно. Для показа заказчику на
  // тестовом стенде его можно включить явно: SBP_MOCK_IN_PRODUCTION=1.
  configured: () =>
    process.env.NODE_ENV !== 'production' || process.env.SBP_MOCK_IN_PRODUCTION === '1',

  // У эмулятора оба способа ведут на одну страницу «банка»: настоящий
  // банк на QR вернул бы https://qr.nspk.ru/..., на карту — адрес своей
  // платёжной страницы.
  async createQr(params) {
    return createMockPayment('sbp', params)
  },

  async createCardPayment(params) {
    return createMockPayment('card', params)
  },

  async getStatus(id) {
    return getStatus(id)
  },


  async cancel(id) {
    return setStatus(id, 'canceled')
  },

  async parseNotification(request) {
    const body = await request.json()
    if (!body?.paymentId) throw new Error('нет paymentId')
    return { paymentId: body.paymentId }
  },

  notificationResponse() {
    return Response.json({ ok: true })
  },
}

export default mock

// ─── Действия «покупателя в приложении банка» для страницы /dev/bank ───

export function getMockPayment(id) {
  const payment = payments.get(id)
  if (!payment) return null
  const expired = payment.status === 'pending' && payment.expiresAt.getTime() < Date.now()
  return { id, ...payment, status: expired ? 'expired' : payment.status }
}

export async function resolveMockPayment(id, status) {
  const payment = getMockPayment(id)
  if (!payment || payment.status !== 'pending') return
  setStatus(id, status)

  // Как настоящий банк: уведомление уходит на вебхук магазина отдельным
  // HTTP-запросом, а не вызовом функции.
  await fetch(payment.notificationUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId: id, status }),
    cache: 'no-store',
  }).catch((error) => console.error('Эмулятор СБП: вебхук не доставлен', error.message))
}
