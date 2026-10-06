'use client'

import { useEffect, useRef, useState } from 'react'

// На телефоне длинный текст сворачивается до нескольких строк с кнопкой
// «Подробнее». На компьютере текст виден целиком — обрезка задана только
// в мобильных стилях (.readmore в globals.css), а кнопка появляется, лишь
// когда текст действительно не поместился.
export default function ReadMore({ children, lines = 4, className = '', as: Tag = 'div' }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      if (open) return
      setOverflowing(element.scrollHeight - element.clientHeight > 2)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [open, children])

  return (
    <div className={`readmore ${className}`} data-open={open} data-clamped={overflowing && !open}>
      <Tag ref={ref} className="readmore__body" style={{ '--lines': lines }}>
        {children}
      </Tag>
      {(overflowing || open) && (
        <button type="button" className="readmore__toggle" onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Подробнее'}
        </button>
      )}
    </div>
  )
}
