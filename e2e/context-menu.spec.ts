import { test, expect, Page } from '@playwright/test'

/**
 * 右クリック(コンテキストメニュー)の網羅テスト (#106)
 *
 * オフラインモード(Firebase env なしビルド)で、カード / レーンヘッダ /
 * 盤面の空白 それぞれの右クリックメニューが開き、主要アクションが
 * 実際に機能することを実ブラウザで検証する。
 */

async function seedCard(page: Page, title: string) {
    await page.locator('[data-add-card-button]').first().click()
    const input = page.locator('textarea[aria-label="カード内容を入力"]')
    await input.fill(title)
    await input.press('Enter')
    await expect(page.locator('[data-card-container]', { hasText: title })).toHaveCount(1)
    await input.press('Escape')
}

test.describe('コンテキストメニュー', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' })
        await expect(page.locator('[data-column-container]').first()).toBeVisible()
    })

    test('カードの右クリック: メニュー表示とタイトル編集・ゴミ箱移動', async ({ page }) => {
        await seedCard(page, '右クリック対象')
        const card = page.locator('[data-card-container]', { hasText: '右クリック対象' })

        // メニューが開き、期待項目が並ぶ
        await card.click({ button: 'right' })
        const menu = page.getByRole('menu')
        await expect(menu).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: '詳細を開く' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'タイトルを編集' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: '別のボードへ移動' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'ゴミ箱へ移動' })).toBeVisible()
        // ボードが1つだけの時、移動は disabled
        await expect(menu.getByRole('menuitem', { name: '別のボードへ移動' })).toHaveAttribute(
            'aria-disabled',
            'true'
        )

        // タイトル編集がその場で始まる
        await menu.getByRole('menuitem', { name: 'タイトルを編集' }).click()
        await expect(page.locator('textarea[aria-label="カードタイトルを編集"]')).toBeVisible()
        await page.keyboard.press('Escape')
        // 編集終了のコミットを待つ(編集中の右クリックは意図的に無視されるため)
        await expect(page.locator('textarea[aria-label="カードタイトルを編集"]')).toBeHidden()

        // ゴミ箱へ移動でカードが消える
        await card.click({ button: 'right' })
        await page.getByRole('menu').getByRole('menuitem', { name: 'ゴミ箱へ移動' }).click()
        await expect(page.locator('[data-card-container]', { hasText: '右クリック対象' })).toHaveCount(0)
    })

    test('レーンヘッダの右クリック: カード追加・レーン名編集・レーン管理', async ({ page }) => {
        const firstColumn = page.locator('[data-column-container]').first()
        const header = firstColumn.getByTitle('ダブルクリックで名前を変更')

        await header.click({ button: 'right' })
        const menu = page.getByRole('menu')
        await expect(menu).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'カードを追加' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'レーン名を編集' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'レーンを畳む' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'レーン管理' })).toBeVisible()

        // カードを追加 → コンポーザーが開く
        await menu.getByRole('menuitem', { name: 'カードを追加' }).click()
        await expect(page.locator('textarea[aria-label="カード内容を入力"]')).toBeVisible()
        await page.keyboard.press('Escape')

        // レーン名を編集 → その場の入力欄が開く
        await header.click({ button: 'right' })
        await page.getByRole('menu').getByRole('menuitem', { name: 'レーン名を編集' }).click()
        await expect(page.locator('input[aria-label="レーン名を編集"]')).toBeVisible()
        await page.keyboard.press('Escape')

        // レーン管理 → モーダルが開く
        await header.click({ button: 'right' })
        await page.getByRole('menu').getByRole('menuitem', { name: 'レーン管理' }).click()
        await expect(page.getByRole('dialog', { name: 'レーン管理' })).toBeVisible()
    })

    test('盤面の空白の右クリック: レーン指定のカード追加とレーン管理', async ({ page }) => {
        // 空白領域(最後のレーンと「レーン管理」ボタンより下)を右クリックする
        const scroll = page.locator('[data-horizontal-scroll]')
        const box = (await scroll.boundingBox())!
        const lastColumn = page.locator('[data-column-container]').last()
        const colBox = (await lastColumn.boundingBox())!
        const x = Math.min(colBox.x + colBox.width + 60, box.x + box.width - 12)
        const y = box.y + box.height - 60
        await page.mouse.click(x, y, { button: 'right' })

        const menu = page.getByRole('menu')
        await expect(menu).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'カードを追加' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'レーン管理' })).toBeVisible()

        // カードを追加 → サブメニューでレーンを選ぶ → 該当レーンのコンポーザーが開く
        await menu.getByRole('menuitem', { name: 'カードを追加' }).click()
        const firstColumnName = await page
            .locator('[data-column-container]')
            .first()
            .getByTitle('ダブルクリックで名前を変更')
            .textContent()
        await menu.getByRole('menuitem', { name: firstColumnName ?? 'TODO' }).click()
        await expect(page.locator('textarea[aria-label="カード内容を入力"]')).toBeVisible()
        await page.keyboard.press('Escape')

        // レーン管理も開ける
        await page.mouse.click(x, y, { button: 'right' })
        await page.getByRole('menu').getByRole('menuitem', { name: 'レーン管理' }).click()
        await expect(page.getByRole('dialog', { name: 'レーン管理' })).toBeVisible()
    })

    test('カード上の右クリックでは盤面メニューではなくカードメニューが開く', async ({ page }) => {
        await seedCard(page, '重なり確認')
        await page.locator('[data-card-container]', { hasText: '重なり確認' }).click({ button: 'right' })
        const menu = page.getByRole('menu')
        // カード用の項目があり、盤面用の「レーン管理」は無い
        await expect(menu.getByRole('menuitem', { name: '詳細を開く' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'レーン管理' })).toHaveCount(0)
    })
})
