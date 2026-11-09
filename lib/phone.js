// Российский номер телефона в одном виде: +7 (999) 999-99-99.
// Работает и в браузере (маска поля), и на сервере (то, что сохраняем).

export const PHONE_PREFIX = '+7 ('
export const PHONE_PATTERN = '\\+7 \\(\\d{3}\\) \\d{3}-\\d{2}-\\d{2}'

// Десять цифр номера без кода страны. Код +7 / 8 в начале отбрасываем:
// у значения из маски он уже стоит, а вставленный номер 89991234567 или
// 79991234567 узнаём по одиннадцати цифрам.
export function phoneDigits(value) {
  const text = String(value || '').trim()
  let digits = text.replace(/\D/g, '')
  if (text.startsWith('+7')) digits = digits.slice(1)
  if (digits.length === 11 && /^[78]/.test(digits)) digits = digits.slice(1)
  return digits.slice(0, 10)
}

// Форматирует по мере ввода: +7 (999) 999-99-99, недостающие части не дописывает.
export function formatPhone(value) {
  const d = phoneDigits(value)
  if (!d) return ''
  let out = PHONE_PREFIX + d.slice(0, 3)
  if (d.length >= 3) out += ') '
  if (d.length > 3) out += d.slice(3, 6)
  if (d.length > 6) out += '-' + d.slice(6, 8)
  if (d.length > 8) out += '-' + d.slice(8, 10)
  return out
}

// Полный номер в едином виде или null, если цифр не хватает.
export function normalizePhone(value) {
  return phoneDigits(value).length === 10 ? formatPhone(value) : null
}
