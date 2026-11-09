// «Долями» — партнёрское API (https://partner.dolyame.ru/v1): оплата
// частями, 4 платежа по 25% раз в две недели. Магазин получает всю сумму
// сразу после подтверждения заказа.
//
// Как проходит заказ:
//   1. create — регистрируем заказ, получаем link — адрес формы «Долями»,
//      туда уходит покупатель. Заказ в «Долями» живёт 24 часа;
//   2. покупатель вводит данные, сервис его одобряет (вебхук approved),
//      покупатель вносит первые 25% — они холдируются (wait_for_commit);
//   3. мы подтверждаем заказ методом commit — сами, сразу, как увидели
//      wait_for_commit (на это у магазина 72 часа, иначе заказ отменится);
//   4. committed → completed: первая доля списана, деньги идут магазину.
// Отменить можно только заказ в wait_for_commit (метод cancel), вернуть
// деньги за подтверждённый — методом refund.
//
// Доступ: логин и пароль от менеджера «Долями» (Basic-авторизация) плюс
// mTLS-сертификат из кабинета Т-Бизнеса (T-API → «Выпуск сертификата»).
// Без сертификата запросы до «Долями» просто не доходят. У демо-учётки и
// боевой — разные логины, сертификат один.
//
// Вебхуки «Долями» шлёт на /api/payments/dolyame/webhook. Как и с банком,
// содержимому не верим: проверяем IP отправителя и перечитываем статус
// методом info.
//
// Чеки (54-ФЗ) пробивает сам «Долями» через онлайн-кассу магазина, которую
// подключает менеджер «Долями». Включаются DOLYAME_RECEIPTS=1.
import 'server-only'
import https from 'https'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

const env = (name, fallback = '') => process.env[name] || fallback
const apiUrl = () => env('DOLYAME_API_URL', 'https://partner.dolyame.ru/v1').replace(/\/$/, '')

// Сертификат и ключ — PEM. В переменной окружения их удобнее хранить
// в base64 (одной строкой), но подойдёт и сам PEM; локально можно
// указать путь к файлу: DOLYAME_CERT_PATH / DOLYAME_KEY_PATH.
function pem(name) {
  const path = env(`${name}_PATH`)
  if (path) return readFileSync(path, 'utf8')
  const value = env(name).trim()
  if (!value) return ''
  if (value.startsWith('-----BEGIN')) return value.replace(/\\n/g, '\n')
  return Buffer.from(value, 'base64').toString('utf8')
}

let agent = null
function tlsAgent() {
  if (!agent) {
    agent = new https.Agent({
      cert: pem('DOLYAME_CERT'),
      key: pem('DOLYAME_KEY'),
      passphrase: env('DOLYAME_KEY_PASSPHRASE') || undefined,
      keepAlive: true,
    })
  }
  return agent
}

// fetch в Node не умеет клиентский сертификат, поэтому — https.request.
function call(method, path, body) {
  const url = new URL(`${apiUrl()}${path}`)
  const payload = body ? JSON.stringify(body) : ''
  const auth = Buffer.from(`${env('DOLYAME_LOGIN')}:${env('DOLYAME_PASSWORD')}`).toString('base64')

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        agent: tlsAgent(),
        timeout: 20000,
        headers: {
          Authorization: `Basic ${auth}`,
          'X-Correlation-ID': randomUUID(),
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => (raw += chunk))
        res.on('end', () => {
          let data = null
          try {
            data = raw ? JSON.parse(raw) : {}
          } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300 && data) return resolve(data)
          const details = data?.message || data?.description || data?.error || raw.slice(0, 300)
          const error = new Error(`Долями: ${path} ответил ${res.statusCode}${details ? ` — ${details}` : ''}`)
          error.status = res.statusCode
          reject(error)
        })
      }
    )
    req.on('timeout', () => req.destroy(new Error(`Долями: ${path} — нет ответа`)))
    req.on('error', reject)
    req.end(payload)
  })
}

// Статусы «Долями» → наши. authorized — первая доля захолдирована,
// заказ ждёт нашего commit.
function mapStatus(status) {
  if (['committed', 'completed'].includes(status)) return 'succeeded'
  if (['wait_for_commit', 'waiting_for_commit'].includes(status)) return 'authorized'
  if (['rejected', 'canceled'].includes(status)) return 'canceled'
  return 'pending'
}

const rub = (kopeks) => Math.round(kopeks) / 100

const phoneE164 = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length !== 11) return undefined
  return `+7${digits.slice(1)}`
}

const receiptsOn = () => env('DOLYAME_RECEIPTS') === '1'

// Признак расчёта в чеке. Доставка занимает дольше дня, поэтому по 54-ФЗ
// чеков два: «Предоплата 100%» при оплате и «Полный расчёт» при вручении
// (метод complete_delivery). DOLYAME_RECEIPT_SCHEME=single — один чек
// «Полный расчёт» сразу.
function paymentMethod(stage) {
  if (env('DOLYAME_RECEIPT_SCHEME') === 'single') return 'full_payment'
  return stage === 'delivered' ? 'full_payment' : 'full_prepayment'
}

// Позиции заказа для «Долями»: товары и доставка отдельной строкой.
// Цены — в рублях; сумма позиций обязана совпадать с суммой заказа.
function items(order, stage) {
  const line = (name, priceKopeks, quantity, paymentObject) => ({
    name: name.slice(0, 128),
    quantity,
    price: rub(priceKopeks),
    ...(receiptsOn()
      ? {
          receipt: {
            tax: env('DOLYAME_VAT', 'none'),
            payment_method: paymentMethod(stage),
            payment_object: paymentObject,
            measurement_unit: 'шт',
          },
        }
      : {}),
  })
  return order.items
    .map((item) =>
      line(`${item.titleSnapshot}, ${item.colorSnapshot}, ${item.sizeSnapshot}`, item.priceKopeks, item.quantity, 'commodity')
    )
    .concat(
      order.deliveryKopeks > 0
        ? [line(`Доставка: ${order.deliveryTitle || 'курьерская служба'}`, order.deliveryKopeks, 1, 'service')]
        : []
    )
}

const fiscalization = () => ({ type: receiptsOn() ? 'enabled' : 'disabled' })

const path = (id, method) => `/orders/${encodeURIComponent(id)}/${method}`

const dolyame = {
  label: 'Долями',

  configured: () =>
    Boolean(
      env('DOLYAME_LOGIN') &&
        env('DOLYAME_PASSWORD') &&
        (env('DOLYAME_CERT') || env('DOLYAME_CERT_PATH')) &&
        (env('DOLYAME_KEY') || env('DOLYAME_KEY_PATH'))
    ),

  async createDolyamePayment({ order, notificationUrl, returnUrl }) {
    // Номер заказа в «Долями» — уникальный, до 30 символов. Префикс спасает
    // на демо-учётке, где номера после сброса базы повторяются.
    const id = `${env('DOLYAME_ORDER_PREFIX', 'nixdog_')}${order.number}`.slice(0, 30)
    const data = await call('POST', '/orders/create', {
      order: { id, amount: rub(order.totalKopeks), prepaid_amount: 0, items: items(order, 'paid') },
      fiscalization_settings: fiscalization(),
      client_info: { phone: phoneE164(order.customerPhone), email: order.customerEmail || undefined },
      notification_url: notificationUrl,
      success_url: returnUrl,
      fail_url: returnUrl,
    })
    if (!data.link) throw new Error('Долями не вернули адрес формы оплаты')
    return { id, url: data.link, status: 'pending' }
  },

  async getStatus(id) {
    const data = await call('GET', path(id, 'info'))
    return mapStatus(data.status)
  },

  // Подтверждаем заказ на всю сумму — после этого «Долями» списывает
  // первую долю и переводит деньги магазину.
  async confirm(id, order) {
    try {
      await call('POST', path(id, 'commit'), {
        amount: rub(order.totalKopeks),
        prepaid_amount: 0,
        items: items(order, 'paid'),
        fiscalization_settings: fiscalization(),
      })
    } catch (error) {
      // 422 — заказ уже не в wait_for_commit (например, подтвердили
      // параллельным запросом). Итог всё равно берём из info.
      if (error.status !== 422) throw error
    }
    return dolyame.getStatus(id)
  },

  // cancel у «Долями» работает только в wait_for_commit. Заказ, который
  // покупатель ещё не оплатил, отменяем только у себя: если он всё же
  // оплатит позже, syncOrderPayment увидит authorized у отменённого
  // заказа и снимет холд этим же методом.
  async cancel(id) {
    const status = await dolyame.getStatus(id)
    if (status === 'pending') return 'canceled'
    if (status !== 'authorized') return status
    await call('POST', path(id, 'cancel')).catch(() => {})
    const after = await dolyame.getStatus(id)
    return after === 'authorized' ? null : after
  },

  // Полный возврат подтверждённого заказа. delivered — покупатель уже
  // получил чек «Полный расчёт», возвратный чек должен быть таким же.
  async refund(id, order, { delivered = false } = {}) {
    return call('POST', path(id, 'refund'), {
      amount: rub(order.totalKopeks),
      refunded_prepaid_amount: 0,
      returned_items: items(order, delivered ? 'delivered' : 'paid'),
      fiscalization_settings: fiscalization(),
    })
  },

  // Заказ вручён — «Долями» пробивает чек «Полный расчёт». Нужен только
  // при двух чеках.
  needsDeliveryReceipt: () => receiptsOn() && env('DOLYAME_RECEIPT_SCHEME') !== 'single',

  async completeDelivery(id, order) {
    return call('POST', path(id, 'complete_delivery'), {
      order: { amount: rub(order.totalKopeks), prepaid_amount: 0, items: items(order, 'delivered') },
      fiscalization_settings: fiscalization(),
    })
  },

  // Вебхук: JSON с номером заказа в поле id. Принимаем только с адресов
  // «Долями»; статус потом всё равно перечитываем через info.
  async parseNotification(request) {
    if (env('DOLYAME_WEBHOOK_IP_CHECK') !== '0') {
      const ip = clientIp(request)
      if (!fromDolyame(ip)) throw new Error(`чужой адрес ${ip || 'неизвестен'}`)
    }
    const body = await request.json()
    if (!body?.id) throw new Error('нет id заказа')
    return { paymentId: String(body.id) }
  },

  notificationResponse() {
    return Response.json({ ok: true })
  },
}

// Сети, с которых «Долями» присылает уведомления.
const DOLYAME_NETWORKS = [
  ['91.194.226.0', 23],
  ['91.218.132.0', 22],
  ['212.233.80.0', 22],
]

const ipToInt = (ip) => ip.split('.').reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0

function fromDolyame(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip || '')) return false
  const value = ipToInt(ip)
  return DOLYAME_NETWORKS.some(([network, bits]) => {
    const mask = (~0 << (32 - bits)) >>> 0
    return (value & mask) === (ipToInt(network) & mask)
  })
}

// Сайт стоит за прокси хостинга: адрес отправителя — в X-Real-IP или
// последним в X-Forwarded-For (его дописывает сам прокси, подделать нельзя).
function clientIp(request) {
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim().replace(/^::ffff:/, '')
  const forwarded = (request.headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean)
  return (forwarded[forwarded.length - 1] || '').replace(/^::ffff:/, '')
}

export default dolyame
