import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/money'
import { storageConfigured } from '@/lib/storage'
import { yookassaConfigured } from '@/lib/yookassa'

export const dynamic = 'force-dynamic'

export default async function AdminHome() {
  const [orders, paid, products, lowStock, revenue] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['PAID', 'SHIPPED', 'DONE'] } } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { stock: { lte: 2 } } }),
    prisma.order.aggregate({
      _sum: { totalKopeks: true },
      where: { status: { in: ['PAID', 'SHIPPED', 'DONE'] } },
    }),
  ])

  const checks = [
    { label: 'Оплата ЮKassa', ok: yookassaConfigured(), hint: 'YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY' },
    { label: 'Хранилище картинок', ok: storageConfigured(), hint: 'S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY' },
    {
      label: 'Адрес сайта',
      ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      hint: 'NEXT_PUBLIC_SITE_URL — нужен для возврата после оплаты',
    },
  ]

  return (
    <>
      <div className="row-3" style={{ gap: 18 }}>
        <div className="panel">
          <div className="caption">Заказов всего</div>
          <div style={{ fontSize: 30 }}>{orders}</div>
          <div className="small muted">оплачено: {paid}</div>
        </div>
        <div className="panel">
          <div className="caption">Выручка</div>
          <div style={{ fontSize: 30 }}>{formatPrice(revenue._sum.totalKopeks || 0)}</div>
          <div className="small muted">по оплаченным заказам</div>
        </div>
        <div className="panel">
          <div className="caption">Товаров в каталоге</div>
          <div style={{ fontSize: 30 }}>{products}</div>
          <div className="small muted">вариантов на исходе: {lowStock}</div>
        </div>
      </div>

      <div className="panel">
        <h2 className="h3">Настройки окружения</h2>
        <table className="table">
          <tbody>
            {checks.map((check) => (
              <tr key={check.label}>
                <td>{check.label}</td>
                <td>
                  <span className={check.ok ? 'badge badge--paid' : 'badge badge--canceled'}>
                    {check.ok ? 'Настроено' : 'Не настроено'}
                  </span>
                </td>
                <td className="small muted">{check.hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted" style={{ marginBottom: 0 }}>
          Переменные задаются в <code>.env.local</code> локально и в панели ONREZA
          на проде.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Link href="/admin/orders" className="btn btn--ghost">
          Заказы
        </Link>
        <Link href="/admin/products" className="btn btn--ghost">
          Товары
        </Link>
      </div>
    </>
  )
}
