// Т-Банк: интернет-эквайринг (API v2) — оплата картой на платёжной
// странице банка и по динамическому QR-коду СБП.
//
// Как проходит платёж:
//   1. Init — регистрируем платёж, получаем PaymentId и PaymentURL —
//      адрес платёжной страницы Т-Банка (карта, СБП, T-Pay);
//   2. для СБП — GetQr: получаем ссылку https://qr.nspk.ru/... для QR-кода
//      на нашей странице заказа;
//   3. GetState — узнаём статус; Cancel — отменяем неоплаченный платёж.
// Т-Банк присылает уведомления на /api/payments/tbank/webhook, но статус
// мы всё равно перепроверяем запросом GetState.
//
// Данные карты вводятся только на странице Т-Банка — на наш сайт они не
// попадают никогда.
//
// Чеки (54-ФЗ): если к терминалу в личном кабинете Т-Бизнеса подключена
// онлайн-касса, включите TBANK_RECEIPTS=1 — тогда в Init уходит чек
// (Receipt) с товарами заказа, и после оплаты касса пробивает его сама.
//
// ВАЖНО: адаптер написан по публичной документации Т-Банка. Перед запуском
// пройдите тестовые сценарии в личном кабинете на тестовом терминале
// (TerminalKey вида ...DEMO) — что проверить, описано в README, раздел 3.
import 'server-only'
import { createHash, timingSafeEqual } from 'crypto'

const env = (name, fallback = '') => process.env[name] || fallback
const apiUrl = () => env('TBANK_API_URL', 'https://securepay.tinkoff.ru/v2').replace(/\/$/, '')

// Подпись запроса (Token): берём параметры верхнего уровня без вложенных
// объектов (Receipt, DATA) и без самого Token, добавляем Password,
// сортируем по имени ключа, склеиваем значения и считаем SHA-256.
export function makeToken(params, password) {
  const flat = { ...params, Password: password }
  return createHash('sha256')
    .update(
      Object.keys(flat)
        .filter((key) => key !== 'Token' && flat[key] !== undefined && flat[key] !== null)
        .filter((key) => typeof flat[key] !== 'object')
        .sort()
        .map((key) => String(flat[key]))
        .join(''),
      'utf8'
    )
    .digest('hex')
}

async function call(method, params) {
  const body = { TerminalKey: env('TBANK_TERMINAL_KEY'), ...params }
  body.Token = makeToken(body, env('TBANK_PASSWORD'))

  const response = await fetch(`${apiUrl()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) throw new Error(`Т-Банк: ${method} ответил ${response.status}`)
  if (!data.Success || (data.ErrorCode && data.ErrorCode !== '0')) {
    const error = new Error(
      `Т-Банк: ${data.Message || 'ошибка'}${data.Details ? ` (${data.Details})` : ''} — ${method}, код ${data.ErrorCode}`
    )
    error.code = data.ErrorCode
    throw error
  }
  return data
}

// Статусы платежа Т-Банка → наши.
const SUCCEEDED = ['CONFIRMED']
const CANCELED = ['CANCELED', 'DEADLINE_EXPIRED', 'REJECTED', 'AUTH_FAIL', 'REVERSED', 'REFUNDED']

function mapStatus(status) {
  if (SUCCEEDED.includes(status)) return 'succeeded'
  if (CANCELED.includes(status)) return 'canceled'
  return 'pending'
}

const phoneE164 = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return undefined
  return `+${digits.startsWith('8') && digits.length === 11 ? `7${digits.slice(1)}` : digits}`
}

// Чек для онлайн-кассы. Суммы — в копейках; сумма позиций обязана
// совпадать с суммой платежа.
function receipt(order) {
  const ffd12 = env('TBANK_FFD_VERSION', '1.05') === '1.2'
  return {
    Email: order.customerEmail,
    Phone: phoneE164(order.customerPhone),
    Taxation: env('TBANK_TAXATION', 'usn_income'),
    ...(ffd12 ? { FfdVersion: '1.2' } : {}),
    Items: order.items.map((item) => ({
      Name: `${item.titleSnapshot}, ${item.colorSnapshot}, ${item.sizeSnapshot}`.slice(0, 128),
      Price: item.priceKopeks,
      Quantity: item.quantity,
      Amount: item.priceKopeks * item.quantity,
      Tax: env('TBANK_VAT', 'none'),
      PaymentMethod: 'full_payment',
      PaymentObject: 'commodity',
      ...(ffd12 ? { MeasurementUnit: 'шт' } : {}),
    })),
  }
}

// Init — общий первый шаг для карты и для СБП.
async function init({ order, expiresAt, notificationUrl, returnUrl }) {
  return call('Init', {
    Amount: order.totalKopeks,
    // Номер заказа в банке должен быть уникальным. Префикс спасает на
    // тестовом терминале, где номера после сброса базы повторяются.
    OrderId: `${env('TBANK_ORDER_PREFIX')}${order.number}`,
    Description: `Заказ №${order.number} — NIXDOG STUDIO`.slice(0, 140),
    NotificationURL: notificationUrl,
    SuccessURL: returnUrl,
    FailURL: returnUrl,
    // До какого момента действует ссылка на оплату: совпадает с резервом
    // товаров на нашей стороне.
    RedirectDueDate: expiresAt.toISOString().replace(/\.\d{3}Z$/, '+00:00'),
    DATA: { Email: order.customerEmail, Phone: phoneE164(order.customerPhone) },
    ...(env('TBANK_RECEIPTS') === '1' ? { Receipt: receipt(order) } : {}),
  })
}

const tbank = {
  label: 'Т-Банк (карты, СБП, Долями)',

  configured: () => Boolean(env('TBANK_TERMINAL_KEY') && env('TBANK_PASSWORD')),

  async createCardPayment(params) {
    const payment = await init(params)
    if (!payment.PaymentURL) throw new Error('Т-Банк не вернул адрес платёжной страницы')
    return { id: String(payment.PaymentId), url: payment.PaymentURL, status: 'pending' }
  },

  // «Долями» — тот же платёж на платёжной странице Т-Банка: покупатель
  // выбирает там «Долями» и оформляет оплату частями. Способ должен быть
  // подключён к терминалу (это делает менеджер банка).
  async createDolyamePayment(params) {
    return tbank.createCardPayment(params)
  },

  async createQr(params) {
    const payment = await init(params)
    const paymentId = String(payment.PaymentId)
    try {
      const qr = await call('GetQr', { PaymentId: paymentId, DataType: 'PAYLOAD' })
      if (!qr.Data) throw new Error('Т-Банк не вернул ссылку для QR-кода')
      return { id: paymentId, url: qr.Data, status: 'pending' }
    } catch (error) {
      // Платёж в банке уже создан — отменяем его, чтобы не висел.
      await call('Cancel', { PaymentId: paymentId }).catch(() => {})
      throw error
    }
  },

  async getStatus(id) {
    const data = await call('GetState', { PaymentId: id })
    return mapStatus(data.Status)
  },

  async cancel(id) {
    // Cancel откажет, если деньги уже списаны, — поэтому после попытки
    // всегда перечитываем статус и верим только ему.
    await call('Cancel', { PaymentId: id }).catch(() => {})
    const status = await tbank.getStatus(id)
    return status === 'pending' ? null : status
  },

  // Уведомление Т-Банка — POST с JSON. Проверяем подпись Token тем же
  // способом, что и для запросов (булевы значения — строками true/false).
  async parseNotification(request) {
    const body = await request.json()
    if (!body?.PaymentId) throw new Error('нет PaymentId')
    if (body.TerminalKey !== env('TBANK_TERMINAL_KEY')) throw new Error('чужой терминал')

    const expected = Buffer.from(makeToken(body, env('TBANK_PASSWORD')))
    const received = Buffer.from(String(body.Token || ''))
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new Error('неверная подпись')
    }
    return { paymentId: String(body.PaymentId) }
  },

  // Т-Банк ждёт в ответ ровно «OK», иначе будет повторять уведомление.
  notificationResponse() {
    return new Response('OK', { status: 200 })
  },
}

export default tbank
