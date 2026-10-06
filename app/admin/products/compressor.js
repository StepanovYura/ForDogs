'use client'

// Сжатие фотографий вынесено в отдельные потоки (Web Worker).
// Кодирование одного снимка в WebP занимает сотни миллисекунд, и в основном
// потоке заливка двадцати фотографий подряд намертво подвешивает админку:
// не прокручивается страница, не нажимаются кнопки. В воркере эта работа
// идёт параллельно интерфейсу.
//
// Код воркера собран строкой и запускается через blob-адрес, а не отдельным
// файлом. Так он не зависит от того, как сборщик разложит файлы по папкам, —
// одним источником ошибок меньше.

const WORKER_SOURCE = `
self.onmessage = async (event) => {
  const { id, file, targets, quality } = event.data
  try {
    const bitmap = await createImageBitmap(file)
    const results = {}
    const sizes = { source: { width: bitmap.width, height: bitmap.height } }
    for (const name of Object.keys(targets)) {
      const maxSide = targets[name]
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))
      sizes[name] = { width, height }
      const canvas = new OffscreenCanvas(width, height)
      const context = canvas.getContext('2d')
      context.imageSmoothingQuality = 'high'
      context.drawImage(bitmap, 0, 0, width, height)
      results[name] = await canvas.convertToBlob({ type: 'image/webp', quality })
    }
    bitmap.close()
    self.postMessage({ id, results, sizes })
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message ? error.message : error) })
  }
}
`

function workersSupported() {
  return (
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined' &&
    typeof createImageBitmap !== 'undefined'
  )
}

let pool = null

function getPool() {
  if (pool) return pool

  // Больше двух-трёх потоков смысла не имеет: узким местом станет сеть.
  const size = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 2) - 1))
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }))

  const workers = []
  for (let i = 0; i < size; i++) {
    const worker = new Worker(url)
    const entry = { worker, busy: false, pending: new Map() }
    worker.onmessage = (event) => {
      const { id, results, sizes, error } = event.data
      const task = entry.pending.get(id)
      if (!task) return
      entry.pending.delete(id)
      entry.busy = false
      if (error) task.reject(new Error(error))
      else task.resolve({ ...results, sizes })
      drain()
    }
    worker.onerror = (event) => {
      for (const task of entry.pending.values()) {
        task.reject(new Error(event.message || 'Ошибка обработки изображения'))
      }
      entry.pending.clear()
      entry.busy = false
      drain()
    }
    workers.push(entry)
  }

  const waiting = []

  function drain() {
    while (waiting.length) {
      const free = workers.find((w) => !w.busy)
      if (!free) return
      const task = waiting.shift()
      free.busy = true
      free.pending.set(task.id, task)
      free.worker.postMessage({
        id: task.id,
        file: task.file,
        targets: task.targets,
        quality: task.quality,
      })
    }
  }

  let counter = 0
  pool = {
    run(file, targets, quality) {
      return new Promise((resolve, reject) => {
        waiting.push({ id: ++counter, file, targets, quality, resolve, reject })
        drain()
      })
    },
  }
  return pool
}

// Запасной путь для браузеров без OffscreenCanvas: та же работа,
// но в основном потоке. Медленнее и подвешивает интерфейс, зато работает.
async function compressInMainThread(file, targets, quality) {
  const bitmap = await createImageBitmap(file)
  const results = {}
  const sizes = { source: { width: bitmap.width, height: bitmap.height } }
  for (const name of Object.keys(targets)) {
    const maxSide = targets[name]
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    sizes[name] = { width, height }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)

    results[name] = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    )
    if (!results[name]) throw new Error('Не удалось сжать изображение')
  }
  bitmap.close?.()
  return { ...results, sizes }
}

// targets — например { full: 1600, thumb: 600 }.
// Возвращает { full: Blob, thumb: Blob, sizes: { source, full, thumb } },
// где sizes — ширина и высота исходника и каждой копии в пикселях.
export async function compressImage(file, targets, quality) {
  if (!workersSupported()) return compressInMainThread(file, targets, quality)
  try {
    return await getPool().run(file, targets, quality)
  } catch (error) {
    // Воркер мог не завестись из-за политики безопасности страницы —
    // не теряем файл, доделываем в основном потоке.
    console.warn('Сжатие в отдельном потоке не удалось, повтор в основном:', error.message)
    return compressInMainThread(file, targets, quality)
  }
}
