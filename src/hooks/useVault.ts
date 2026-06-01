import { useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useAppStore, FileNode } from '../store/appStore'
import { useConfig } from './useConfig'

export function useVault() {
  const { config, updateConfig } = useConfig()
  const { setVaultFiles, setOpenFile } = useAppStore()

  const refreshFiles = useCallback(
    async (vaultPath: string) => {
      const files = await invoke<FileNode[]>('list_vault_files', { vaultPath })
      setVaultFiles(files)
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
      const content = await invoke<string>('read_file', { path })
      setOpenFile(path, content)
    },
    [setOpenFile]
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
    createFile,
    createDir,
    renameEntry,
    deleteEntry,
    listenVaultChanges,
  }
}
