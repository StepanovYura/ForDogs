export const STATUS_LABELS = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  SHIPPED: 'В доставке',
  DONE: 'Вручён',
  CANCELED: 'Отменён',
}

export const STATUS_ORDER = ['PENDING', 'PAID', 'SHIPPED', 'DONE', 'CANCELED']

export function statusBadgeClass(status) {
  if (status === 'PAID' || status === 'SHIPPED' || status === 'DONE') return 'badge badge--paid'
  if (status === 'CANCELED') return 'badge badge--canceled'
  return 'badge badge--pending'
}
