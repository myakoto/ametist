import { useEffect, useRef, useCallback } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../../store/appStore'
import { buildExtensions } from './extensions'
import styles from './Editor.module.css'

export function Editor() {
  const { openFilePath, openFileContent, config, setOpenFileContent, setDirty } = useAppStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentPathRef = useRef<string | null>(null)

  const saveFile = useCallback(async () => {
    const path = currentPathRef.current
    const view = viewRef.current
    if (!path || !view) return
    const content = view.state.doc.toString()
    await invoke('write_file', { path, content })
    setDirty(false)
  }, [setDirty])

  // build/rebuild editor when file or settings change
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = buildExtensions({
      wordWrap: config.editor.word_wrap,
      lineNumbersEnabled: config.editor.line_numbers,
      tabSize: config.editor.tab_size,
      useTabs: config.editor.use_tabs,
      onSave: saveFile,
    })

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString()
        setOpenFileContent(content)

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          const path = currentPathRef.current
          const v = viewRef.current
          if (!path || !v) return
          invoke('write_file', { path, content: v.state.doc.toString() }).then(() =>
            setDirty(false)
          )
        }, 500)
      }
    })

    const state = EditorState.create({
      doc: openFileContent,
      extensions: [...extensions, updateListener],
    })

    if (viewRef.current) {
      viewRef.current.destroy()
    }

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    currentPathRef.current = openFilePath

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFilePath, config.editor])

  // listen for external modifications
  useEffect(() => {
    const unlisten = listen<{ path: string }>('file_externally_modified', (event) => {
      if (event.payload.path === currentPathRef.current) {
        // could show a toast — for now auto-reload
        invoke<string>('read_file', { path: event.payload.path }).then((content) => {
          const view = viewRef.current
          if (!view) return
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: content },
          })
          setDirty(false)
        })
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [setDirty])

  if (!openFilePath) {
    return (
      <div className={styles.empty}>
        <p>Выберите файл или создайте новую заметку</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={styles.editor}
      style={{ fontSize: `${config.editor.font_size}px` }}
    />
  )
}
