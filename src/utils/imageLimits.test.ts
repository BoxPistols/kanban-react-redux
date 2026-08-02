import { describe, it, expect } from 'vitest'
import {
    checkImageFileSize,
    checkImageTotalSize,
    totalImageBytes,
    formatBytes,
    FIRESTORE_DOC_LIMIT_BYTES,
    MAX_IMAGES_TOTAL_BYTES,
    MAX_IMAGE_FILE_BYTES,
} from './imageLimits'
import type { ImageAttachment } from '../types'

function image(bytes: number, id = 'i'): ImageAttachment {
    return {
        id,
        // data URL は ASCII なので「文字数 = バイト数」で近似できる
        dataUrl: 'x'.repeat(bytes),
        name: 'test.png',
        createdAt: 0,
    }
}

describe('imageLimits', () => {
    it('画像の合計上限は Firestore の1ドキュメント上限を超えない', () => {
        // 他フィールド(説明・チェックリスト等)のための余白が残っていること
        expect(MAX_IMAGES_TOTAL_BYTES).toBeLessThan(FIRESTORE_DOC_LIMIT_BYTES)
        expect(FIRESTORE_DOC_LIMIT_BYTES - MAX_IMAGES_TOTAL_BYTES).toBeGreaterThanOrEqual(100_000)
    })

    it('1枚の上限は base64 化(約4/3倍)しても合計上限に収まる', () => {
        // 旧実装の 5MB は base64 化すると約 6.7MB になり、通せば必ず保存が壊れる値だった
        expect(Math.ceil(MAX_IMAGE_FILE_BYTES * (4 / 3))).toBeLessThanOrEqual(MAX_IMAGES_TOTAL_BYTES)
    })

    describe('checkImageFileSize', () => {
        it('上限以下のファイルは通す', () => {
            expect(checkImageFileSize(MAX_IMAGE_FILE_BYTES).ok).toBe(true)
            expect(checkImageFileSize(1024).ok).toBe(true)
        })

        it('上限超えは理由付きで断る', () => {
            const result = checkImageFileSize(MAX_IMAGE_FILE_BYTES + 1)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                // 「何KBまでか」と「実際のサイズ」の両方を伝える(次の行動が分かるように)
                expect(result.reason).toContain(formatBytes(MAX_IMAGE_FILE_BYTES))
                expect(result.reason).toContain(formatBytes(MAX_IMAGE_FILE_BYTES + 1))
            }
        })

        it('旧上限だった 5MB は断る', () => {
            expect(checkImageFileSize(5 * 1024 * 1024).ok).toBe(false)
        })
    })

    describe('checkImageTotalSize', () => {
        it('既存の添付と合算して判定する', () => {
            const existing = [image(400_000, 'a'), image(400_000, 'b')]
            expect(totalImageBytes(existing)).toBe(800_000)
            // 単体では小さくても、合計が上限を超えるなら断る
            expect(checkImageTotalSize(existing, 'x'.repeat(150_000)).ok).toBe(false)
            expect(checkImageTotalSize(existing, 'x'.repeat(50_000)).ok).toBe(true)
        })

        it('添付が無ければ上限ちょうどまで通す', () => {
            expect(checkImageTotalSize([], 'x'.repeat(MAX_IMAGES_TOTAL_BYTES)).ok).toBe(true)
            expect(checkImageTotalSize([], 'x'.repeat(MAX_IMAGES_TOTAL_BYTES + 1)).ok).toBe(false)
        })
    })

    describe('formatBytes', () => {
        it('読みやすい単位にする', () => {
            expect(formatBytes(512)).toBe('512B')
            expect(formatBytes(600_000)).toBe('586KB')
            expect(formatBytes(5 * 1024 * 1024)).toBe('5.0MB')
        })
    })
})
