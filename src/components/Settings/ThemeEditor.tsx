import { useConfig } from '../../hooks/useConfig'
import { applyTheme } from '../../App'
import styles from './Settings.module.css'

const THEME_VARS = [
  { key: '--bg-primary', label: 'Фон основной' },
  { key: '--bg-secondary', label: 'Фон панелей' },
  { key: '--bg-tertiary', label: 'Фон заголовка' },
  { key: '--bg-hover', label: 'Hover' },
  { key: '--bg-active', label: 'Активный элемент' },
  { key: '--text-primary', label: 'Текст основной' },
  { key: '--text-secondary', label: 'Текст вторичный' },
  { key: '--text-muted', label: 'Текст приглушённый' },
  { key: '--accent', label: 'Акцент' },
  { key: '--accent-hover', label: 'Акцент hover' },
  { key: '--border', label: 'Границы' },
  { key: '--editor-bg', label: 'Фон редактора' },
  { key: '--editor-text', label: 'Текст редактора' },
  { key: '--editor-cursor', label: 'Курсор' },
  { key: '--editor-selection', label: 'Выделение' },
  { key: '--syntax-heading', label: 'Заголовки' },
  { key: '--syntax-bold', label: 'Жирный' },
  { key: '--syntax-italic', label: 'Курсив' },
  { key: '--syntax-code', label: 'Код' },
  { key: '--syntax-link', label: 'Ссылки' },
]

export function ThemeEditor() {
  const { config, updateConfig } = useConfig()

  const getVar = (key: string) => {
    if (config.custom_theme[key]) return config.custom_theme[key]
    return getComputedStyle(document.documentElement).getPropertyValue(key).trim()
  }

  const handleChange = async (key: string, value: string) => {
    const custom_theme = { ...config.custom_theme, [key]: value }
    applyTheme(custom_theme)
    await updateConfig({ custom_theme })
  }

  const handleReset = async () => {
    applyTheme({})
    await updateConfig({ custom_theme: {} })
  }

  return (
    <div className={styles.themeEditor}>
      <div className={styles.varList}>
        {THEME_VARS.map(({ key, label }) => (
          <div key={key} className={styles.varRow}>
            <label className={styles.varLabel}>{label}</label>
            <div className={styles.varControl}>
              <input
                type="color"
                value={normalizeColor(getVar(key))}
                onChange={(e) => handleChange(key, e.target.value)}
                className={styles.colorPicker}
              />
              <span className={styles.varKey}>{key}</span>
            </div>
          </div>
        ))}
      </div>
      <button className={styles.resetBtn} onClick={handleReset}>
        Сбросить тему
      </button>
    </div>
  )
}

function normalizeColor(value: string): string {
  if (!value) return '#000000'
  if (value.startsWith('#') && value.length === 7) return value
  // try to parse hex
  const hex = value.replace(/[^0-9a-fA-F]/g, '')
  if (hex.length === 6) return '#' + hex
  return '#000000'
}
