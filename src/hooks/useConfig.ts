import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore, AppConfig } from '../store/appStore'

export function useConfig() {
  const { config, setConfig } = useAppStore()

  const loadConfig = useCallback(async () => {
    const loaded = await invoke<AppConfig>('get_config')
    setConfig(loaded)
    return loaded
  }, [setConfig])

  const saveConfig = useCallback(
    async (updated: AppConfig) => {
      await invoke('set_config', { config: updated })
      setConfig(updated)
    },
    [setConfig]
  )

  const updateConfig = useCallback(
    async (patch: Partial<AppConfig>) => {
      const updated = { ...config, ...patch }
      await saveConfig(updated)
    },
    [config, saveConfig]
  )

  return { config, loadConfig, saveConfig, updateConfig }
}
