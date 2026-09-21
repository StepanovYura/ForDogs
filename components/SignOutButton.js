import { logoutAction } from '@/app/login/actions'

export default function SignOutButton({ className = 'btn btn--ghost btn--sm' }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className={className}>
        Выйти
      </button>
    </form>
  )
}
