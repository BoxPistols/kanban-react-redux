import { test, expect, Page, Locator } from '@playwright/test'

/**
 * D&D リグレッションガード (#98 / #101)
 *
 * Firebase env なしのビルドはオフラインモード(localStorage)で起動し、
 * ログインゲートを通らずに実ブラウザでドラッグ&ドロップを検証できる。
 * - 同一レーン内の並び替え / レーン間の移動 / レーンヘッダのドラッグ並び替え
 * - リロード後も並びが保持されること(並び替えが「確定」していること)
 * - dnd-kit の再計測ループ(Maximum update depth / Minified React error #185)を
 *   pageerror として検出する
 */

// dnd-kit MouseSensor は activationConstraint.distance=5 のため、
// down 直後に小さく動かしてドラッグを起動してから目標へ移動する
async function dragElement(page: Page, from: Locator, to: Locator, offsetY = 0, settleAfterUp = 150) {
    const a = await from.boundingBox()
    const b = await to.boundingBox()
    if (!a || !b) throw new Error('drag target not visible')
    const sx = a.x + a.width / 2
    const sy = a.y + a.height / 2
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.move(sx + 12, sy + 4, { steps: 4 })
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + offsetY, { steps: 16 })
    // dragover のライブプレビュー(再レンダリング)を settle させてから離す
    await page.waitForTimeout(150)
    await page.mouse.up()
    await page.waitForTimeout(settleAfterUp)
}

// 先頭レーンのコンポーザーからカードを連続追加する(Enter 確定でフォームは開いたまま)
async function seedCards(page: Page, titles: string[]) {
    await page.locator('[data-add-card-button]').first().click()
    const input = page.locator('textarea[aria-label="カード内容を入力"]')
    for (const title of titles) {
        await input.fill(title)
        await input.press('Enter')
        // 追加が state に反映されるのを待つ(次の fill が競合しないように)
        await expect(page.locator('[data-card-container]', { hasText: title })).toHaveCount(1)
    }
    await input.press('Escape')
}

function columnCards(column: Locator) {
    return column.locator('[data-card-container]')
}

test.describe('カードのドラッグ&ドロップ', () => {
    let pageErrors: string[]

    test.beforeEach(async ({ page }) => {
        pageErrors = []
        page.on('pageerror', (err) => pageErrors.push(err.message))
        await page.goto('/', { waitUntil: 'load' })
        // オフラインモードでは「マイボード」が自動作成されレーンが表示される
        await expect(page.locator('[data-column-container]').first()).toBeVisible()
    })

    test.afterEach(() => {
        const dndLoop = pageErrors.filter((m) => /Maximum update depth|Minified React error #185/i.test(m))
        expect(dndLoop, `dnd-kit 再計測ループを検出:\n${dndLoop.join('\n')}`).toEqual([])
        expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([])
    })

    test('同一レーン内の並び替えが確定し、リロード後も保持される', async ({ page }) => {
        await seedCards(page, ['カードA', 'カードB', 'カードC'])
        const firstColumn = page.locator('[data-column-container]').first()
        await expect(columnCards(firstColumn)).toHaveText(['カードA', 'カードB', 'カードC'])

        // A を C の位置(下半分)へドラッグ → B, C, A になる
        const cardA = columnCards(firstColumn).filter({ hasText: 'カードA' })
        const cardC = columnCards(firstColumn).filter({ hasText: 'カードC' })
        await dragElement(page, cardA, cardC, 10)
        await expect(columnCards(firstColumn)).toHaveText(['カードB', 'カードC', 'カードA'])

        // リロードしても並びが保持される(=並び替えが永続化されている: #98)
        await page.reload({ waitUntil: 'load' })
        await expect(columnCards(page.locator('[data-column-container]').first())).toHaveText([
            'カードB',
            'カードC',
            'カードA',
        ])
    })

    test('レーン間の移動が確定し、リロード後も保持される', async ({ page }) => {
        await seedCards(page, ['移動カード', '残留カード'])
        const columns = page.locator('[data-column-container]')
        const firstColumn = columns.nth(0)
        const secondColumn = columns.nth(1)

        // 「移動カード」を2列目(空)へドラッグ
        const mover = columnCards(firstColumn).filter({ hasText: '移動カード' })
        await dragElement(page, mover, secondColumn)

        await expect(columnCards(secondColumn)).toHaveText(['移動カード'])
        await expect(columnCards(firstColumn)).toHaveText(['残留カード'])

        await page.reload({ waitUntil: 'load' })
        await expect(columnCards(page.locator('[data-column-container]').nth(1))).toHaveText(['移動カード'])
    })

    test('連続ドラッグでも再計測ループ(Maximum update depth)が起きない', async ({ page }) => {
        await seedCards(page, ['連打1', '連打2', '連打3'])
        const columns = page.locator('[data-column-container]')
        const firstColumn = columns.nth(0)
        const secondColumn = columns.nth(1)

        // 列間往復 + 同一列内並び替えを連続で行い、確定書き込み連発時のループ再発を検出する
        await dragElement(page, columnCards(firstColumn).filter({ hasText: '連打1' }), secondColumn)
        await dragElement(page, columnCards(secondColumn).filter({ hasText: '連打1' }), firstColumn)
        await dragElement(
            page,
            columnCards(firstColumn).filter({ hasText: '連打2' }),
            columnCards(firstColumn).filter({ hasText: '連打3' }),
            10
        )
        await dragElement(page, columnCards(firstColumn).filter({ hasText: '連打3' }), secondColumn)

        await expect(columnCards(secondColumn)).toHaveText(['連打3'])
        // 3枚とも生存している(ドラッグ中のクラッシュでカードが消えていない)
        await expect(page.locator('[data-card-container]')).toHaveCount(3)
    })

    test('ドロップ直後(アニメーション中)の再ドラッグが無反応にならない', async ({ page }) => {
        // 回帰ガード: ドロップアニメーション(~250ms)中の DragOverlay が次の mousedown を
        // 吸い、「直後のドラッグが無視される」バグがあった(#98)。overlay は着地中
        // pointer-events: none にして、50ms 間隔の連続往復ドラッグが全て確定することを保証する。
        await seedCards(page, ['往復', '他1', '他2'])
        const columns = page.locator('[data-column-container]')
        const col1 = columns.nth(0)
        const col2 = columns.nth(1)

        for (let i = 0; i < 3; i++) {
            await dragElement(page, columnCards(col1).filter({ hasText: '往復' }), col2, 0, 50)
            await expect(columnCards(col2)).toHaveText(['往復'])
            await dragElement(page, columnCards(col2).filter({ hasText: '往復' }), col1, 0, 50)
            await expect(columnCards(col1)).toContainText(['往復'])
            await expect(columnCards(col2)).toHaveCount(0)
        }
    })

    test('レーンヘッダのドラッグでレーンを並び替えられる', async ({ page }) => {
        const columns = page.locator('[data-column-container]')
        const count = await columns.count()
        expect(count).toBeGreaterThanOrEqual(2)

        // レーン名テキスト(ヘッダ=ドラッグハンドル内)を掴んで2列目へ
        const firstName = await columns.nth(0).locator('div').first().textContent()
        const firstHeaderName = columns.nth(0).getByTitle('ダブルクリックで名前を変更')
        const secondHeaderName = columns.nth(1).getByTitle('ダブルクリックで名前を変更')
        const secondName = await secondHeaderName.textContent()
        await dragElement(page, firstHeaderName, secondHeaderName)

        // 並びが入れ替わっている(1列目が旧2列目)
        await expect(columns.nth(0).getByTitle('ダブルクリックで名前を変更')).toHaveText(secondName ?? '')
        expect(firstName).not.toBeNull()
    })
})
