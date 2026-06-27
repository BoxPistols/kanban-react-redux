import { test, expect } from '@playwright/test'

/**
 * White-screen regression guard.
 *
 * Background: production once showed a blank white screen because a vendor
 * chunk threw at module-eval time (vite manualChunks split @dnd-kit from
 * react-dom → `Cannot read properties of undefined (reading
 * '__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED')`). There were no
 * tests, so it shipped unnoticed. This test boots the real production build
 * in a browser and fails if the app crashes before rendering.
 */
test('boots without a fatal error and renders the app (no white screen)', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/', { waitUntil: 'load' })

    // The app root must mount real content.
    const root = page.locator('#root')
    await expect(root).not.toBeEmpty()

    // No uncaught exceptions during load (the white-screen class).
    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([])

    // The fatal-error fallback (index.html) must NOT be visible — i.e. the
    // real app rendered, not the recovery UI.
    await expect(page.getByText('読み込みに失敗しました')).toHaveCount(0)

    // Sanity: <title> resolved and the document is interactive.
    await expect(page).toHaveTitle(/Kanban/i)
})
