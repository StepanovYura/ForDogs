// Вывод юридического документа из простого текста — чтобы править оферту
// и политику, не трогая разметку. Каждая строка — отдельный блок:
//   «## …»  — заголовок раздела;
//   «• …»   — пункт списка (идущие подряд пункты собираются в один список);
//   пустая строка — пропускается;
//   остальное — абзац.
// Адреса https://… превращаются в ссылки.
const URL_RE = /(https?:\/\/[^\s,;)]+[^\s,;).])/g

function linkify(text) {
  return text.split(URL_RE).map((part, index) =>
    index % 2 === 1 ? (
      <a key={index} href={part}>
        {part}
      </a>
    ) : (
      part
    )
  )
}

export default function LegalText({ text }) {
  const blocks = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) })
    } else if (line.startsWith('• ')) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(line.slice(2))
      else blocks.push({ type: 'ul', items: [line.slice(2)] })
    } else {
      blocks.push({ type: 'p', text: line })
    }
  }

  return blocks.map((block, index) => {
    if (block.type === 'h2') return <h2 className="h3" key={index}>{block.text}</h2>
    if (block.type === 'ul') {
      return (
        <ul key={index}>
          {block.items.map((item, i) => (
            <li key={i}>{linkify(item)}</li>
          ))}
        </ul>
      )
    }
    return <p key={index}>{linkify(block.text)}</p>
  })
}
