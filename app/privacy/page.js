import LegalText from '@/components/LegalText'
import { PRIVACY_TEXT } from './text'

export const metadata = {
  title: 'Политика конфиденциальности — NIXDOG STUDIO',
  alternates: { canonical: '/privacy' },
}

// Политика обработки персональных данных по 152-ФЗ. Текст — от заказчика,
// лежит в ./text.js.
export default function PrivacyPage() {
  return (
    <div className="page section">
      <article className="legal">
        <h1 className="h1">Политика конфиденциальности</h1>
        <LegalText text={PRIVACY_TEXT} />
      </article>
    </div>
  )
}
