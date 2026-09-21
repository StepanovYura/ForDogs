import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="page section">
      <div className="empty">
        <h1 className="h1">Страница не найдена</h1>
        <p>Возможно, товар закончился или адрес введён с ошибкой.</p>
        <Link href="/catalog" className="btn">
          В каталог
        </Link>
      </div>
    </div>
  )
}
