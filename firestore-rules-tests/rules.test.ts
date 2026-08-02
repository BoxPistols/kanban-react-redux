import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Firestore セキュリティルールの検証 (#97)
 *
 * ルールは本番に反映すると「読めない/書けない」が即ユーザー影響になるうえ、
 * 壊れていても CI もアプリのテストも緑のままになる。エミュレータで実際に
 * 許可/拒否を確かめ、意図した境界を固定する。
 *
 * 実行には Firestore エミュレータ(Java 必須)が要る:
 *   npm run test:rules
 */

const OWNER = 'user-owner'
const OTHER = 'user-other'

let testEnv: RulesTestEnvironment

function ownerDb() {
    return testEnv.authenticatedContext(OWNER).firestore()
}
function otherDb() {
    return testEnv.authenticatedContext(OTHER).firestore()
}
function anonDb() {
    return testEnv.unauthenticatedContext().firestore()
}

// ルールを迂回して初期データを置く(前提条件の準備用)
async function seed(path: string, data: Record<string, unknown>) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), path), data)
    })
}

const card = (over: Record<string, unknown> = {}) => ({
    userId: OWNER,
    boardId: 'board-1',
    columnId: 'TODO',
    text: 'card',
    order: 0,
    createdAt: 1,
    updatedAt: 1,
    ...over,
})

beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
        projectId: 'kanban-rules-test',
        firestore: {
            rules: readFileSync(resolve(__dirname, '..', 'firestore.rules'), 'utf8'),
            host: '127.0.0.1',
            port: 8080,
        },
    })
})

afterAll(async () => {
    await testEnv?.cleanup()
})

beforeEach(async () => {
    await testEnv.clearFirestore()
})

describe('cards コレクション', () => {
    it('未認証は読み書きできない', async () => {
        await seed('cards/c1', card())
        await assertFails(getDoc(doc(anonDb(), 'cards/c1')))
        await assertFails(setDoc(doc(anonDb(), 'cards/c2'), card()))
        await assertFails(deleteDoc(doc(anonDb(), 'cards/c1')))
    })

    it('所有者は自分のカードを読み書きできる', async () => {
        await seed('cards/c1', card())
        await assertSucceeds(getDoc(doc(ownerDb(), 'cards/c1')))
        await assertSucceeds(updateDoc(doc(ownerDb(), 'cards/c1'), { text: 'updated' }))
        await assertSucceeds(setDoc(doc(ownerDb(), 'cards/c2'), card()))
        await assertSucceeds(deleteDoc(doc(ownerDb(), 'cards/c1')))
    })

    it('他人のカードは読めない・書けない・消せない', async () => {
        await seed('cards/c1', card())
        await assertFails(getDoc(doc(otherDb(), 'cards/c1')))
        await assertFails(updateDoc(doc(otherDb(), 'cards/c1'), { text: 'hijack' }))
        await assertFails(deleteDoc(doc(otherDb(), 'cards/c1')))
    })

    it('他人の userId を騙って作成できない', async () => {
        await assertFails(setDoc(doc(otherDb(), 'cards/c9'), card({ userId: OWNER })))
    })

    it('所有権の付け替え(userId 書き換え)はできない', async () => {
        await seed('cards/c1', card())
        await assertFails(updateDoc(doc(ownerDb(), 'cards/c1'), { userId: OTHER }))
    })

    // #85 で撤去した fail-open の回帰ガード。
    // かつて `!('userId' in resource.data)` を OR で許可しており、userId を持たない
    // ドキュメントを「認証さえしていれば誰でも」読めた(監査C5)。
    it('userId を持たないドキュメントは誰も読めない(fail-open の回帰ガード)', async () => {
        await seed('cards/legacy', { boardId: 'b', columnId: 'TODO', text: 'legacy', order: 0 })
        await assertFails(getDoc(doc(ownerDb(), 'cards/legacy')))
        await assertFails(getDoc(doc(otherDb(), 'cards/legacy')))
    })

    it('userId 無しでは作成できない', async () => {
        const { userId: _omit, ...withoutUserId } = card()
        await assertFails(setDoc(doc(ownerDb(), 'cards/c9'), withoutUserId))
    })
})

describe('boards コレクション', () => {
    const board = (over: Record<string, unknown> = {}) => ({
        userId: OWNER,
        name: 'マイボード',
        createdAt: 1,
        ...over,
    })

    it('所有者のみ読み書きでき、他人は触れない', async () => {
        await seed('boards/b1', board())
        await assertSucceeds(getDoc(doc(ownerDb(), 'boards/b1')))
        await assertFails(getDoc(doc(otherDb(), 'boards/b1')))
        await assertFails(updateDoc(doc(otherDb(), 'boards/b1'), { name: 'hijack' }))
        await assertFails(deleteDoc(doc(otherDb(), 'boards/b1')))
    })

    it('所有権の付け替えはできない', async () => {
        await seed('boards/b1', board())
        await assertFails(updateDoc(doc(ownerDb(), 'boards/b1'), { userId: OTHER }))
    })
})

describe('trash コレクション', () => {
    const trashed = (over: Record<string, unknown> = {}) => ({
        userId: OWNER,
        originalBoardId: 'b1',
        originalColumnId: 'TODO',
        deletedAt: 1,
        ...over,
    })

    it('所有者のみ読める・作れる・消せる', async () => {
        await seed('trash/t1', trashed())
        await assertSucceeds(getDoc(doc(ownerDb(), 'trash/t1')))
        await assertSucceeds(deleteDoc(doc(ownerDb(), 'trash/t1')))
        await assertSucceeds(setDoc(doc(ownerDb(), 'trash/t2'), trashed()))
        await assertFails(getDoc(doc(otherDb(), 'trash/t2')))
        await assertFails(deleteDoc(doc(otherDb(), 'trash/t2')))
    })

    // trash に update ルールは無い(= 全拒否)。復元は「新規作成 + 元を削除」で行うため。
    it('update は誰にも許可されていない', async () => {
        await seed('trash/t1', trashed())
        await assertFails(updateDoc(doc(ownerDb(), 'trash/t1'), { deletedAt: 2 }))
    })
})

describe('未定義のコレクション', () => {
    it('ルールに無いパスは全拒否される', async () => {
        await assertFails(setDoc(doc(ownerDb(), 'anything/x'), { userId: OWNER }))
        await assertFails(getDoc(doc(ownerDb(), 'anything/x')))
    })
})

// --- フィールド検証 (defense-in-depth) ---
//
// 最重要は「アプリが実際に書く形が通ること」。ここを検証せずにルールだけ厳しくすると、
// 本番反映した瞬間に保存できなくなる。まず通る側を固定してから、弾く側を足す。
describe('フィールド検証: アプリが実際に書く形は必ず通る', () => {
    it('全フィールドを埋めたカード(アプリの最大形)を作成できる', async () => {
        const fullCard = card({
            title: 'タイトル',
            description: '# 見出し\n本文'.repeat(50),
            labels: [{ id: 'l1', name: '重要', color: '#ff0000' }],
            color: '#D69E2E',
            checklist: [{ id: 'i1', text: '項目', completed: false, order: 0 }],
            dueDate: 1234567890,
            progress: 50,
            urlMetadata: [{ url: 'https://example.com', title: 'Example', fetchedAt: 1 }],
            images: [{ id: 'img1', dataUrl: 'data:image/png;base64,AAAA', name: 'a.png', createdAt: 1 }],
        })
        await assertSucceeds(setDoc(doc(ownerDb(), 'cards/full'), fullCard))
    })

    it('最小構成のカード(addCard が書く形)を作成できる', async () => {
        await assertSucceeds(setDoc(doc(ownerDb(), 'cards/min'), card()))
    })

    it('部分更新(moveCardsToBoard / commitDrag が書く形)が通る', async () => {
        await seed('cards/c1', card())
        const db = ownerDb()
        await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { order: 3, columnId: 'Done', updatedAt: 2 }))
        await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { boardId: 'board-2', order: 1700000000000 }))
        await assertSucceeds(updateDoc(doc(db, 'cards/c1'), { title: 'new', text: 'new' }))
    })
})

describe('フィールド検証: 壊れた/悪意ある書き込みは弾く', () => {
    it('型が違うと作成できない', async () => {
        await assertFails(setDoc(doc(ownerDb(), 'cards/x1'), card({ order: 'ゼロ' })))
        await assertFails(setDoc(doc(ownerDb(), 'cards/x2'), card({ boardId: 123 })))
        await assertFails(setDoc(doc(ownerDb(), 'cards/x3'), card({ columnId: null })))
        await assertFails(setDoc(doc(ownerDb(), 'cards/x4'), card({ userId: 12345 })))
    })

    it('更新で型を壊すこともできない', async () => {
        await seed('cards/c1', card())
        await assertFails(updateDoc(doc(ownerDb(), 'cards/c1'), { order: 'あ' }))
    })

    it('極端に長い文字列・巨大なリストは弾く(1ドキュメント上限への防波堤)', async () => {
        await assertFails(setDoc(doc(ownerDb(), 'cards/x5'), card({ title: 'あ'.repeat(1001) })))
        await assertFails(setDoc(doc(ownerDb(), 'cards/x6'), card({ description: 'あ'.repeat(100_001) })))
        await assertFails(
            setDoc(
                doc(ownerDb(), 'cards/x7'),
                card({ images: Array.from({ length: 21 }, (_, i) => ({ id: `i${i}` })) })
            )
        )
        await assertFails(
            setDoc(
                doc(ownerDb(), 'cards/x8'),
                card({ checklist: Array.from({ length: 201 }, (_, i) => ({ id: `i${i}` })) })
            )
        )
    })

    it('ボード名が極端に長い場合は弾く', async () => {
        await assertFails(setDoc(doc(ownerDb(), 'boards/x1'), { userId: OWNER, name: 'あ'.repeat(1001) }))
        await assertSucceeds(setDoc(doc(ownerDb(), 'boards/ok'), { userId: OWNER, name: '普通のボード' }))
    })
})
