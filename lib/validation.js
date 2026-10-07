import { z } from 'zod'

export const emailSchema = z.string().trim().toLowerCase().email('Введите корректный email')

export const passwordSchema = z
  .string()
  .min(8, 'Пароль должен быть не короче 8 символов')
  .max(200, 'Слишком длинный пароль')

// Отметка «согласен с офертой и обработкой персональных данных».
const consent = z.literal('on', {
  errorMap: () => ({ message: 'Нужно согласие на обработку персональных данных' }),
})

export const registerSchema = z.object({
  consent,
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(120).optional().or(z.literal('')),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль'),
})

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Укажите имя'),
  customerEmail: emailSchema,
  customerPhone: z
    .string()
    .trim()
    .min(10, 'Укажите телефон')
    .max(20, 'Слишком длинный номер'),
  city: z.string().trim().min(2, 'Укажите город'),
  address: z.string().trim().min(5, 'Укажите адрес доставки'),
  postalCode: z.string().trim().max(10).optional().or(z.literal('')),
  comment: z.string().trim().max(500).optional().or(z.literal('')),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Нужно принять условия оферты и дать согласие на обработку данных' }),
  }),
  paymentMethod: z.enum(['sbp', 'card', 'dolyame'], { errorMap: () => ({ message: 'Выберите способ оплаты' }) }).default('sbp'),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1, 'Корзина пуста'),
})
