// Письма о заказах — покупателю и администратору.
//
// Когда что уходит:
//   paid      — покупателю «Заказ оплачен», администратору «Новый заказ»;
//   shipped   — покупателю «Заказ передан в доставку» (с трек-номером);
//   done      — покупателю «Заказ вручён»;
//   canceled  — покупателю «Заказ отменён» (не оплачен вовремя, отказ
//               банка, отмена покупателем или администратором).
// Каждое событие вызывается ровно один раз — при реальной смене статуса.
import 'server-only'
import { prisma } from './prisma'
import { sendMail } from './mail'
import { formatPrice } from './money'
import { getSiteInfo } from './settings'
import { METHOD_PAID_WITH } from './paymentMethods'

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const escape = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// Общая обёртка письма: простая вёрстка на таблицах и встроенных стилях —
// так письмо одинаково выглядит в Яндекс Почте, Mail.ru и Gmail.
function layout({ title, intro, order, extra = '', footer = '' }) {
  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">
            ${escape(item.titleSnapshot)}<br>
            <span style="color:#888;font-size:13px">${escape(item.colorSnapshot)} · ${escape(item.sizeSnapshot)} · ${item.quantity} шт.</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">
            ${formatPrice(item.priceKopeks * item.quantity)}
          </td>
        </tr>`
    )
    .join('')

  return `<!doctype html>
<html lang="ru"><body style="margin:0;background:#f4f2f0;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f0;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;padding:32px">
        <tr><td style="font-size:18px;letter-spacing:4px;font-weight:600">NIXDOG <span style="font-size:10px;color:#9a9490;letter-spacing:5px">STUDIO</span></td></tr>
        <tr><td style="padding-top:28px;font-size:20px;letter-spacing:1px;text-transform:uppercase">${escape(title)}</td></tr>
        <tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#444">${intro}</td></tr>
        ${extra ? `<tr><td style="padding-top:16px;font-size:15px;line-height:1.6">${extra}</td></tr>` : ''}
        <tr><td style="padding-top:24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            ${rows}
            <tr>
              <td style="padding-top:12px;font-weight:600">Итого</td>
              <td style="padding-top:12px;text-align:right;font-weight:600">${formatPrice(order.totalKopeks)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:16px;font-size:13px;color:#888">
          Доставка: ${escape(order.city)}, ${escape(order.address)}${order.postalCode ? `, ${escape(order.postalCode)}` : ''}
        </td></tr>
        <tr><td style="padding-top:24px">
          <a href="${siteUrl()}/order/${order.id}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:13px 24px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Открыть заказ</a>
        </td></tr>
        ${footer ? `<tr><td style="padding-top:24px;font-size:12px;color:#9a9490;line-height:1.6">${footer}</td></tr>` : ''}
      </table>
    </td></tr>
  </table>
</body></html>`
}

function plain(title, order, lines = []) {
  const items = order.items
    .map((i) => `— ${i.titleSnapshot}, ${i.colorSnapshot}, ${i.sizeSnapshot} × ${i.quantity}: ${formatPrice(i.priceKopeks * i.quantity)}`)
    .join('\n')
  return [title, '', ...lines, '', items, `Итого: ${formatPrice(order.totalKopeks)}`, '', `${siteUrl()}/order/${order.id}`].join('\n')
}

async function contactFooter() {
  const { requisites } = await getSiteInfo().catch(() => ({ requisites: {} }))
  const parts = [
    requisites.email && `Вопросы по заказу: ${escape(requisites.email)}`,
    requisites.phone && escape(requisites.phone),
    requisites.sellerName && escape(requisites.sellerName),
  ].filter(Boolean)
  return parts.join(' · ')
}

const TEMPLATES = {
  paid: (order) => ({
    subject: `Заказ №${order.number} оплачен`,
    title: `Заказ №${order.number} оплачен`,
    intro: `${escape(order.customerName)}, спасибо за покупку! Оплата прошла, мы уже собираем заказ и напишем, когда передадим его в доставку.`,
  }),
  shipped: (order) => ({
    subject: `Заказ №${order.number} передан в доставку`,
    title: 'Заказ в пути',
    intro: `${escape(order.customerName)}, мы передали заказ №${order.number} в доставку.`,
    extra: order.trackingNumber
      ? `Трек-номер для отслеживания: <strong>${escape(order.trackingNumber)}</strong>`
      : '',
  }),
  done: (order) => ({
    subject: `Заказ №${order.number} вручён`,
    title: 'Заказ вручён',
    intro: `${escape(order.customerName)}, заказ №${order.number} доставлен. Надеемся, вещи понравятся вам и вашему питомцу! Если размер не подошёл — напишите нам, поможем с обменом.`,
  }),
  canceled: (order) => ({
    subject: `Заказ №${order.number} отменён`,
    title: 'Заказ отменён',
    intro:
      order.paymentStatus === 'succeeded'
        ? `${escape(order.customerName)}, заказ №${order.number} отменён. Деньги вернутся на карту или счёт, с которого вы платили, — обычно это занимает до 10 дней.`
        : `${escape(order.customerName)}, заказ №${order.number} отменён — оплата не поступила. Деньги не списаны. Товары снова доступны в каталоге — можно оформить заказ заново.`,
  }),
}

// Отправить письма о событии заказа. Ошибки только логируются: письмо
// не должно ломать оплату или смену статуса.
export async function notifyOrder(orderId, event) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    if (!order || !TEMPLATES[event]) return

    const t = TEMPLATES[event](order)
    const footer = await contactFooter()
    await sendMail({
      to: order.customerEmail,
      subject: `${t.subject} — NIXDOG STUDIO`,
      html: layout({ title: t.title, intro: t.intro, extra: t.extra, order, footer }),
      text: plain(t.subject, order, order.trackingNumber && event === 'shipped' ? [`Трек-номер: ${order.trackingNumber}`] : []),
    })

    // Администратору — о каждом новом оплаченном заказе.
    const admin = process.env.ADMIN_EMAIL
    if (event === 'paid' && admin) {
      await sendMail({
        to: admin,
        subject: `Новый заказ №${order.number} — ${formatPrice(order.totalKopeks)}`,
        html: layout({
          title: `Новый заказ №${order.number}`,
          intro: `Оплачен ${METHOD_PAID_WITH[order.paymentMethod] || 'по СБП'}. Покупатель: ${escape(order.customerName)}, ${escape(order.customerPhone)}, ${escape(order.customerEmail)}.${order.comment ? `<br>Комментарий: ${escape(order.comment)}` : ''}`,
          order,
        }),
        text: plain(`Новый заказ №${order.number}`, order, [
          `${order.customerName}, ${order.customerPhone}, ${order.customerEmail}`,
        ]),
      })
    }
  } catch (error) {
    console.error(`Письма о заказе ${orderId} (${event}) не отправлены:`, error.message)
  }
}
