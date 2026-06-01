import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, MatchDecorator } from '@codemirror/view'
import { autocompletion, Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { FileNode } from '../../store/appStore'

// ─── Decoration: highlight [[wikilinks]] ────────────────────────────────────

const wikilinkMark = Decoration.mark({ class: 'cm-wikilink' })

const WIKILINK_RE = /\[\[([^\[\]\n]+)\]\]/g

const wikilinkDecorator = new MatchDecorator({
  regexp: WIKILINK_RE,
  decoration() {
    return wikilinkMark
  },
})

export function wikilinkHighlight() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = wikilinkDecorator.createDeco(view)
      }
      update(update: ViewUpdate) {
        this.decorations = wikilinkDecorator.updateDeco(update, this.decorations)
      }
    },
    { decorations: (v) => v.decorations }
  )
}

// ─── Click handler: open [[linked file]] ────────────────────────────────────

export function wikilinkClickHandler(
  onOpenByName: (name: string) => void
) {
  return EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      const doc = view.state.doc.toString()
      // find all wikilinks and check if click landed inside one
      let match: RegExpExecArray | null
      const re = /\[\[([^\[\]\n]+)\]\]/g
      while ((match = re.exec(doc)) !== null) {
        const start = match.index
        const end = match.index + match[0].length
        if (pos >= start && pos <= end) {
          // extract name (strip alias after | and heading after #)
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
    // match [[ followed by anything (no closing bracket yet)
    const match = ctx.matchBefore(/\[\[[^\]]*/)
    if (!match) return null
    // only complete if cursor is right after [[
    const query = match.text.slice(2) // text after [[

    const files = getFiles()
    const options: Completion[] = flatFiles(files)
      .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
      .map((name) => ({
        label: name,
        apply: (view: EditorView, completion: Completion, from: number, to: number) => {
          // replace from after [[ to current cursor
          view.dispatch({
            changes: { from, to, insert: completion.label + ']]' },
            selection: { anchor: from + completion.label.length + 2 },
          })
        },
        type: 'file',
        boost: 1,
      }))

    return {
      from: match.from + 2, // start options after [[
      options,
      validFor: /^[^\]]*$/,
    }
  }

  return autocompletion({
    override: [completionSource],
    icons: false,
    closeOnBlur: true,
  })
}

function flatFiles(nodes: FileNode[]): string[] {
  const names: string[] = []
  for (const node of nodes) {
    if (node.isDir) {
      if (node.children) names.push(...flatFiles(node.children))
    } else {
      names.push(node.name.replace(/\.md$/, ''))
    }
  }
  return names
}

// ─── Theme additions for wikilinks ──────────────────────────────────────────

export const wikilinkTheme = EditorView.baseTheme({
  '.cm-wikilink': {
    color: 'var(--syntax-link)',
    textDecoration: 'none',
    cursor: 'pointer',
    borderBottom: '1px solid var(--syntax-link)',
  },
  '.cm-wikilink:hover': {
    opacity: '0.8',
  },
})
