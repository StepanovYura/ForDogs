import CartView from './CartView'

export const metadata = { title: 'Корзина — NIXDOG STUDIO' }

export default function CartPage() {
  return (
    <div className="page section--tight" style={{ paddingBottom: 48 }}>
      <h1 className="h1">Корзина</h1>
      <CartView />
    </div>
  )
}
