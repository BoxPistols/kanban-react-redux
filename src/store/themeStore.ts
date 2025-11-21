import { create } from 'zustand'

interface ThemeState {
  isDarkMode: boolean
  toggleDarkMode: () => void
  initializeTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDarkMode: false,

  initializeTheme: () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      set({ isDarkMode: savedTheme === 'dark' })
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      set({ isDarkMode: prefersDark })
      localStorage.setItem('theme', prefersDark ? 'dark' : 'light')
    }
  },

  toggleDarkMode: () => {
    const newMode = !get().isDarkMode
    set({ isDarkMode: newMode })
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
  }
}))
