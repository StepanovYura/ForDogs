// Уведомления банка о статусе платежа по СБП. Адрес для личного кабинета
// банка: https://ваш-домен/api/payments/<банк>/webhook
import { handleNotification } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  return handleNotification(params.provider, request)
}

// Сбер по умолчанию присылает уведомления GET-запросом.
export async function GET(request, { params }) {
  return handleNotification(params.provider, request)
}
