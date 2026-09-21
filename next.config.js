/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
