// robots.txt: поисковикам открыт каталог и информационные страницы, закрыты
// служебные разделы — корзина, оформление, личный кабинет, админка.
import { siteOrigin } from '@/lib/seo'

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/account', '/api/', '/cart', '/checkout', '/order', '/favorites', '/login', '/register', '/dev/'],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
    host: siteOrigin(),
  }
}
