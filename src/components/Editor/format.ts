import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

// Wrap selected text with marker, or insert markers and place cursor between them
function wrapSelection(view: EditorView, marker: string, markerEnd?: string): boolean {
  const end = markerEnd ?? marker
  const changes = view.state.changeByRange((range) => {
    const selected = view.state.sliceDoc(range.from, range.to)
    if (selected.startsWith(marker) && selected.endsWith(end)) {
      // unwrap
      const inner = selected.slice(marker.length, selected.length - end.length)
      return {
        changes: { from: range.from, to: range.to, insert: inner },
        range: EditorSelection.range(range.from, range.from + inner.length),
      }
    }
    const insert = marker + selected + end
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.range(
        range.from + marker.length,
        range.from + marker.length + selected.length
      ),
    }
  })
  view.dispatch(changes, { scrollIntoView: true, userEvent: 'input' })
  view.focus()
  return true
}

// Prepend/toggle a line prefix (heading, list, quote)
function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const changes = view.state.changeByRange((range) => {
    const line = view.state.doc.lineAt(range.from)
    const text = line.text
    if (text.startsWith(prefix)) {
      const newText = text.slice(prefix.length)
      return {
        changes: { from: line.from, to: line.to, insert: newText },
        range: EditorSelection.cursor(Math.max(line.from, range.from - prefix.length)),
      }
    }
    return {
      changes: { from: line.from, insert: prefix },
      range: EditorSelection.cursor(range.from + prefix.length),
    }
  })
  view.dispatch(changes, { scrollIntoView: true, userEvent: 'input' })
  view.focus()
  return true
}

// Insert block at cursor (code block, hr, table)
function insertBlock(view: EditorView, block: string, cursorOffset?: number): boolean {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const prefix = line.text.trim() === '' ? '' : '\n'
  const insert = prefix + block
  view.dispatch({
    changes: { from, insert },
    selection: EditorSelection.cursor(from + insert.length - (cursorOffset ?? 0)),
    scrollIntoView: true,
    userEvent: 'input',
  })
  view.focus()
  return true
}

export const formatBold = (view: EditorView) => wrapSelection(view, '**')
export const formatItalic = (view: EditorView) => wrapSelection(view, '_')
export const formatStrike = (view: EditorView) => wrapSelection(view, '~~')
export const formatInlineCode = (view: EditorView) => wrapSelection(view, '`')
export const formatHighlight = (view: EditorView) => wrapSelection(view, '==')

export const formatH1 = (view: EditorView) => toggleLinePrefix(view, '# ')
export const formatH2 = (view: EditorView) => toggleLinePrefix(view, '## ')
export const formatH3 = (view: EditorView) => toggleLinePrefix(view, '### ')
export const formatBullet = (view: EditorView) => toggleLinePrefix(view, '- ')
export const formatOrdered = (view: EditorView) => toggleLinePrefix(view, '1. ')
export const formatTask = (view: EditorView) => toggleLinePrefix(view, '- [ ] ')
export const formatQuote = (view: EditorView) => toggleLinePrefix(view, '> ')

export const formatLink = (view: EditorView): boolean => {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const insert = selected ? `[${selected}]()` : '[]()'
  const cursorPos = selected ? from + selected.length + 3 : from + 3
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(cursorPos),
    scrollIntoView: true,
    userEvent: 'input',
  })
  view.focus()
  return true
}

export const formatImage = (view: EditorView): boolean => {
  const insert = '![]()'
  const { from } = view.state.selection.main
  view.dispatch({
    changes: { from, insert },
    selection: EditorSelection.cursor(from + 4),
    scrollIntoView: true,
    userEvent: 'input',
  })
  view.focus()
  return true
}

export const formatCodeBlock = (view: EditorView): boolean =>
  insertBlock(view, '```\n\n```', 4)

export const formatHR = (view: EditorView): boolean =>
  insertBlock(view, '\n---\n')

export const formatTable = (view: EditorView): boolean =>
  insertBlock(
    view,
    '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n'
  )
