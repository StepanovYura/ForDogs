import FavoritesView from './FavoritesView'

export const metadata = { title: 'Избранное — NIXDOG STUDIO' }

export default function FavoritesPage() {
  return (
    <div className="page section--tight" style={{ paddingBottom: 56 }}>
      <h1 className="h1">Избранное</h1>
      <FavoritesView />
    </div>
  )
}
