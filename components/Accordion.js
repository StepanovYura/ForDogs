'use client'

import { useState } from 'react'

export default function Accordion({ items }) {
  const [open, setOpen] = useState(null)

  return (
    <div className="accordion">
      {items
        .filter((item) => item.body)
        .map((item, index) => {
          const isOpen = open === index
          return (
            <div className="accordion__item" key={item.title}>
              <button
                type="button"
                className="accordion__head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : index)}
              >
                <span>{item.title}</span>
                <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && <div className="accordion__body">{item.body}</div>}
            </div>
          )
        })}
    </div>
  )
}
