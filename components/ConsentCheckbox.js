import Link from 'next/link'

// Согласие с офертой и на обработку персональных данных (152-ФЗ).
// Без отметки форма не отправится, а сервер проверит её ещё раз.
export default function ConsentCheckbox({ withOffer = true }) {
  return (
    <label className="consent">
      <input type="checkbox" name="consent" value="on" required />
      <span className="small muted">
        {withOffer ? (
          <>
            Принимаю условия{' '}
            <Link href="/offer" target="_blank">
              публичной оферты
            </Link>{' '}
            и даю{' '}
          </>
        ) : (
          'Даю '
        )}
        согласие на обработку персональных данных в соответствии с{' '}
        <Link href="/privacy" target="_blank">
          политикой конфиденциальности
        </Link>
        .
      </span>
    </label>
  )
}
