// «Банк» для эмулятора: сюда ведёт QR-код СБП и кнопка оплаты картой, пока
// настоящий банк не подключён. Полей для номера карты здесь нет даже в
// тесте: на настоящем сайте карту вводят только на странице банка. Работает, только когда PAYMENT_PROVIDER=mock
// (локально это значение по умолчанию), на проде страницы нет.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { activeProviderName } from '@/lib/payments'
import mock, { getMockPayment, resolveMockPayment } from '@/lib/payments/mock'
import { formatPrice } from '@/lib/money'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Эмулятор банка', robots: { index: false } }

const emulatorEnabled = () => activeProviderName() === 'mock' && mock.configured()

const RESULT = {
  succeeded: { className: 'form-ok', text: 'Платёж выполнен. Магазин получил уведомление.' },
  canceled: { className: 'form-error', text: 'Платёж отклонён.' },
  expired: { className: 'form-error', text: 'Срок действия QR-кода истёк.' },
}

export default function MockBankPage({ params }) {
  if (!emulatorEnabled()) notFound()

  const payment = getMockPayment(params.id)
  if (!payment) {
    return (
      <div className="page section">
        <div className="empty">
          <h1 className="h1">Платёж не найден</h1>
          <p>Эмулятор хранит платежи в памяти — после перезапуска сервера они пропадают.</p>
        </div>
      </div>
    )
  }

  async function resolve(formData) {
    'use server'
    if (!emulatorEnabled()) notFound()
    const status = formData.get('status') === 'succeeded' ? 'succeeded' : 'canceled'
    await resolveMockPayment(params.id, status)
    redirect(`/dev/bank/${params.id}`)
  }

  const result = RESULT[payment.status]

  return (
    <div className="page section">
      <div className="form-narrow" style={{ maxWidth: 420 }}>
        <div className="form-error" style={{ textAlign: 'center' }}>
          Эмулятор банка для разработки. Настоящие деньги не списываются.
        </div>

        <div className="panel" style={{ textAlign: 'center' }}>
          <div className="caption">{payment.method === 'card' ? 'Оплата картой' : 'Оплата по QR · СБП'}</div>
          <div style={{ fontSize: 34, margin: '14px 0 6px' }}>{formatPrice(payment.amountKopeks)}</div>
          <div className="small muted">Получатель: NIXDOG STUDIO</div>
          <div className="small muted">Заказ №{payment.orderNumber}</div>
        </div>

        {result ? (
          <>
            <div className={result.className}>{result.text}</div>
            <Link href={payment.returnUrl} className="btn btn--block">
              Вернуться в магазин
            </Link>
          </>
        ) : (
          <form action={resolve} style={{ display: 'grid', gap: 10 }}>
            {payment.method === 'card' && (
              <p className="small muted" style={{ margin: '0 0 6px', textAlign: 'center' }}>
                Здесь настоящий банк попросит номер карты, срок, CVC и код
                3-D Secure. В эмуляторе — просто выберите исход.
              </p>
            )}
            <button type="submit" name="status" value="succeeded" className="btn btn--block">
              Оплатить
            </button>
            <button type="submit" name="status" value="canceled" className="btn btn--ghost btn--block">
              Отклонить
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
