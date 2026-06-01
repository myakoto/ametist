import { useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { useAppStore } from '../../store/appStore'
import { ThemeEditor } from './ThemeEditor'
import styles from './Settings.module.css'

type Tab = 'editor' | 'appearance'

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const { config, updateConfig } = useConfig()
  const { setSettingsOpen } = useAppStore()

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Настройки</span>
        <button className={styles.closeBtn} onClick={() => setSettingsOpen(false)}>
          ✕
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'editor' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('editor')}
        >
          Редактор
        </button>
        <button
          className={activeTab === 'appearance' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('appearance')}
        >
          Внешний вид
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'editor' && (
          <div className={styles.section}>
            <label className={styles.row}>
              <span>Размер шрифта</span>
              <input
                type="number"
                min={10}
                max={32}
                value={config.editor.font_size}
                onChange={(e) =>
                  updateConfig({ editor: { ...config.editor, font_size: +e.target.value } })
                }
                className={styles.numInput}
              />
            </label>
            <label className={styles.row}>
              <span>Перенос строк</span>
              <input
                type="checkbox"
                checked={config.editor.word_wrap}
                onChange={(e) =>
                  updateConfig({ editor: { ...config.editor, word_wrap: e.target.checked } })
                }
              />
            </label>
            <label className={styles.row}>
              <span>Номера строк</span>
              <input
                type="checkbox"
                checked={config.editor.line_numbers}
                onChange={(e) =>
                  updateConfig({ editor: { ...config.editor, line_numbers: e.target.checked } })
                }
              />
            </label>
            <label className={styles.row}>
              <span>Размер таба</span>
              <input
                type="number"
                min={1}
                max={8}
                value={config.editor.tab_size}
                onChange={(e) =>
                  updateConfig({ editor: { ...config.editor, tab_size: +e.target.value } })
                }
                className={styles.numInput}
              />
            </label>
            <label className={styles.row}>
              <span>Использовать табы</span>
              <input
                type="checkbox"
                checked={config.editor.use_tabs}
                onChange={(e) =>
                  updateConfig({ editor: { ...config.editor, use_tabs: e.target.checked } })
                }
              />
            </label>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className={styles.section}>
            <label className={styles.row}>
              <span>Тема</span>
              <select
                value={config.theme}
                onChange={(e) => updateConfig({ theme: e.target.value as 'dark' | 'light' })}
                className={styles.select}
              >
                <option value="dark">Тёмная</option>
                <option value="light">Светлая</option>
              </select>
            </label>
            <ThemeEditor />
          </div>
        )}
      </div>
    </aside>
  )
}
