import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAppStore } from '../../store/appStore'
import { useVault } from '../../hooks/useVault'
import { buildExtensions } from './extensions'
import { Preview } from './Preview'
import { Toolbar } from './Toolbar'
import { EditorContextMenu } from './EditorContextMenu'
import styles from './Editor.module.css'

type ViewMode = 'edit' | 'split' | 'preview'

interface ContextMenuState {
  x: number
  y: number
  hasSelection: boolean
}

export function Editor() {
  const { openFilePath, openFileContent, config, vaultFiles, setOpenFileContent, setDirty } =
    useAppStore()
  const { openFile } = useVault()
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentPathRef = useRef<string | null>(null)

  const saveFile = async () => {
    const path = currentPathRef.current
    const view = viewRef.current
    if (!path || !view) return
    await invoke('write_file', { path, content: view.state.doc.toString() })
    setDirty(false)
  }

  useEffect(() => {
    if (!containerRef.current || viewMode === 'preview') return

    const extensions = buildExtensions({
      wordWrap: config.editor.word_wrap,
      lineNumbersEnabled: config.editor.line_numbers,
      tabSize: config.editor.tab_size,
      useTabs: config.editor.use_tabs,
      onSave: saveFile,
      getFiles: () => vaultFiles,
      onOpenByName: (name) => {
        const findFile = (nodes: typeof vaultFiles): string | null => {
          for (const n of nodes) {
            if (n.isDir && n.children) {
              const found = findFile(n.children)
              if (found) return found
            } else if (n.name === name + '.md' || n.name === name) {
              return n.path
            }
          }
          return null
        }
        const path = findFile(vaultFiles)
        if (path) openFile(path)
      },
      onUpdate: (update) => {
        if (!update.docChanged) return
        const content = update.state.doc.toString()
        setOpenFileContent(content)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(async () => {
          const path = currentPathRef.current
          const v = viewRef.current
          if (!path || !v) return
          await invoke('write_file', { path, content: v.state.doc.toString() })
          setDirty(false)
        }, 500)
      },
    })

    const state = EditorState.create({ doc: openFileContent, extensions })

    if (viewRef.current) viewRef.current.destroy()
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    currentPathRef.current = openFilePath

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      const hasSelection = !view.state.selection.main.empty
      setContextMenu({ x: e.clientX, y: e.clientY, hasSelection })
    }
    containerRef.current.addEventListener('contextmenu', handleContextMenu)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFilePath, config.editor, viewMode])

  useEffect(() => {
    const unlisten = listen<{ path: string }>('file_externally_modified', (event) => {
      if (event.payload.path !== currentPathRef.current) return
      invoke<string>('read_file', { path: event.payload.path }).then((content) => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } })
        setDirty(false)
      })
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
    <div className={styles.wrapper}>
      {/* Toolbar — visible in edit and split modes */}
      {viewMode !== 'preview' && <Toolbar viewRef={viewRef} />}

      {/* Mode switcher */}
      <div className={styles.modeBar}>
        <div className={styles.modeToggle}>
          {(['edit', 'split', 'preview'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={viewMode === mode ? styles.modeActive : styles.modeBtn}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'edit' ? 'Edit' : mode === 'split' ? 'Split' : 'Preview'}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {viewMode !== 'preview' && (
          <div
            ref={containerRef}
            className={styles.editor}
            style={{ fontSize: `${config.editor.font_size}px` }}
          />
        )}
        {viewMode === 'split' && <div className={styles.divider} />}
        {viewMode !== 'edit' && (
          <div className={viewMode === 'split' ? styles.previewPane : styles.previewFull}>
            <Preview content={openFileContent} />
          </div>
        )}
      </div>

      {contextMenu && viewRef.current && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          view={viewRef.current}
          hasSelection={contextMenu.hasSelection}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
