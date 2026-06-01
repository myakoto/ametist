import { useAppStore } from '../../store/appStore'
import { useVault } from '../../hooks/useVault'
import { FileTree } from './FileTree'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const { vaultFiles, openFilePath, config } = useAppStore()
  const { openFile, createFile, createDir, renameEntry, deleteEntry } = useVault()

  const handleNewNote = async () => {
    if (!config.vault_path) return
    const base = config.vault_path
    let name = 'Untitled.md'
    let i = 1
    // find unique name
    while (vaultFiles.some((f) => f.name === name)) {
      name = `Untitled ${i++}.md`
    }
    await createFile(`${base}\\${name}`)
    await openFile(`${base}\\${name}`)
  }

  const handleNewFolder = async () => {
    if (!config.vault_path) return
    let name = 'New Folder'
    let i = 1
    while (vaultFiles.some((f) => f.name === name && f.isDir)) {
      name = `New Folder ${i++}`
    }
    await createDir(`${config.vault_path}\\${name}`)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.vaultName}>
          {config.vault_path?.split(/[\\/]/).pop() ?? 'Vault'}
        </span>
        <div className={styles.actions}>
          <button title="Новая заметка" onClick={handleNewNote}>
            +
          </button>
          <button title="Новая папка" onClick={handleNewFolder}>
            ⊕
          </button>
        </div>
      </div>
      <div className={styles.treeWrapper}>
        <FileTree
          files={vaultFiles}
          activePath={openFilePath}
          onOpenFile={openFile}
          onRename={renameEntry}
          onDelete={deleteEntry}
        />
      </div>
    </aside>
  )
}
