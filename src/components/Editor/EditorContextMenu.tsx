import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import {
  formatBold, formatItalic, formatStrike, formatInlineCode, formatHighlight,
  formatH1, formatH2, formatH3,
  formatBullet, formatOrdered, formatTask, formatQuote,
  formatLink, formatImage, formatCodeBlock, formatHR, formatTable,
} from './format'
import styles from './EditorContextMenu.module.css'

interface Props {
  x: number
  y: number
  view: EditorView
  hasSelection: boolean
  onClose: () => void
}

interface MenuItem {
  label: string
  hint?: string
  action: (view: EditorView) => void
  dividerAfter?: boolean
}

const ITEMS: MenuItem[] = [
  { label: 'Жирный',       hint: 'Ctrl+B',         action: formatBold },
  { label: 'Курсив',       hint: 'Ctrl+I',         action: formatItalic },
  { label: 'Зачёркнутый', hint: 'Ctrl+Shift+S',   action: formatStrike },
  { label: 'Инлайн код',  hint: 'Ctrl+`',          action: formatInlineCode },
  { label: 'Выделение',   hint: 'Ctrl+Shift+H',   action: formatHighlight, dividerAfter: true },
  { label: 'Заголовок 1', hint: 'Ctrl+1',          action: formatH1 },
  { label: 'Заголовок 2', hint: 'Ctrl+2',          action: formatH2 },
  { label: 'Заголовок 3', hint: 'Ctrl+3',          action: formatH3, dividerAfter: true },
  { label: 'Список •',    hint: 'Ctrl+Shift+8',   action: formatBullet },
  { label: 'Список 1.',   hint: 'Ctrl+Shift+7',   action: formatOrdered },
  { label: 'Задача ☐',    hint: 'Ctrl+Shift+9',   action: formatTask },
  { label: 'Цитата',                               action: formatQuote, dividerAfter: true },
  { label: 'Ссылка',      hint: 'Ctrl+K',          action: formatLink },
  { label: 'Изображение',                          action: formatImage, dividerAfter: true },
  { label: 'Таблица',                              action: formatTable },
  { label: 'Блок кода',                            action: formatCodeBlock },
  { label: 'Линия ───',                            action: formatHR },
]

export function EditorContextMenu({ x, y, view, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  // adjust position so menu stays inside viewport
  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`
  }, [x, y])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose()
    }
    // slight delay so the triggering click doesn't immediately close the menu
    const t = setTimeout(() => window.addEventListener('mousedown', handler), 50)
    return () => { clearTimeout(t); window.removeEventListener('mousedown', handler) }
  }, [onClose])

  const run = (action: (v: EditorView) => void) => {
    action(view)
    onClose()
  }

  return (
    <div ref={menuRef} className={styles.menu} style={{ left: x, top: y }}>
      {ITEMS.map((item) => (
        <div key={item.label}>
          <button
            className={styles.item}
            onMouseDown={(e) => { e.preventDefault(); run(item.action) }}
          >
            <span className={styles.label}>{item.label}</span>
            {item.hint && <span className={styles.hint}>{item.hint}</span>}
          </button>
          {item.dividerAfter && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  )
}
