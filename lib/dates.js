// Даты на сайте — всегда по Москве: сервер хостинга живёт по UTC, и без
// явного часового пояса время заказа съезжало бы на 3 часа назад.
const MOSCOW = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// 13.11.2026, 14:05
export function formatDateTime(value) {
  return MOSCOW.format(new Date(value))
}
