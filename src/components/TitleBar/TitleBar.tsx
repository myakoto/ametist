import { getCurrentWindow } from '@tauri-apps/api/window'
import { useAppStore } from '../../store/appStore'
import styles from './TitleBar.module.css'

export function TitleBar() {
  const { settingsOpen, setSettingsOpen } = useAppStore()
  const activeTab = useAppStore((s) => s.activeTab())

  const fileName = activeTab?.path.split(/[\\/]/).pop() ?? null
  const isDirty = activeTab?.isDirty ?? false
  const win = getCurrentWindow()

  return (
    <div className={styles.titlebar} data-tauri-drag-region>
      <div className={styles.appName}>Ametist</div>
      {fileName && (
        <div className={styles.fileName}>
          {isDirty && <span className={styles.dirtyDot} />}
          {fileName}
        </div>
      )}
      <div className={styles.spacer} data-tauri-drag-region />
      <button className={styles.controlBtn} title="Настройки" onClick={() => setSettingsOpen(!settingsOpen)}>⚙</button>
      <button className={styles.controlBtn} onClick={() => win.minimize()}>─</button>
      <button className={styles.controlBtn} onClick={() => win.toggleMaximize()}>□</button>
      <button className={`${styles.controlBtn} ${styles.closeBtn}`} onClick={() => win.close()}>✕</button>
    </div>
  )
}
