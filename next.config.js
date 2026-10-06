/** @type {import('next').NextConfig} */
// Заголовки безопасности для всех страниц.
//   X-Frame-Options / frame-ancestors — сайт нельзя встроить в чужую
//     страницу: так не подсунуть покупателю поддельную кнопку «Оплатить»
//     поверх настоящей (clickjacking);
//   Strict-Transport-Security — браузер ходит на сайт только по HTTPS;
//   Referrer-Policy — адреса страниц заказа не утекают на чужие сайты;
//   X-Content-Type-Options, Permissions-Policy — закрываем лишние возможности.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  images: {
    // Фотографии товаров лежат в Yandex Object Storage.
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.yandexcloud.net' },
      { protocol: 'https', hostname: '*.storage.yandexcloud.net' },
      { protocol: 'https', hostname: '*.website.yandexcloud.net' },
    ],
  },
}

module.exports = nextConfig
