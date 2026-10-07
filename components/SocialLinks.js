// Иконки соцсетей. Показываются только те, для которых в админке
// («Реквизиты и соцсети») указана ссылка.
const ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 4 3 11l6 2.2L18 7l-6.8 7.6.3 5.4 3.3-4.2L19.5 19 21 4Z" />
    </svg>
  ),
  vk: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <path d="M6.5 8.5c.3 4.6 2.6 7.3 6.2 7.3h.4v-2.6c1.3.1 2.3 1.2 2.7 2.6h1.7c-.5-1.9-1.8-3-2.6-3.4.8-.5 1.9-1.6 2.2-3.9h-1.6c-.3 1.6-1.4 2.7-2.4 2.9V8.5h-1.6v4.7c-1-.3-2.4-1.6-2.4-4.7H6.5Z" />
    </svg>
  ),
}

const LABELS = { instagram: 'Instagram', telegram: 'Telegram', vk: 'ВКонтакте' }

export function hasSocials(socials = {}) {
  return Object.keys(ICONS).some((key) => socials[key])
}

export default function SocialLinks({ socials = {}, className = 'socials' }) {
  const items = Object.keys(ICONS).filter((key) => socials[key])
  if (items.length === 0) return null
  return (
    <div className={className}>
      {items.map((key) => (
        <a
          key={key}
          href={socials[key]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={LABELS[key]}
          title={LABELS[key]}
          className="socials__link"
        >
          {ICONS[key]}
        </a>
      ))}
    </div>
  )
}
