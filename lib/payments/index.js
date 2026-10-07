// Оплата через СБП. Сайт работает только с этим модулем, а не с банком
// напрямую: банк подключается отдельным адаптером в lib/payments/<банк>.js,
// и его смена не трогает ни оформление заказа, ни страницу оплаты.
//
// Способы оплаты:
//   sbp  — динамический QR СБП, показываем его на странице заказа;
//   card — банковская карта на платёжной странице банка. Данные карты
//          вводятся только там: ни сайт, ни его база их не видят, поэтому
//          и украсть их у нас нельзя (стандарт PCI DSS, вариант SAQ A).
//
// Адаптер банка — объект с методами:
//   configured()                 — заданы ли ключи в окружении
//   createQr({ order, expiresAt, notificationUrl, returnUrl })
//                                → { id, url, status } — динамический QR СБП
//   createCardPayment({ ...те же параметры })
//                                → { id, url, status } — url ведёт на
//                                  платёжную страницу банка
//   getStatus(id)                → 'pending' | 'succeeded' | 'canceled'
//   cancel(id)                   → итоговый статус после попытки отозвать QR
//   parseNotification(request)   → { paymentId } — проверяет подпись банка
//   notificationResponse()       → ответ, которого банк ждёт на уведомление
//
// Уведомлению банка на слово не верим: получив его, перезапрашиваем статус
// платежа через API банка и меняем заказ только по ответу API.
import 'server-only'
import { prisma } from '../prisma'
import { markOrderPaid, cancelOrder } from '../orders'
import mock from './mock'
import sber from './sber'
import tbank from './tbank'

// Банк выбирается переменной PAYMENT_PROVIDER: tbank (основной), sber,
// mock (эмулятор для разработки).
const PROVIDERS = { mock, tbank, sber }

// Локально по умолчанию работает эмулятор, на проде банк нужно указать явно.
export function activeProviderName() {
  return process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')
}

export function getProvider(name) {
  return PROVIDERS[name] || null
}

export function paymentsConfigured() {
  const provider = getProvider(activeProviderName())
  return Boolean(provider && provider.configured())
}

export function activeProviderLabel() {
  return getProvider(activeProviderName())?.label || 'не выбран'
}

export const PAYMENT_METHODS = {
  sbp: { title: 'СБП', create: 'createQr' },
  card: { title: 'Банковская карта', create: 'createCardPayment' },
  dolyame: { title: 'Долями', create: 'createDolyamePayment' },
}

// Какие способы оплаты сейчас доступны покупателю. Карту можно выключить
// переменной PAYMENT_CARD_ENABLED=0 — например, пока банк её не подключил.
// Ограничения «Долями» по сумме заказа задаёт банк — их можно повторить
// в переменных DOLYAME_MIN_RUB и DOLYAME_MAX_RUB, чтобы не предлагать
// способ, который банк всё равно отклонит.
export function dolyameFits(order) {
  if (!order) return true
  const rub = order.totalKopeks / 100
  const min = Number(process.env.DOLYAME_MIN_RUB) || 0
  const max = Number(process.env.DOLYAME_MAX_RUB) || Infinity
  return rub >= min && rub <= max
}

export function dolyameEnabled() {
  return availablePaymentMethods().includes('dolyame')
}

export function availablePaymentMethods(order = null) {
  const provider = getProvider(activeProviderName())
  if (!provider || !provider.configured()) return []
  return Object.entries(PAYMENT_METHODS)
    .filter(([key, m]) => typeof provider[m.create] === 'function')
    .filter(([key]) => key !== 'card' || process.env.PAYMENT_CARD_ENABLED !== '0')
    // «Долями» банк включает на терминале отдельно, поэтому по умолчанию
    // способ выключен: PAYMENT_DOLYAME_ENABLED=1 — после подключения.
    .filter(([key]) => key !== 'dolyame' || process.env.PAYMENT_DOLYAME_ENABLED === '1')
    .filter(([key]) => key !== 'dolyame' || dolyameFits(order))
    .map(([key]) => key)
}

// Сколько ждём оплату. Пока время не вышло, товары зарезервированы за покупателем.
export function qrTtlMs() {
  const minutes = Number(process.env.SBP_QR_TTL_MINUTES) || 15
  return Math.min(Math.max(minutes, 1), 24 * 60) * 60 * 1000
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export async function startPayment(order, method = 'sbp') {
  const name = activeProviderName()
  const provider = getProvider(name)
  if (!provider || !provider.configured()) {
    throw new Error('Оплата не настроена: задайте PAYMENT_PROVIDER и ключи банка. Смотрите .env.example.')
  }
  if (!availablePaymentMethods(order).includes(method)) {
    throw new Error('Этот способ оплаты сейчас недоступен')
  }

  const expiresAt = new Date(Date.now() + qrTtlMs())
  const payment = await provider[PAYMENT_METHODS[method].create]({
    order,
    expiresAt,
    notificationUrl: `${siteUrl()}/api/payments/${name}/webhook`,
    returnUrl: `${siteUrl()}/order/${order.id}`,
  })

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentMethod: method,
      paymentProvider: name,
      paymentId: payment.id,
      paymentUrl: payment.url,
      paymentStatus: payment.status,
      paymentExpiresAt: expiresAt,
    },
  })
  return payment
}

// Сверяет заказ с банком и применяет результат: оплачен, отменён или ждём.
// Просроченный QR отзываем у банка — и только если банк подтвердил отмену,
// снимаем резерв. Возвращает свежий заказ.
export async function syncOrderPayment(order) {
  const provider = getProvider(order.paymentProvider)
  if (!provider || !order.paymentId) return order

  // Отменённый заказ перепроверяем ради одного случая: оплата успела пройти
  // в последний момент. Такой заказ админка подсветит — нужен возврат денег
  // или ручное восстановление заказа.
  if (order.status === 'CANCELED') {
    const status = await provider.getStatus(order.paymentId).catch(() => null)
    if (status === 'succeeded' && order.paymentStatus !== 'succeeded') {
      console.error(`СБП: заказ №${order.number} оплачен после отмены, платёж ${order.paymentId}`)
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'succeeded' } })
    }
    return reload(order.id)
  }
  if (order.status !== 'PENDING') return order

  let status = await provider.getStatus(order.paymentId).catch((error) => {
    console.error('СБП: не удалось узнать статус платежа', order.paymentId, error)
    return null
  })

  const expired = order.paymentExpiresAt && order.paymentExpiresAt.getTime() < Date.now()
  if (status === 'pending' && expired) {
    status = await provider.cancel(order.paymentId).catch(() => null)
  }

  await applyStatus(order, status)
  return reload(order.id)
}

// Покупатель сам отказался от оплаты.
export async function cancelOrderPayment(order) {
  if (order.status !== 'PENDING') return order
  const provider = getProvider(order.paymentProvider)

  if (provider && order.paymentId) {
    const status = await provider.cancel(order.paymentId).catch(() => null)
    // Банк не ответил — резерв не снимаем: вдруг деньги уже ушли.
    if (!status) throw new Error('Банк не подтвердил отмену. Попробуйте через минуту.')
    await applyStatus(order, status)
  } else {
    await cancelOrder(order.id)
  }
  return reload(order.id)
}

// Заказы, у которых истёк QR, а покупатель так и не вернулся на сайт.
// Без этого товары висели бы в резерве вечно.
export async function expireStalePayments() {
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', paymentExpiresAt: { lt: new Date() } },
    take: 50,
  })
  for (const order of stale) {
    await syncOrderPayment(order).catch((error) => console.error('СБП: просроченный заказ', order.id, error))
  }
}

export async function handleNotification(providerName, request) {
  const provider = getProvider(providerName)
  if (!provider) return new Response('Unknown provider', { status: 404 })

  let notification
  try {
    notification = await provider.parseNotification(request)
  } catch (error) {
    console.error(`СБП (${providerName}): отклонено уведомление`, error.message)
    return new Response('Bad notification', { status: 400 })
  }

  const order = await prisma.order.findFirst({
    where: { paymentProvider: providerName, paymentId: notification.paymentId },
  })
  if (order) await syncOrderPayment(order)

  // Отвечаем «принято» даже на чужой платёж, иначе банк будет повторять
  // уведомление часами.
  return provider.notificationResponse()
}

async function applyStatus(order, status) {
  if (status === 'succeeded') {
    await markOrderPaid(order.id)
  } else if (status === 'canceled') {
    await cancelOrder(order.id, { paymentStatus: 'canceled' })
  } else if (status && status !== order.paymentStatus) {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: status } })
  }
}

function reload(orderId) {
  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
}
