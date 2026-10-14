import { prisma } from '@/lib/prisma'
import { DELIVERY_REGIONS, getFreeFromKopeks } from '@/lib/delivery'
import ConfirmButton from '@/components/admin/ConfirmButton'
import PositionSelect from '@/components/admin/PositionSelect'
import {
  addDeliveryMethodAction,
  createDefaultDeliveryAction,
  deleteDeliveryMethodAction,
  saveDeliveryMethodAction,
  saveFreeFromAction,
  setDeliveryPositionAction,
} from './actions'

export const dynamic = 'force-dynamic'

// Способы доставки и их цены. Покупатель выбирает способ при оформлении
// заказа, цена прибавляется к сумме заказа и к оплате.
export default async function AdminDeliveryPage() {
  const [methods, freeFrom] = await Promise.all([
    prisma.deliveryMethod.findMany({ orderBy: [{ position: 'asc' }, { title: 'asc' }] }),
    getFreeFromKopeks(),
  ])

  return (
    <>
      <p className="muted">
        Покупатель выбирает способ при оформлении заказа, его цена прибавляется к сумме. Показываются
        только включённые способы. Если не включён ни один — выбор доставки при оформлении не появляется.
      </p>

      <div className="panel">
        <h2 className="h3">Бесплатная доставка</h2>
        <form action={saveFreeFromAction} className="inline-form">
          <span className="small">От суммы заказа, ₽</span>
          <input
            name="freeFrom"
            className="input"
            style={{ width: 120 }}
            inputMode="numeric"
            defaultValue={freeFrom ? freeFrom / 100 : ''}
            placeholder="не задано"
          />
          <button type="submit" className="btn btn--ghost btn--sm">
            Сохранить
          </button>
          <span className="small muted">Пусто — бесплатной доставки нет.</span>
        </form>
      </div>

      <div className="panel">
        <h2 className="h3">Способы доставки</h2>
        {methods.length === 0 && (
          <form action={createDefaultDeliveryAction} className="inline-form">
            <span className="small muted">Способов пока нет.</span>
            <button type="submit" className="btn btn--sm">
              Создать способы из списка заказчика
            </button>
            <span className="small muted">СДЭК, Почта России, Яндекс, Достависта — цены впишете потом.</span>
          </form>
        )}

        {methods.map((m, index) => (
          <div key={m.id} className="delivery-admin-row">
            {methods.length > 1 && (
              <PositionSelect
                action={setDeliveryPositionAction}
                fields={{ id: m.id }}
                value={index + 1}
                count={methods.length}
                label="Место в списке"
              />
            )}
            <form action={saveDeliveryMethodAction} className="inline-form">
              <input type="hidden" name="id" value={m.id} />
              <select name="region" className="select" style={{ width: 'auto' }} defaultValue={m.region}>
                {DELIVERY_REGIONS.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.title}
                  </option>
                ))}
              </select>
              <input name="title" className="input" style={{ width: 170 }} defaultValue={m.title} aria-label="Название" />
              <input
                name="description"
                className="input"
                style={{ width: 200 }}
                defaultValue={m.description}
                placeholder="Срок, например «2–7 дней»"
                aria-label="Описание"
              />
              <input
                name="price"
                className="input"
                style={{ width: 90 }}
                inputMode="decimal"
                defaultValue={m.priceKopeks / 100}
                aria-label="Цена, ₽"
              />
              <span className="small muted">₽</span>
              <label className="small">
                <input type="checkbox" name="isActive" defaultChecked={m.isActive} /> включён
              </label>
              <button type="submit" className="btn btn--ghost btn--sm">
                Сохранить
              </button>
            </form>
            <ConfirmButton
              action={deleteDeliveryMethodAction}
              fields={{ id: m.id }}
              confirm={`Удалить способ «${m.title}»?`}
            >
              Удалить
            </ConfirmButton>
          </div>
        ))}

        <form action={addDeliveryMethodAction} className="inline-form" style={{ marginTop: 18 }}>
          <select name="region" className="select" style={{ width: 'auto' }} defaultValue="ru">
            {DELIVERY_REGIONS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.title}
              </option>
            ))}
          </select>
          <input name="title" className="input" style={{ width: 170 }} placeholder="Например, Boxberry" required />
          <input name="price" className="input" style={{ width: 90 }} inputMode="decimal" placeholder="Цена, ₽" />
          <button type="submit" className="btn btn--sm">
            Добавить способ
          </button>
        </form>
      </div>
    </>
  )
}
