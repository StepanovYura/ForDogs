import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ProductCard from '@/components/ProductCard'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Если база ещё не поднята, главная не должна падать — показываем пустую сетку.
  const products = await prisma.product
    .findMany({
      where: { isActive: true },
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { select: { colorSlug: true, colorHex: true, colorName: true, stock: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      take: 8,
    })
    .catch(() => [])

  const hero = products.find((p) => p.images.length > 0)

  return (
    <>
      <section className="page hero">
        <div>
          <div className="caption" style={{ marginBottom: 18 }}>
            NIXDOG STUDIO
          </div>
          <h1 className="h1">
            Одежда для собак,
            <br />
            в которой удобно гулять
          </h1>
          <p className="muted" style={{ maxWidth: 420 }}>
            Мягкие материалы, продуманная посадка и спокойные цвета. Размеры
            XS–XL — от чихуахуа до бордер-колли. Шьём небольшими партиями и
            проверяем каждую модель на живых собаках.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            <Link href="/catalog" className="btn">
              Смотреть каталог
            </Link>
            <Link href="/size-guide" className="btn btn--ghost">
              Подобрать размер
            </Link>
          </div>
        </div>
        <div className="hero__media">
          {hero ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={hero.images[0].url} alt={hero.title} />
          ) : (
            <div className="card__placeholder">Фотография обложки</div>
          )}
        </div>
      </section>

      <section className="page section">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <h2 className="h2" style={{ margin: 0 }}>
            Новое в каталоге
          </h2>
          <Link href="/catalog" className="link-underline">
            Все товары
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="empty">
            <p>
              Каталог пока пуст. Загрузите товары через админку или выполните
              <code> npm run db:seed</code>.
            </p>
          </div>
        ) : (
          <div className="grid-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="page section">
        <div className="row-3" style={{ gap: 32 }}>
          <div>
            <h3 className="h3">Посадка по замерам</h3>
            <p className="small muted">
              Пять размеров и подробная таблица: длина спины, обхват груди и
              шеи. Если замер попал между размерами — подскажем, какой брать.
            </p>
          </div>
          <div>
            <h3 className="h3">Ткани без сюрпризов</h3>
            <p className="small muted">
              Хлопковый футер, флис и мембрана для дождя. Состав каждой модели
              указан на карточке товара — вместе с правилами ухода.
            </p>
          </div>
          <div>
            <h3 className="h3">Обмен 14 дней</h3>
            <p className="small muted">
              Не подошёл размер — обменяем в течение двух недель при сохранении
              бирок. Доставка по России курьером и Почтой.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
