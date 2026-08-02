import { test, expect, Page } from '@playwright/test'

/**
 * カードの色ピッカーの ARIA radiogroup パターン (#97)
 *
 * Tab でグループに入り、矢印キーで選択を移動できること(ARIA APG)を実ブラウザで検証する。
 * 「role='radio' は付いているが矢印キーで動かない」状態は静的解析では見つからない。
 */

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

test.describe('カードの色ピッカー(radiogroup)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' })
        await expect(page.locator('[data-column-container]').first()).toBeVisible()
        await openCardDetail(page, '色ピッカー確認')
    })

    test('radiogroup として公開され、タブ順に入るのは1つだけ', async ({ page }) => {
        const group = page.getByRole('radiogroup', { name: 'カードの色' })
        await expect(group).toBeVisible()

        const radios = group.getByRole('radio')
        await expect(radios).toHaveCount(9) // デフォルト + 8色

        // roving tabindex: tabIndex=0 はちょうど1つ
        const tabbable = await radios.evaluateAll((els) =>
            els.filter((el) => (el as HTMLElement).tabIndex === 0).length
        )
        expect(tabbable).toBe(1)

        // 未選択なので先頭(デフォルト色)が checked かつタブ順に入る
        await expect(radios.first()).toHaveAttribute('aria-checked', 'true')
        expect(await radios.first().evaluate((el) => (el as HTMLElement).tabIndex)).toBe(0)
    })

    test('矢印キーで選択が移動し、Home/End で端に飛ぶ', async ({ page }) => {
        const group = page.getByRole('radiogroup', { name: 'カードの色' })
        const radios = group.getByRole('radio')

        await radios.first().focus()

        // → で次の色へ(移動と同時に選択されるのが radiogroup の規定動作)
        await page.keyboard.press('ArrowRight')
        await expect(radios.nth(1)).toBeFocused()
        await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true')
        await expect(radios.first()).toHaveAttribute('aria-checked', 'false')

        // ← で戻る
        await page.keyboard.press('ArrowLeft')
        await expect(radios.first()).toBeFocused()
        await expect(radios.first()).toHaveAttribute('aria-checked', 'true')

        // ← で先頭から末尾へラップ
        await page.keyboard.press('ArrowLeft')
        await expect(radios.last()).toBeFocused()
        await expect(radios.last()).toHaveAttribute('aria-checked', 'true')

        // Home / End
        await page.keyboard.press('Home')
        await expect(radios.first()).toBeFocused()
        await page.keyboard.press('End')
        await expect(radios.last()).toBeFocused()
        await expect(radios.last()).toHaveAttribute('aria-checked', 'true')
    })

    test('選択した色がカードに反映され、再度開くとその色が選択済みになる', async ({ page }) => {
        const group = page.getByRole('radiogroup', { name: 'カードの色' })
        const radios = group.getByRole('radio')

        await radios.first().focus()
        await page.keyboard.press('ArrowRight')
        const chosenLabel = await radios.nth(1).getAttribute('aria-label')

        await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).first().click()
        await expect(page.getByRole('dialog')).toBeHidden()

        // 再度開くと、選んだ色が checked かつタブ順に入る唯一の要素になっている
        await page.locator('[data-card-container]', { hasText: '色ピッカー確認' }).click()
        const reopened = page.getByRole('radiogroup', { name: 'カードの色' }).getByRole('radio')
        const selected = reopened.filter({ has: page.locator(':scope[aria-checked="true"]') })
        await expect(selected).toHaveCount(1)
        await expect(reopened.nth(1)).toHaveAttribute('aria-checked', 'true')
        await expect(reopened.nth(1)).toHaveAttribute('aria-label', chosenLabel ?? '')
        expect(await reopened.nth(1).evaluate((el) => (el as HTMLElement).tabIndex)).toBe(0)
    })
})
