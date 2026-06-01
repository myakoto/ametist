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

export interface Tab {
  path: string
  content: string
  isDirty: boolean
}

const DEFAULT_CONFIG: AppConfig = {
  vault_path: null,
  theme: 'dark',
  custom_theme: {},
  editor: { font_size: 14, word_wrap: true, line_numbers: false, tab_size: 2, use_tabs: false },
}

interface AppState {
  config: AppConfig
  vaultFiles: FileNode[]
  tabs: Tab[]
  activeTabPath: string | null
  sidebarVisible: boolean
  settingsOpen: boolean

  // derived helpers
  activeTab: () => Tab | null
  openFilePath: () => string | null
  openFileContent: () => string
  isDirty: () => boolean

  // actions
  setConfig: (config: AppConfig) => void
  setVaultFiles: (files: FileNode[]) => void
  openTab: (path: string, content: string) => void
  closeTab: (path: string) => void
  setTabContent: (path: string, content: string) => void
  setTabDirty: (path: string, dirty: boolean) => void
  toggleSidebar: () => void
  setSettingsOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  config: DEFAULT_CONFIG,
  vaultFiles: [],
  tabs: [],
  activeTabPath: null,
  sidebarVisible: true,
  settingsOpen: false,

  // derived
  activeTab: () => get().tabs.find((t) => t.path === get().activeTabPath) ?? null,
  openFilePath: () => get().activeTabPath,
  openFileContent: () => get().activeTab()?.content ?? '',
  isDirty: () => get().activeTab()?.isDirty ?? false,

  // actions
  setConfig: (config) => set({ config }),
  setVaultFiles: (vaultFiles) => set({ vaultFiles }),

  openTab: (path, content) => {
    set((s) => {
      const existing = s.tabs.find((t) => t.path === path)
      if (existing) {
        return { activeTabPath: path }
      }
      return {
        tabs: [...s.tabs, { path, content, isDirty: false }],
        activeTabPath: path,
      }
    })
  },

  closeTab: (path) => {
    set((s) => {
      const idx = s.tabs.findIndex((t) => t.path === path)
      if (idx === -1) return s
      const newTabs = s.tabs.filter((t) => t.path !== path)
      let newActive = s.activeTabPath
      if (s.activeTabPath === path) {
        const next = newTabs[idx] ?? newTabs[idx - 1] ?? null
        newActive = next?.path ?? null
      }
      return { tabs: newTabs, activeTabPath: newActive }
    })
  },

  setTabContent: (path, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, content } : t)),
    }))
  },

  setTabDirty: (path, isDirty) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.path === path ? { ...t, isDirty } : t)),
    }))
  },

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}))
