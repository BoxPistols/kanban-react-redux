import { create } from 'zustand'

interface ThemeState {
  isDarkMode: boolean
  toggleDarkMode: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,

  initializeTheme: () => {
    try {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        set({ isDarkMode: savedTheme === 'dark' })
      } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        set({ isDarkMode: prefersDark })
        localStorage.setItem('theme', prefersDark ? 'dark' : 'light')
      }
    } catch (error) {
      // LocalStorage not available (privacy settings, etc.)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      set({ isDarkMode: prefersDark })
    }
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode
    set({ isDarkMode: newMode })
    try {
      localStorage.setItem('theme', newMode ? 'dark' : 'light')
    } catch (error) {
      // LocalStorage not available, continue without persistence
    }
  }
}))
