import LegalText from '@/components/LegalText'
import { OFFER_TEXT } from './text'

export const metadata = {
  title: 'Публичная оферта — NIXDOG STUDIO',
  alternates: { canonical: '/offer' },
}

// Договор розничной купли-продажи дистанционным способом. Текст — от
// заказчика, лежит в ./text.js.
export default function OfferPage() {
  return (
    <div className="page section">
      <article className="legal">
        <h1 className="h1">Публичная оферта</h1>
        <LegalText text={OFFER_TEXT} />
      </article>
    </div>
  )
}
