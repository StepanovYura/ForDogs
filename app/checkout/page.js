import { requireUser } from '@/lib/auth'
import CheckoutForm from './CheckoutForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Оформление заказа — NIXDOG STUDIO' }

export default async function CheckoutPage() {
  // Положить товар в корзину можно без входа, а оплатить — нет.
  const user = await requireUser('/checkout')

  return (
    <div className="page section--tight" style={{ paddingBottom: 48 }}>
      <h1 className="h1">Оформление заказа</h1>
      <CheckoutForm user={JSON.parse(JSON.stringify(user))} />
    </div>
  )
}
