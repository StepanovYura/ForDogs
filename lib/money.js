// Цены храним в копейках, показываем рублями.
export function formatPrice(kopeks) {
  const rub = Math.round(kopeks) / 100
  return (
    new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: rub % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(rub) + ' ₽'
  )
}

// ЮKassa принимает сумму строкой с двумя знаками после запятой.
export function kopeksToAmountString(kopeks) {
  return (Math.round(kopeks) / 100).toFixed(2)
}
