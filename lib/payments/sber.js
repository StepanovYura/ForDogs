// Сбер: интернет-эквайринг (платёжный шлюз) + оплата по динамическому
// QR-коду СБП.
//
// Как проходит платёж:
//   1. register.do — регистрируем заказ в шлюзе, получаем его id (mdOrder);
//   2. sbp/c2b/qr/dynamic/get.do — просим QR СБП для этого заказа и
//      получаем ссылку https://qr.nspk.ru/... — её и кодируем в QR;
//   3. getOrderStatusExtended.do — узнаём, оплачен ли заказ;
//   4. decline.do — отменяем неоплаченный заказ, когда QR истёк.
//
// Оплата картой — тот же register.do, но без шага 2: шлюз возвращает адрес
// своей платёжной страницы (formUrl), туда и отправляем покупателя. Карту
// он вводит у Сбера, 3-D Secure проходит там же, потом Сбер возвращает его
// на страницу заказа. Данные карты на наш сайт не попадают никогда.
// Сбер присылает уведомления (callback) на /api/payments/sber/webhook, но
// статус мы всё равно перепроверяем запросом getOrderStatusExtended.do.
//
// Чеки по 54-ФЗ: если в личном кабинете Сбера подключена облачная касса,
// включите SBER_FISCALIZATION=1 — тогда вместе с заказом в шлюз уходит
// корзина (orderBundle), и чек пробивается автоматически после оплаты.
//
// ВАЖНО: адаптер написан по публичной документации шлюза. Названия методов,
// формат корзины и коды статусов нужно сверить на тестовом стенде Сбера,
// как только будет тестовый доступ: у разных договоров бывают отличия
// (например, версия ФФД для чеков). Что проверить — в README, раздел 3.
import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

const env = (name, fallback = '') => process.env[name] || fallback

// Тестовый стенд по умолчанию — боевой адрес задаётся явно, чтобы случайно
// не начать принимать настоящие деньги.
const apiUrl = () => env('SBER_API_URL', 'https://3dsec.sberbank.ru/payment/rest').replace(/\/$/, '')

function auth() {
  if (env('SBER_TOKEN')) return { token: env('SBER_TOKEN') }
  return { userName: env('SBER_USERNAME'), password: env('SBER_PASSWORD') }
}

async function call(method, params) {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...auth(), ...params })) {
    if (value !== undefined && value !== null && value !== '') body.set(key, String(value))
  }

  const response = await fetch(`${apiUrl()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error(`Сбер: ${method} ответил ${response.status}`)
  }
  // Ошибку шлюз сообщает полем errorCode, отличным от нуля.
  if (data.errorCode && String(data.errorCode) !== '0') {
    const error = new Error(`Сбер: ${data.errorMessage || 'ошибка'} (${method}, код ${data.errorCode})`)
    error.code = String(data.errorCode)
    throw error
  }
  return data
}

// Статусы заказа в шлюзе (orderStatus):
//   0 — зарегистрирован, не оплачен;  1 — предавторизован;
//   2 — оплачен;  3 — отменён;  4 — возвращён;
//   5 — ждёт подтверждения банка покупателя;  6 — отклонён.
function mapStatus(orderStatus) {
  const s = Number(orderStatus)
  if (s === 2) return 'succeeded'
  if (s === 3 || s === 4 || s === 6) return 'canceled'
  return 'pending'
}

function orderBundle(order) {
  // Позиции чека. taxType 0 — «без НДС»; ставку уточните у бухгалтера
  // (SBER_TAX_TYPE). Единица измерения — «шт» для ФФД 1.05; при ФФД 1.2
  // шлюз ждёт числовой код меры (0 — штуки), см. SBER_MEASURE.
  const measure = env('SBER_MEASURE', 'шт')
  return JSON.stringify({
    customerDetails: {
      email: order.customerEmail,
      phone: order.customerPhone ? order.customerPhone.replace(/\D/g, '') : undefined,
    },
    cartItems: {
      items: order.items.map((item, index) => ({
        positionId: String(index + 1),
        name: `${item.titleSnapshot}, ${item.colorSnapshot}, ${item.sizeSnapshot}`.slice(0, 100),
        quantity: { value: item.quantity, measure },
        itemAmount: item.priceKopeks * item.quantity,
        itemPrice: item.priceKopeks,
        itemCode: item.variantId || `${order.number}-${index + 1}`,
        tax: { taxType: Number(env('SBER_TAX_TYPE', '0')) },
        itemAttributes: {
          attributes: [
            { name: 'paymentMethod', value: '1' }, // полная оплата
            { name: 'paymentObject', value: '1' }, // товар
          ],
        },
      })),
    },
  })
}

// Регистрация заказа в шлюзе — общий первый шаг для QR СБП и для карты.
async function register({ order, expiresAt, notificationUrl, returnUrl }) {
  const ttlSeconds = Math.max(60, Math.round((expiresAt.getTime() - Date.now()) / 1000))
  const fiscal = env('SBER_FISCALIZATION') === '1'

  return call('register.do', {
    // Номер заказа в шлюзе должен быть уникальным навсегда. Префикс
    // спасает на тестовом стенде, где номера после сброса базы повторяются.
    orderNumber: `${env('SBER_ORDER_PREFIX')}${order.number}`,
    amount: order.totalKopeks,
    currency: 643,
    returnUrl,
    failUrl: returnUrl,
    description: `Заказ №${order.number} — NIXDOG STUDIO`.slice(0, 99),
    sessionTimeoutSecs: ttlSeconds,
    email: order.customerEmail,
    phone: order.customerPhone?.replace(/\D/g, ''),
    // Адрес уведомлений для конкретного заказа. Работает, если в Сбере
    // включена опция «динамический callback»; иначе адрес прописывают
    // в личном кабинете, и этот параметр можно выключить.
    dynamicCallbackUrl: env('SBER_DYNAMIC_CALLBACK', '1') === '1' ? notificationUrl : undefined,
    ...(fiscal
      ? { orderBundle: orderBundle(order), taxSystem: env('SBER_TAX_SYSTEM', '1') }
      : {}),
  })
}

const sber = {
  label: 'Сбер (карты и СБП)',

  configured: () => Boolean(env('SBER_TOKEN') || (env('SBER_USERNAME') && env('SBER_PASSWORD'))),

  async createCardPayment(params) {
    const registered = await register(params)
    if (!registered.formUrl) throw new Error('Сбер не вернул адрес платёжной страницы')
    return { id: registered.orderId, url: registered.formUrl, status: 'pending' }
  },

  async createQr(params) {
    const registered = await register(params)
    const mdOrder = registered.orderId
    try {
      const qr = await call('sbp/c2b/qr/dynamic/get.do', {
        mdOrder,
        qrHeight: 400,
        qrWidth: 400,
        qrFormat: 'matrix',
      })
      if (!qr.payload) throw new Error('Сбер не вернул ссылку для QR-кода')
      return { id: mdOrder, url: qr.payload, status: 'pending' }
    } catch (error) {
      // Заказ в шлюзе уже создан — отменяем его, чтобы не висел.
      await call('decline.do', { orderId: mdOrder }).catch(() => {})
      throw error
    }
  },

  async getStatus(id) {
    const data = await call('getOrderStatusExtended.do', { orderId: id })
    return mapStatus(data.orderStatus)
  },

  async cancel(id) {
    // decline.do откажет, если деньги уже пришли, — поэтому после попытки
    // отмены всегда перечитываем статус и верим только ему.
    await call('decline.do', { orderId: id }).catch(() => {})
    const status = await sber.getStatus(id)
    return status === 'pending' ? null : status
  },

  // Уведомление Сбера — GET (иногда POST) с параметрами mdOrder, operation,
  // status и, если включена подпись, checksum.
  async parseNotification(request) {
    const params = new URLSearchParams(request.nextUrl.search)
    if (request.method === 'POST') {
      const text = await request.text()
      for (const [key, value] of new URLSearchParams(text)) params.set(key, value)
    }

    const mdOrder = params.get('mdOrder')
    if (!mdOrder) throw new Error('нет mdOrder')

    const secret = env('SBER_CALLBACK_SECRET')
    if (secret) verifyChecksum(params, secret)

    return { paymentId: mdOrder }
  },

  notificationResponse() {
    return new Response('OK', { status: 200 })
  },
}

// Подпись уведомления (симметричный ключ из личного кабинета Сбера):
// параметры кроме checksum и sign_alias сортируются по имени и склеиваются
// в строку «имя;значение;», от неё считается HMAC-SHA256 в верхнем регистре.
export function verifyChecksum(params, secret) {
  const received = (params.get('checksum') || '').toUpperCase()
  if (!received) throw new Error('нет подписи')

  const data = [...params.entries()]
    .filter(([key]) => key !== 'checksum' && key !== 'sign_alias')
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key};${value};`)
    .join('')
  const expected = createHmac('sha256', secret).update(data, 'utf8').digest('hex').toUpperCase()

  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('неверная подпись')
}

export default sber
