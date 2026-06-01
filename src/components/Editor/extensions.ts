import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView, keymap, lineNumbers, placeholder, ViewUpdate } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { tags } from '@lezer/highlight'
import { wikilinkHighlight, wikilinkClickHandler, wikilinkCompletion, wikilinkTheme } from './wikilinks'
import { FileNode } from '../../store/appStore'
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
  formatLink,
} from './format'

export function buildAmetistTheme() {
  return EditorView.theme(
    {
      '&': {
        height: '100%',
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--editor-text)',
        fontFamily: 'var(--font-editor)',
        fontSize: 'var(--font-size-editor)',
      },
      '.cm-content': {
        caretColor: 'var(--editor-cursor)',
        padding: '16px 0',
        maxWidth: '860px',
        margin: '0 auto',
      },
      '.cm-cursor': { borderLeftColor: 'var(--editor-cursor)' },
      '&.cm-focused .cm-cursor': { borderLeftWidth: '2px' },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--editor-selection) !important',
      },
      '.cm-activeLine': { backgroundColor: 'var(--editor-line-highlight)' },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--text-muted)',
        border: 'none',
        borderRight: '1px solid var(--border)',
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px' },
      '.cm-scroller': { fontFamily: 'var(--font-editor)' },
      // autocomplete dropdown
      '.cm-tooltip': {
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      },
      '.cm-tooltip-autocomplete ul li[aria-selected]': {
        backgroundColor: 'var(--bg-active)',
        color: 'var(--text-primary)',
      },
    },
    { dark: true }
  )
}

export function buildSyntaxHighlight() {
  return syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: tags.heading1,
        color: 'var(--syntax-heading)',
        fontWeight: 'bold',
        fontSize: '1.3em',
      },
      { tag: tags.heading2, color: 'var(--syntax-heading)', fontWeight: 'bold', fontSize: '1.15em' },
      { tag: tags.heading3, color: 'var(--syntax-heading)', fontWeight: 'bold' },
      { tag: tags.heading4, color: 'var(--syntax-heading)' },
      { tag: tags.strong, color: 'var(--syntax-bold)', fontWeight: 'bold' },
      { tag: tags.emphasis, color: 'var(--syntax-italic)', fontStyle: 'italic' },
      { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--text-muted)' },
      { tag: tags.monospace, color: 'var(--syntax-code)' },
      { tag: tags.url, color: 'var(--syntax-link)' },
      { tag: tags.link, color: 'var(--syntax-link)' },
      { tag: tags.comment, color: 'var(--syntax-comment)' },
      { tag: tags.quote, color: 'var(--text-secondary)', fontStyle: 'italic' },
      { tag: tags.meta, color: 'var(--text-muted)' },
      { tag: tags.processingInstruction, color: 'var(--text-muted)' },
    ])
  )
}

// Smart Enter: continue list items
function smartEnter(view: EditorView): boolean {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  const text = line.text

  // Bullet list: - , * , +
  const bulletMatch = text.match(/^(\s*)([-*+])\s(\[[ x]\]\s)?/)
  if (bulletMatch) {
    const [, indent, marker, checkbox] = bulletMatch
    // empty item — remove it
    if (text.trim() === `${marker}` || text.trim() === `${marker} [ ]`) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
        userEvent: 'input',
      })
      return true
    }
    const next = checkbox ? `\n${indent}${marker} [ ] ` : `\n${indent}${marker} `
    view.dispatch({
      changes: { from, insert: next },
      selection: { anchor: from + next.length },
      userEvent: 'input',
    })
    return true
  }

  // Ordered list: 1. 2. etc
  const orderedMatch = text.match(/^(\s*)(\d+)\.\s/)
  if (orderedMatch) {
    const [, indent, num] = orderedMatch
    if (text.trim() === `${num}.`) {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
        userEvent: 'input',
      })
      return true
    }
    const next = `\n${indent}${parseInt(num) + 1}. `
    view.dispatch({
      changes: { from, insert: next },
      selection: { anchor: from + next.length },
      userEvent: 'input',
    })
    return true
  }

  // Blockquote
  const quoteMatch = text.match(/^(\s*>\s)/)
  if (quoteMatch) {
    if (text.trim() === '>') {
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: '' },
        selection: { anchor: line.from },
        userEvent: 'input',
      })
      return true
    }
    const next = `\n${quoteMatch[1]}`
    view.dispatch({
      changes: { from, insert: next },
      selection: { anchor: from + next.length },
      userEvent: 'input',
    })
    return true
  }

  return false
}

// Auto-pairs for markdown markers: ** _ `` ~~ ==
const mdPairs = [
  { open: '**', close: '**' },
  { open: '_', close: '_' },
  { open: '`', close: '`' },
  { open: '~~', close: '~~' },
  { open: '==', close: '==' },
]

function buildMdAutoPairs() {
  return EditorView.inputHandler.of((view, _from, _to, text) => {
    for (const pair of mdPairs) {
      if (text === pair.open[0]) {
        const sel = view.state.selection.main
        if (sel.from !== sel.to) {
          // wrap selection
          const selected = view.state.sliceDoc(sel.from, sel.to)
          view.dispatch({
            changes: { from: sel.from, to: sel.to, insert: pair.open + selected + pair.close },
            selection: { anchor: sel.from + pair.open.length, head: sel.to + pair.open.length },
            userEvent: 'input',
          })
          return true
        }
      }
    }
    return false
  })
}

export function buildExtensions(opts: {
  wordWrap: boolean
  lineNumbersEnabled: boolean
  tabSize: number
  useTabs: boolean
  onSave: () => void
  onUpdate?: (update: ViewUpdate) => void
  getFiles?: () => FileNode[]
  onOpenByName?: (name: string) => void
}) {
  const extensions = [
    history(),
    closeBrackets(),
    buildMdAutoPairs(),
    keymap.of([
      // formatting shortcuts
      { key: 'Ctrl-b', run: (view) => formatBold(view) },
      { key: 'Ctrl-i', run: (view) => formatItalic(view) },
      { key: 'Ctrl-shift-s', run: (view) => formatStrike(view) },
      { key: 'Ctrl-`', run: (view) => formatInlineCode(view) },
      { key: 'Ctrl-k', run: (view) => formatLink(view) },
      { key: 'Ctrl-shift-h', run: (view) => formatHighlight(view) },
      // headings
      { key: 'Ctrl-1', run: (view) => formatH1(view) },
      { key: 'Ctrl-2', run: (view) => formatH2(view) },
      { key: 'Ctrl-3', run: (view) => formatH3(view) },
      // lists
      { key: 'Ctrl-shift-7', run: (view) => formatOrdered(view) },
      { key: 'Ctrl-shift-8', run: (view) => formatBullet(view) },
      { key: 'Ctrl-shift-9', run: (view) => formatTask(view) },
      // save
      { key: 'Ctrl-s', run: () => { opts.onSave(); return true } },
      // smart enter
      { key: 'Enter', run: smartEnter },
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    markdown({ base: markdownLanguage }),
    buildAmetistTheme(),
    buildSyntaxHighlight(),
    EditorState.tabSize.of(opts.tabSize),
    EditorView.contentAttributes.of({ spellcheck: 'true' }),
    placeholder('Start writing...'),
  ]

  if (opts.wordWrap) extensions.push(EditorView.lineWrapping)
  if (opts.lineNumbersEnabled) extensions.push(lineNumbers())
  if (opts.onUpdate) extensions.push(EditorView.updateListener.of(opts.onUpdate))

  // wikilinks
  const getFiles = opts.getFiles ?? (() => [])
  extensions.push(wikilinkHighlight(getFiles))
  extensions.push(wikilinkTheme)
  extensions.push(wikilinkCompletion(getFiles))
  if (opts.onOpenByName) extensions.push(wikilinkClickHandler(opts.onOpenByName))

  return extensions
}
