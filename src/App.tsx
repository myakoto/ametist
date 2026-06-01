import { useEffect } from 'react'
import { useAppStore } from './store/appStore'
import { useConfig } from './hooks/useConfig'
import { useVault } from './hooks/useVault'
import { TitleBar } from './components/TitleBar/TitleBar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Editor } from './components/Editor/Editor'
import { Settings } from './components/Settings/Settings'
import { Backlinks } from './components/Backlinks/Backlinks'
import styles from './App.module.css'

export function applyTheme(customVars: Record<string, string>) {
  const root = document.documentElement
  // clear all custom overrides first
  root.removeAttribute('style')
  Object.entries(customVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

function loadThemeCSS(theme: 'dark' | 'light') {
  const existing = document.getElementById('app-theme')
  if (existing) existing.remove()
  const link = document.createElement('link')
  link.id = 'app-theme'
  link.rel = 'stylesheet'
  link.href = theme === 'dark' ? '/src/themes/dark.css' : '/src/themes/light.css'
  document.head.appendChild(link)
}

export default function App() {
  const { sidebarVisible, settingsOpen, config } = useAppStore()
  const { loadConfig } = useConfig()
  const { refreshFiles, listenVaultChanges } = useVault()

  useEffect(() => {
    loadConfig().then((cfg) => {
      loadThemeCSS(cfg.theme as 'dark' | 'light')
      applyTheme(cfg.custom_theme)
      if (cfg.vault_path) {
        refreshFiles(cfg.vault_path)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // re-apply theme when it changes in settings
  useEffect(() => {
    loadThemeCSS(config.theme)
    applyTheme(config.custom_theme)
  }, [config.theme, config.custom_theme])

  // start vault watcher
  useEffect(() => {
    let unlisten: (() => void) | undefined
    listenVaultChanges().then((fn) => {
      unlisten = fn
    })
    return () => {
      unlisten?.()
    }
  }, [listenVaultChanges])

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        useAppStore.getState().toggleSidebar()
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        const { settingsOpen: open, setSettingsOpen } = useAppStore.getState()
        setSettingsOpen(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const hasVault = !!config.vault_path

  if (!hasVault) {
    return <WelcomeScreen />
  }

  return (
    <div className={styles.app}>
      <TitleBar />
      <div className={styles.body}>
        {sidebarVisible && <Sidebar />}
        <main className={styles.main}>
          <Editor />
          <Backlinks />
        </main>
        {settingsOpen && <Settings />}
      </div>
      <StatusBar />
    </div>
  )
}

function WelcomeScreen() {
  const { openVaultDialog } = useVault()
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
      }}
    >
      <h1 style={{ fontSize: 28, color: 'var(--text-primary)', fontWeight: 700 }}>Ametist</h1>
      <p style={{ fontSize: 14 }}>Выберите папку с заметками, чтобы начать</p>
      <button
        onClick={openVaultDialog}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          background: 'var(--accent)',
          color: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Открыть папку
      </button>
    </div>
  )
}

function StatusBar() {
  const { openFilePath, openFileContent } = useAppStore()

  const fileName = openFilePath?.split(/[\\/]/).pop() ?? ''
  const lines = openFileContent ? openFileContent.split('\n').length : 0
  const words = openFileContent ? openFileContent.trim().split(/\s+/).filter(Boolean).length : 0

  return (
    <div
      style={{
        height: 'var(--statusbar-height)',
        background: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 16,
        fontSize: 11,
        color: 'var(--text-muted)',
        flexShrink: 0,
      }}
    >
      {fileName && <span>{fileName}</span>}
      {openFilePath && (
        <>
          <span>{lines} строк</span>
          <span>{words} слов</span>
          <span>UTF-8</span>
        </>
      )}
    </div>
  )
}
