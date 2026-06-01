import { EditorView } from '@codemirror/view'
import {
  formatBold,
  formatItalic,
  formatStrike,
  formatInlineCode,
  formatHighlight,
  formatH1,
  formatH2,
  formatH3,
  formatBullet,
  formatOrdered,
  formatTask,
  formatQuote,
  formatLink,
  formatImage,
  formatCodeBlock,
  formatHR,
  formatTable,
} from './format'
import styles from './Toolbar.module.css'

interface Props {
  viewRef: React.RefObject<EditorView | null>
}

interface ToolGroup {
  items: ToolItem[]
}

interface ToolItem {
  label: string
  title: string
  hint?: string
  action: (view: EditorView) => void
}

const GROUPS: ToolGroup[] = [
  {
    items: [
      { label: 'H1', title: 'Заголовок 1', hint: 'Ctrl+1', action: formatH1 },
      { label: 'H2', title: 'Заголовок 2', hint: 'Ctrl+2', action: formatH2 },
      { label: 'H3', title: 'Заголовок 3', hint: 'Ctrl+3', action: formatH3 },
    ],
  },
  {
    items: [
      { label: 'B', title: 'Жирный', hint: 'Ctrl+B', action: formatBold },
      { label: 'I', title: 'Курсив', hint: 'Ctrl+I', action: formatItalic },
      { label: 'S', title: 'Зачёркнутый', hint: 'Ctrl+Shift+S', action: formatStrike },
      { label: '`', title: 'Инлайн код', hint: 'Ctrl+`', action: formatInlineCode },
      { label: '==', title: 'Выделение', hint: 'Ctrl+Shift+H', action: formatHighlight },
    ],
  },
  {
    items: [
      { label: '—', title: 'Ненумерованный список', hint: 'Ctrl+Shift+8', action: formatBullet },
      { label: '1.', title: 'Нумерованный список', hint: 'Ctrl+Shift+7', action: formatOrdered },
      { label: '☐', title: 'Задача (checkbox)', hint: 'Ctrl+Shift+9', action: formatTask },
      { label: '"', title: 'Цитата', action: formatQuote },
    ],
  },
  {
    items: [
      { label: '⊞', title: 'Таблица', action: formatTable },
      { label: '{}', title: 'Блок кода', action: formatCodeBlock },
      { label: '──', title: 'Горизонтальная линия', action: formatHR },
    ],
  },
  {
    items: [
      { label: '🔗', title: 'Ссылка', hint: 'Ctrl+K', action: formatLink },
      { label: '🖼', title: 'Изображение', action: formatImage },
    ],
  },
]

export function Toolbar({ viewRef }: Props) {
  const run = (action: (view: EditorView) => void) => {
    const view = viewRef.current
    if (view) action(view)
  }

  return (
    <div className={styles.toolbar}>
      {GROUPS.map((group, gi) => (
        <div key={gi} className={styles.group}>
          {group.items.map((item) => (
            <button
              key={item.label}
              className={styles.btn}
              title={item.hint ? `${item.title} (${item.hint})` : item.title}
              onMouseDown={(e) => {
                e.preventDefault() // prevent editor losing focus
                run(item.action)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
