import { defineConfig } from '@playwright/test'

/**
 * Smoke-test config. Builds the production bundle and serves it via `vite
 * preview`, then loads the app in a real browser. This catches the
 * "white screen on prod" class of failure (uncaught module-init errors,
 * bad chunking) that has no unit-test coverage.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    expect: { timeout: 15_000 },
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:4173',
    },
    webServer: {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
    },
})
