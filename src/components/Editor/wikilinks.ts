import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { autocompletion, Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { FileNode } from '../../store/appStore'

const WIKILINK_RE = /\[\[([^\[\]\n]+)\]\]/g

const wikilinkMark = Decoration.mark({ class: 'cm-wikilink' })
const wikilinkBrokenMark = Decoration.mark({ class: 'cm-wikilink cm-wikilink-broken' })

function buildFileSet(nodes: FileNode[]): Set<string> {
  const set = new Set<string>()
  const walk = (items: FileNode[]) => {
    for (const n of items) {
      if (n.isDir) { if (n.children) walk(n.children) }
      else set.add(n.name.replace(/\.md$/, '').toLowerCase())
    }
  }
  walk(nodes)
  return set
}

// ─── Decoration: highlight [[wikilinks]] with existence check ────────────────

export function wikilinkHighlight(getFiles: () => FileNode[]) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.build(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.build(update.view)
        }
      }

      build(view: EditorView): DecorationSet {
        const fileSet = buildFileSet(getFiles())
        const builder = new RangeSetBuilder<Decoration>()

        for (const { from, to } of view.visibleRanges) {
          const text = view.state.doc.sliceString(from, to)
          WIKILINK_RE.lastIndex = 0
          let match: RegExpExecArray | null
          while ((match = WIKILINK_RE.exec(text)) !== null) {
            const start = from + match.index
            const end = start + match[0].length
            const inner = match[1].split('|')[0].split('#')[0].trim().toLowerCase()
            const exists = fileSet.has(inner)
            builder.add(start, end, exists ? wikilinkMark : wikilinkBrokenMark)
          }
        }

        return builder.finish()
      }
    },
    { decorations: (v) => v.decorations }
  )
}

// ─── Click handler: open [[linked file]] ────────────────────────────────────

export function wikilinkClickHandler(onOpenByName: (name: string) => void) {
  return EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      const doc = view.state.doc.toString()
      WIKILINK_RE.lastIndex = 0
      let match: RegExpExecArray | null
      while ((match = WIKILINK_RE.exec(doc)) !== null) {
        if (pos >= match.index && pos <= match.index + match[0].length) {
          const inner = match[1].split('|')[0].split('#')[0].trim()
          onOpenByName(inner)
          return true
        }
      }
      return false
    },
  })
}

// ─── Autocomplete: suggest files when typing [[ ──────────────────────────────

export function wikilinkCompletion(getFiles: () => FileNode[]) {
  const completionSource = (ctx: CompletionContext): CompletionResult | null => {
    const match = ctx.matchBefore(/\[\[[^\]]*/);
    if (!match) return null
    const query = match.text.slice(2)

    const options: Completion[] = flatFileNames(getFiles())
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .map((name) => ({
        label: name,
        apply: (view: EditorView, _c: Completion, from: number, to: number) => {
          view.dispatch({
            changes: { from, to, insert: name + ']]' },
            selection: { anchor: from + name.length + 2 },
          })
        },
        type: 'file',
        boost: 1,
      }))

    return { from: match.from + 2, options, validFor: /^[^\]]*$/ }
  }

  return autocompletion({ override: [completionSource], icons: false, closeOnBlur: true })
}

function flatFileNames(nodes: FileNode[]): string[] {
  const names: string[] = []
  const walk = (items: FileNode[]) => {
    for (const n of items) {
      if (n.isDir) { if (n.children) walk(n.children) }
      else names.push(n.name.replace(/\.md$/, ''))
    }
  }
  walk(nodes)
  return names
}

// ─── Theme ──────────────────────────────────────────────────────────────────

export const wikilinkTheme = EditorView.baseTheme({
  '.cm-wikilink': {
    color: 'var(--syntax-link)',
    cursor: 'pointer',
    borderBottom: '1px solid var(--syntax-link)',
  },
  '.cm-wikilink-broken': {
    color: 'var(--text-muted)',
    borderBottomColor: 'var(--text-muted)',
    borderBottomStyle: 'dashed',
  },
  '.cm-wikilink:hover': { opacity: '0.75' },
})
