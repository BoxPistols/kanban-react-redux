import { test, expect, Page } from '@playwright/test'

/**
 * キーボードフォーカスリングの実描画ガード (#97)
 *
 * CDN の ress リセットが `button:focus { outline-width: 0 }`(特異度 0,1,1)を当てており、
 * GlobalStyle の素の `:focus-visible`(0,1,0)では負けてリングが一切出ていなかった。
 * 「:focus-visible にマッチしている」ことと「実際に輪郭が描かれている」ことは別なので、
 * computed style を実測して固定する。
 *
 * 対象は「グローバル規則が勝敗を決める要素」を選ぶ。コンポーネント側で個別に
 * outline を持つ要素だと、グローバル規則が壊れていてもテストが通ってしまう。
 */

const FOCUS_RING_COLOR = 'rgb(0, 101, 255)' // lightTheme.linkColor

async function outlineOfFocused(page: Page) {
    return page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el) return null
        const s = getComputedStyle(el)
        return {
            tag: el.tagName,
            label: el.getAttribute('aria-label'),
            focusVisible: el.matches(':focus-visible'),
            width: parseFloat(s.outlineWidth),
            style: s.outlineStyle,
            color: s.outlineColor,
        }
    })
}

async function openCardDetail(page: Page, title: string) {
    await page.locator('[data-add-card-button]').first().click()
    const input = page.locator('textarea[aria-label="カード内容を入力"]')
    await input.fill(title)
    await input.press('Enter')
    await expect(page.locator('[data-card-container]', { hasText: title })).toHaveCount(1)
    await input.press('Escape')
    await page.locator('[data-card-container]', { hasText: title }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
}

test.describe('キーボードフォーカスリング', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' })
        await expect(page.locator('[data-column-container]').first()).toBeVisible()
    })

    test('色スウォッチ(button)を矢印キーで移動するとリングが描画される', async ({ page }) => {
        await openCardDetail(page, 'フォーカスリング確認')
        const radios = page.getByRole('radiogroup', { name: 'カードの色' }).getByRole('radio')
        await radios.first().focus()
        await page.keyboard.press('ArrowRight')

        const info = await outlineOfFocused(page)
        expect(info!.tag).toBe('BUTTON')
        expect(info!.focusVisible, 'キーボード操作なので :focus-visible にマッチするはず').toBe(true)
        expect(info!.width, 'outline が 0 だとフォーカス位置が見えない').toBeGreaterThan(0)
        expect(info!.style).not.toBe('none')
        expect(info!.color, 'テーマのフォーカス色が使われていること').toBe(FOCUS_RING_COLOR)
    })

    test('検索欄(input)でもリングが描画される', async ({ page }) => {
        await page.locator('input[aria-label="カード検索"]').focus()
        await page.keyboard.press('ArrowLeft') // キーボード操作にする

        const info = await outlineOfFocused(page)
        expect(info!.tag).toBe('INPUT')
        expect(info!.width).toBeGreaterThan(0)
        expect(info!.color).toBe(FOCUS_RING_COLOR)
    })
})
