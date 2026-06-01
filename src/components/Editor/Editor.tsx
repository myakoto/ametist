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
import { TabBar } from '../TabBar/TabBar'
import { EditorContextMenu } from './EditorContextMenu'
import styles from './Editor.module.css'

type ViewMode = 'edit' | 'split' | 'preview'

interface ContextMenuState {
  x: number
  y: number
  hasSelection: boolean
}

export function Editor() {
  const { config, vaultFiles, activeTabPath, setTabContent, setTabDirty } = useAppStore()
  const activeTab = useAppStore((s) => s.activeTab())
  const { openByName } = useVault()

  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activePathRef = useRef<string | null>(null)

  const saveNow = async (path: string, content: string) => {
    await invoke('write_file', { path, content })
    setTabDirty(path, false)
  }

  // Rebuild editor when active tab changes or editor settings change
  useEffect(() => {
    if (!containerRef.current || viewMode === 'preview') return
    if (!activeTab) {
      if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null }
      return
    }

    activePathRef.current = activeTab.path

    const extensions = buildExtensions({
      wordWrap: config.editor.word_wrap,
      lineNumbersEnabled: config.editor.line_numbers,
      tabSize: config.editor.tab_size,
      useTabs: config.editor.use_tabs,
      onSave: () => {
        const view = viewRef.current
        const path = activePathRef.current
        if (view && path) saveNow(path, view.state.doc.toString())
      },
      getFiles: () => vaultFiles,
      onOpenByName: (name) => openByName(name),
      onUpdate: (update) => {
        if (!update.docChanged) return
        const path = activePathRef.current
        if (!path) return
        const content = update.state.doc.toString()
        setTabContent(path, content)
        setTabDirty(path, true)
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(() => {
          const view = viewRef.current
          if (view && path) saveNow(path, view.state.doc.toString())
        }, 500)
      },
    })

    if (viewRef.current) viewRef.current.destroy()

    const view = new EditorView({
      state: EditorState.create({ doc: activeTab.content, extensions }),
      parent: containerRef.current,
    })
    viewRef.current = view

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, hasSelection: !view.state.selection.main.empty })
    }
    containerRef.current.addEventListener('contextmenu', handleContextMenu)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabPath, config.editor, viewMode])

  // Listen for external file modifications
  useEffect(() => {
    const unlisten = listen<{ path: string }>('file_externally_modified', (event) => {
      if (event.payload.path !== activePathRef.current) return
      invoke<string>('read_file', { path: event.payload.path }).then((content) => {
        const view = viewRef.current
        if (!view) return
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } })
        setTabDirty(event.payload.path, false)
      })
    })
    return () => { unlisten.then((fn) => fn()) }
  }, [setTabDirty])

  if (!activeTab) {
    return (
      <div className={styles.wrapper}>
        <TabBar />
        <div className={styles.empty}>
          <p>Выберите файл или создайте новую заметку</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <TabBar />

      {viewMode !== 'preview' && <Toolbar viewRef={viewRef} />}

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
            <Preview content={activeTab.content} />
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
