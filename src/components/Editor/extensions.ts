import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView, keymap, lineNumbers, placeholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

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
      },
      '.cm-cursor': {
        borderLeftColor: 'var(--editor-cursor)',
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--editor-selection) !important',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--editor-line-highlight)',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--text-muted)',
        border: 'none',
        borderRight: '1px solid var(--border)',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px',
      },
      '.cm-scroller': {
        fontFamily: 'var(--font-editor)',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftWidth: '2px',
      },
    },
    { dark: true }
  )
}

export function buildSyntaxHighlight() {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: tags.heading1, color: 'var(--syntax-heading)', fontWeight: 'bold', fontSize: '1.2em' },
      { tag: tags.heading2, color: 'var(--syntax-heading)', fontWeight: 'bold' },
      { tag: tags.heading3, color: 'var(--syntax-heading)', fontWeight: 'bold' },
      { tag: tags.strong, color: 'var(--syntax-bold)', fontWeight: 'bold' },
      { tag: tags.emphasis, color: 'var(--syntax-italic)', fontStyle: 'italic' },
      { tag: tags.monospace, color: 'var(--syntax-code)' },
      { tag: tags.url, color: 'var(--syntax-link)' },
      { tag: tags.link, color: 'var(--syntax-link)' },
      { tag: tags.comment, color: 'var(--syntax-comment)' },
      { tag: tags.strikethrough, textDecoration: 'line-through' },
    ])
  )
}

export function buildExtensions(opts: {
  wordWrap: boolean
  lineNumbersEnabled: boolean
  tabSize: number
  useTabs: boolean
  onSave: () => void
}) {
  const extensions = [
    history(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
      {
        key: 'Ctrl-s',
        run: () => {
          opts.onSave()
          return true
        },
      },
    ]),
    markdown({ base: markdownLanguage }),
    buildAmetistTheme(),
    buildSyntaxHighlight(),
    EditorState.tabSize.of(opts.tabSize),
    EditorView.contentAttributes.of({ spellcheck: 'true' }),
    placeholder('Start writing...'),
  ]

  if (opts.wordWrap) {
    extensions.push(EditorView.lineWrapping)
  }

  if (opts.lineNumbersEnabled) {
    extensions.push(lineNumbers())
  }

  return extensions
}
