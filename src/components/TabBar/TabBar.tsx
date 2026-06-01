import { useAppStore } from '../../store/appStore'
import styles from './TabBar.module.css'

export function TabBar() {
  const { tabs, activeTabPath, closeTab } = useAppStore()

  if (tabs.length === 0) return null

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => {
        const name = tab.path.split(/[\\/]/).pop() ?? tab.path
        const isActive = tab.path === activeTabPath

        return (
          <div
            key={tab.path}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => useAppStore.getState().openTab(tab.path, tab.content)}
            title={tab.path}
          >
            {tab.isDirty && <span className={styles.dirty} />}
            <span className={styles.name}>{name}</span>
            <button
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation()
                closeTab(tab.path)
              }}
              title="Закрыть"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
