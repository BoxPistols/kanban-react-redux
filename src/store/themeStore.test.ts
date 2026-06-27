// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useThemeStore } from './themeStore'

describe('themeStore', () => {
    let localStorageMock: Map<string, string>

    beforeEach(() => {
        // Reset store state
        useThemeStore.setState({ isDarkMode: false })

        // Mock localStorage
        localStorageMock = new Map()
        global.localStorage = {
            getItem: vi.fn((key: string) => localStorageMock.get(key) || null),
            setItem: vi.fn((key: string, value: string) => {
                localStorageMock.set(key, value)
            }),
            removeItem: vi.fn((key: string) => {
                localStorageMock.delete(key)
            }),
            clear: vi.fn(() => {
                localStorageMock.clear()
            }),
            get length() {
                return localStorageMock.size
            },
            key: vi.fn((index: number) => {
                return Array.from(localStorageMock.keys())[index] || null
            }),
        }

        // Mock matchMedia
        global.matchMedia = vi.fn((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)' ? false : false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }))
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('initial state', () => {
        it('should have isDarkMode set to false by default', () => {
            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(false)
        })

        it('should have toggleDarkMode function', () => {
            const state = useThemeStore.getState()
            expect(typeof state.toggleDarkMode).toBe('function')
        })

        it('should have initializeTheme function', () => {
            const state = useThemeStore.getState()
            expect(typeof state.initializeTheme).toBe('function')
        })
    })

    describe('toggleDarkMode', () => {
        it('should toggle isDarkMode from false to true', () => {
            const { toggleDarkMode } = useThemeStore.getState()
            toggleDarkMode()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(true)
        })

        it('should toggle isDarkMode from true to false', () => {
            useThemeStore.setState({ isDarkMode: true })

            const { toggleDarkMode } = useThemeStore.getState()
            toggleDarkMode()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(false)
        })

        it('should persist theme to localStorage as "dark"', () => {
            const { toggleDarkMode } = useThemeStore.getState()
            toggleDarkMode()

            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
        })

        it('should persist theme to localStorage as "light"', () => {
            useThemeStore.setState({ isDarkMode: true })

            const { toggleDarkMode } = useThemeStore.getState()
            toggleDarkMode()

            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light')
        })

        it('should handle localStorage errors gracefully', () => {
            vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const { toggleDarkMode } = useThemeStore.getState()
            expect(() => toggleDarkMode()).not.toThrow()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(true) // State should still update
        })
    })

    describe('initializeTheme', () => {
        it('should load dark theme from localStorage', () => {
            localStorageMock.set('theme', 'dark')

            const { initializeTheme } = useThemeStore.getState()
            initializeTheme()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(true)
        })

        it('should load light theme from localStorage', () => {
            localStorageMock.set('theme', 'light')

            const { initializeTheme } = useThemeStore.getState()
            initializeTheme()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(false)
        })

        it('should use system preference when no saved theme', () => {
            global.matchMedia = vi.fn((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? true : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }))

            const { initializeTheme } = useThemeStore.getState()
            initializeTheme()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(true)
            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')
        })

        it('should default to light when no saved theme and system prefers light', () => {
            const { initializeTheme } = useThemeStore.getState()
            initializeTheme()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(false)
            expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light')
        })

        it('should handle localStorage errors and use system preference', () => {
            vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            global.matchMedia = vi.fn((query: string) => ({
                matches: query === '(prefers-color-scheme: dark)' ? true : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }))

            const { initializeTheme } = useThemeStore.getState()
            expect(() => initializeTheme()).not.toThrow()

            const state = useThemeStore.getState()
            expect(state.isDarkMode).toBe(true)
        })
    })
})
