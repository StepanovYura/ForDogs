import { getHomeCover } from '@/lib/settings'
import { storageConfigured } from '@/lib/storage'
import CoverUploader from './CoverUploader'
import { removeCoverAction } from './actions'

export const dynamic = 'force-dynamic'

const KINDS = [
  {
    kind: 'desktop',
    title: 'Обложка для компьютера',
    hint: 'Горизонтальное фото, лучше 2560×1440 или больше. Показывается под шапкой до низа экрана.',
    ratio: '16 / 9',
  },
  {
    kind: 'mobile',
    title: 'Обложка для телефона и планшета',
    hint: 'Вертикальное фото, лучше 1200×2000 или больше. Показывается на весь экран, шапка с иконками лежит поверх — оставьте сверху немного «воздуха».',
    ratio: '9 / 16',
  },
]

export default async function AdminHomePage() {
  const cover = await getHomeCover()

  return (
    <>
      {!storageConfigured() && (
        <div className="form-error">Хранилище картинок не настроено — загрузка не заработает.</div>
      )}
      <p className="muted">
        Если загружена только одна обложка, она показывается на всех экранах — но
        горизонтальное фото на телефоне обрежется по бокам, поэтому лучше загрузить обе.
      </p>

      <div className="row-2" style={{ alignItems: 'start' }}>
        {KINDS.map(({ kind, title, hint, ratio }) => {
          const current = cover[kind]
          return (
            <div className="panel" key={kind}>
              <h2 className="h3">{title}</h2>
              <p className="small muted">{hint}</p>

              <div
                className="card__media"
                style={{ aspectRatio: ratio, maxHeight: 420, margin: '0 auto 16px', width: kind === 'mobile' ? 'auto' : '100%' }}
              >
                {current ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.url} alt="" />
                ) : (
                  <div className="card__placeholder">Не загружена</div>
                )}
              </div>

              <CoverUploader kind={kind} />

              {current && (
                <form action={removeCoverAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="kind" value={kind} />
                  <button type="submit" className="link-underline">
                    Убрать обложку
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
