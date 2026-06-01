import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../store/appStore'
import { useVault } from '../../hooks/useVault'
import styles from './Backlinks.module.css'

interface BacklinkMatch {
  line: number
  text: string
}

interface BacklinkResult {
  path: string
  name: string
  matches: BacklinkMatch[]
}

export function Backlinks() {
  const activeTab = useAppStore((s) => s.activeTab())
  const config = useAppStore((s) => s.config)
  const openFilePath = activeTab?.path ?? null
  const { openFile } = useVault()
  const [results, setResults] = useState<BacklinkResult[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const fileName = openFilePath?.split(/[\\/]/).pop() ?? ''

  useEffect(() => {
    if (!openFilePath || !config.vault_path) {
      setResults([])
      return
    }
    setLoading(true)
    invoke<BacklinkResult[]>('search_backlinks', {
      vaultPath: config.vault_path,
      targetName: fileName,
    })
      .then(setResults)
      .finally(() => setLoading(false))
  }, [openFilePath, config.vault_path, fileName])

  if (!openFilePath) return null

  const total = results.reduce((sum, r) => sum + r.matches.length, 0)

  return (
    <div className={styles.panel}>
      <button className={styles.header} onClick={() => setExpanded(!expanded)}>
        <span className={styles.arrow}>{expanded ? '▾' : '▸'}</span>
        <span className={styles.title}>Backlinks</span>
        <span className={styles.count}>{loading ? '…' : total}</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {results.length === 0 && !loading && (
            <div className={styles.empty}>Нет входящих ссылок</div>
          )}
          {results.map((result) => (
            <div key={result.path} className={styles.file}>
              <button
                className={styles.fileName}
                onClick={() => openFile(result.path)}
              >
                {result.name}
              </button>
              {result.matches.map((m) => (
                <button
                  key={m.line}
                  className={styles.match}
                  onClick={() => openFile(result.path)}
                  title={`Строка ${m.line}`}
                >
                  <span className={styles.lineNum}>{m.line}</span>
                  <span className={styles.lineText}>{m.text}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
