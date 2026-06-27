import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        css: true,
        // Playwright の e2e/*.spec.ts は @playwright/test ランナー専用。
        // Vitest の既定 glob が拾うと実行時に衝突するため除外する。
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules/**', 'dist/**', 'e2e/**'],
    },
})
