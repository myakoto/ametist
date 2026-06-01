import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAppStore, FileNode } from '../store/appStore'
import { useConfig } from './useConfig'

export function useVault() {
  const { config, updateConfig } = useConfig()
  const { setVaultFiles, openTab } = useAppStore()

  const refreshFiles = useCallback(
    async (vaultPath: string) => {
      const files = await invoke<FileNode[]>('list_vault_files', { vaultPath })
      setVaultFiles(files)
      return files
    },
    [setVaultFiles]
  )

  const openVaultDialog = useCallback(async () => {
    const path = await invoke<string | null>('open_vault_dialog')
    if (!path) return
    await updateConfig({ vault_path: path })
    await refreshFiles(path)
    return path
  }, [updateConfig, refreshFiles])

  const openFile = useCallback(
    async (path: string) => {
      // if already in tabs, just activate
      const existing = useAppStore.getState().tabs.find((t) => t.path === path)
      if (existing) {
        useAppStore.getState().openTab(path, existing.content)
        return
      }
      const content = await invoke<string>('read_file', { path })
      openTab(path, content)
    },
    [openTab]
  )

  /** Open by display name (wikilink target). Creates file if not found. */
  const openByName = useCallback(
    async (name: string) => {
      const vaultPath = useAppStore.getState().config.vault_path
      if (!vaultPath) return

      const findInTree = (nodes: FileNode[]): string | null => {
        for (const n of nodes) {
          if (n.isDir && n.children) {
            const found = findInTree(n.children)
            if (found) return found
          } else {
            const stem = n.name.replace(/\.md$/, '')
            if (stem.toLowerCase() === name.toLowerCase() || n.name.toLowerCase() === name.toLowerCase()) {
              return n.path
            }
          }
        }
        return null
      }

      const files = useAppStore.getState().vaultFiles
      const existing = findInTree(files)
      if (existing) {
        await openFile(existing)
        return
      }

      // file not found — create it
      const safeName = name.replace(/\s+/g, '_') + '.md'
      const newPath = `${vaultPath}\\${safeName}`
      await invoke('create_file', { path: newPath })
      const refreshed = await refreshFiles(vaultPath)
      void refreshed
      openTab(newPath, '')
    },
    [openFile, openTab, refreshFiles]
  )

  const createFile = useCallback(
    async (path: string) => {
      await invoke('create_file', { path })
      if (config.vault_path) await refreshFiles(config.vault_path)
    },
    [config.vault_path, refreshFiles]
  )

  const createDir = useCallback(
    async (path: string) => {
      await invoke('create_dir', { path })
      if (config.vault_path) await refreshFiles(config.vault_path)
    },
    [config.vault_path, refreshFiles]
  )

  const renameEntry = useCallback(
    async (oldPath: string, newPath: string) => {
      await invoke('rename_entry', { oldPath, newPath })
      if (config.vault_path) await refreshFiles(config.vault_path)
    },
    [config.vault_path, refreshFiles]
  )

  const deleteEntry = useCallback(
    async (path: string) => {
      await invoke('delete_entry', { path })
      useAppStore.getState().closeTab(path)
      if (config.vault_path) await refreshFiles(config.vault_path)
    },
    [config.vault_path, refreshFiles]
  )

  const listenVaultChanges = useCallback(async () => {
    if (!config.vault_path) return
    const vaultPath = config.vault_path
    return listen('vault_changed', () => {
      refreshFiles(vaultPath)
    })
  }, [config.vault_path, refreshFiles])

  return {
    vaultPath: config.vault_path,
    openVaultDialog,
    refreshFiles,
    openFile,
    openByName,
    createFile,
    createDir,
    renameEntry,
    deleteEntry,
    listenVaultChanges,
  }
}
