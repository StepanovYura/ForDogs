'use client'

// Общий механизм для корзины и избранного.
//   Гость — список хранится в localStorage этого браузера.
//   Вошёл в аккаунт — список хранится на сервере (/api/me), поэтому на всех
//   устройствах одинаковый. Что гость успел положить до входа, при входе
//   переносится в аккаунт, а из браузера удаляется — следующий, кто войдёт
//   с этого браузера, чужого не увидит.
// Изменения уходят на сервер с небольшой задержкой (пачкой), а при
// возвращении на вкладку список перечитывается — вдруг его поменяли на
// другом устройстве.
import { useCallback, useEffect, useRef, useState } from 'react'

const SAVE_DELAY_MS = 400

function readLocal(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocal(key, value) {
  try {
    if (value.length) window.localStorage.setItem(key, JSON.stringify(value))
    else window.localStorage.removeItem(key)
  } catch {
    // Приватный режим или заблокированное хранилище — работаем без сохранения.
  }
}

async function request(method, body) {
  const response = await fetch('/api/me', {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw new Error(`/api/me ответил ${response.status}`)
  return response.json()
}

// field — 'cart' или 'favorites' в ответе /api/me;
// merge(server, guest) — как соединить список аккаунта с гостевым;
// toServer(list) — что отправлять на сервер.
export function useAccountSync({ userId, storageKey, field, merge, toServer = (list) => list }) {
  const [list, setList] = useState([])
  const [ready, setReady] = useState(false)
  const fromServer = useRef(false)
  // Чей список сейчас на экране: null — гостя, id — аккаунта, undefined —
  // ещё загружается. При входе и выходе экран какое-то время показывает
  // прежний список, и без этой метки он сохранился бы не туда: корзина
  // аккаунта — гостю в браузер, пустая гостевая — поверх корзины аккаунта.
  const owner = useRef(undefined)
  const timer = useRef(null)
  const listRef = useRef(list)
  listRef.current = list

  const applyServer = useCallback((value, forUser) => {
    fromServer.current = true
    owner.current = forUser
    setList(value)
  }, [])

  // Вход, выход и первая загрузка.
  useEffect(() => {
    let cancelled = false
    owner.current = undefined
    setReady(false)
    clearTimeout(timer.current)
    timer.current = null

    if (!userId) {
      applyServer(readLocal(storageKey), null)
      setReady(true)
      return
    }

    ;(async () => {
      const guest = readLocal(storageKey)
      try {
        let data = await request('GET')
        if (guest.length) {
          data = await request('PUT', { [field]: toServer(merge(data[field], guest)) })
          writeLocal(storageKey, [])
        }
        if (!cancelled) applyServer(data[field], userId)
      } catch {
        // Сервер недоступен — показываем хотя бы то, что есть в браузере.
        if (!cancelled) applyServer(guest, userId)
      }
      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
    // merge и toServer — чистые функции, менять зависимости не нужно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, storageKey, field, applyServer])

  // Сохранение изменений.
  useEffect(() => {
    if (!ready || owner.current !== userId) return
    if (fromServer.current) {
      fromServer.current = false
      return
    }
    if (!userId) {
      writeLocal(storageKey, list)
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      request('PUT', { [field]: toServer(list) }).catch(() => {})
    }, SAVE_DELAY_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, ready, userId, storageKey, field])

  // Уходим со страницы (например, на страницу банка), а изменение ещё не
  // отправлено — досылаем сразу; keepalive не даёт браузеру оборвать запрос.
  useEffect(() => {
    if (!userId) return
    const flush = () => {
      if (!timer.current) return
      clearTimeout(timer.current)
      timer.current = null
      fetch('/api/me', {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: toServer(listRef.current) }),
      }).catch(() => {})
    }
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, field])

  // Вернулись на вкладку — подтягиваем изменения с других устройств,
  // если сами ничего не сохраняем прямо сейчас.
  useEffect(() => {
    if (!userId) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || timer.current) return
      request('GET')
        .then((data) => {
          if (!timer.current && owner.current === userId) applyServer(data[field], userId)
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [userId, field, applyServer])

  return [list, setList, ready]
}
