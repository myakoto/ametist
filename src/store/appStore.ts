import { create } from 'zustand'

export interface FileNode {
  name: string
  path: string
  isDir: boolean
  children?: FileNode[]
}

export interface EditorConfig {
  font_size: number
  word_wrap: boolean
  line_numbers: boolean
  tab_size: number
  use_tabs: boolean
}

export interface AppConfig {
  vault_path: string | null
  theme: 'dark' | 'light'
  custom_theme: Record<string, string>
  editor: EditorConfig
}

const DEFAULT_CONFIG: AppConfig = {
  vault_path: null,
  theme: 'dark',
  custom_theme: {},
  editor: {
    font_size: 14,
    word_wrap: true,
    line_numbers: false,
    tab_size: 2,
    use_tabs: false,
  },
}

interface AppState {
  config: AppConfig
  vaultFiles: FileNode[]
  openFilePath: string | null
  openFileContent: string
  isDirty: boolean
  sidebarVisible: boolean
  settingsOpen: boolean

  setConfig: (config: AppConfig) => void
  setVaultFiles: (files: FileNode[]) => void
  setOpenFile: (path: string | null, content: string) => void
  setOpenFileContent: (content: string) => void
  setDirty: (dirty: boolean) => void
  toggleSidebar: () => void
  setSettingsOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  config: DEFAULT_CONFIG,
  vaultFiles: [],
  openFilePath: null,
  openFileContent: '',
  isDirty: false,
  sidebarVisible: true,
  settingsOpen: false,

  setConfig: (config) => set({ config }),
  setVaultFiles: (vaultFiles) => set({ vaultFiles }),
  setOpenFile: (path, content) =>
    set({ openFilePath: path, openFileContent: content, isDirty: false }),
  setOpenFileContent: (content) => set({ openFileContent: content, isDirty: true }),
  setDirty: (isDirty) => set({ isDirty }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}))
