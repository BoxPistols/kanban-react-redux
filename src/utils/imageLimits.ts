import type { ImageAttachment } from '../types'

/**
 * カード添付画像のサイズ制限 (#97)
 *
 * 画像は base64 data URL としてカード文書に直書きされる。Firestore の
 * ドキュメント上限は 1MiB(1,048,576 bytes)で、超えると updateDoc 全体が
 * 失敗し、その保存に含まれる説明・チェックリスト等の編集ごと失われる。
 *
 * 「1枚 5MB まで」の従来の上限は base64 化(約 4/3 倍)を考慮しておらず、
 * 通せば必ず保存が壊れる値だった。ここでは実際に保存できる量で判定する。
 *
 * 恒久対応は Firebase Storage への退避(URL のみ保存)。それまでの安全弁。
 */

/** Firestore の 1 ドキュメント上限 */
export const FIRESTORE_DOC_LIMIT_BYTES = 1_048_576

/**
 * 画像に割り当てる上限。タイトル・説明・チェックリスト・ラベル等の
 * 他フィールドと Firestore のオーバーヘッド用に約 150KB を残す。
 */
export const MAX_IMAGES_TOTAL_BYTES = 900_000

/** 1枚あたりの上限(元ファイルのバイト数)。base64 化で約 4/3 に膨らむ分を見込む */
export const MAX_IMAGE_FILE_BYTES = 600_000

/** data URL のおおよそのバイト数(UTF-8 の ASCII なので文字数 = バイト数) */
export function dataUrlByteLength(dataUrl: string): number {
    return dataUrl.length
}

/** 既存の添付画像が占めているバイト数の合計 */
export function totalImageBytes(images: ImageAttachment[]): number {
    return images.reduce((sum, img) => sum + dataUrlByteLength(img.dataUrl), 0)
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export type ImageRejection = { ok: false; reason: string }
export type ImageAcceptance = { ok: true }
export type ImageCheckResult = ImageAcceptance | ImageRejection

/** 貼り付けようとしたファイル単体が上限内か(data URL 化する前の早期判定) */
export function checkImageFileSize(fileBytes: number): ImageCheckResult {
    if (fileBytes > MAX_IMAGE_FILE_BYTES) {
        return {
            ok: false,
            reason: `画像は1枚あたり${formatBytes(MAX_IMAGE_FILE_BYTES)}以下にしてください(選択された画像: ${formatBytes(fileBytes)})`,
        }
    }
    return { ok: true }
}

/** 既存の添付と合わせてカード1枚の保存上限に収まるか */
export function checkImageTotalSize(existing: ImageAttachment[], newDataUrl: string): ImageCheckResult {
    const next = totalImageBytes(existing) + dataUrlByteLength(newDataUrl)
    if (next > MAX_IMAGES_TOTAL_BYTES) {
        return {
            ok: false,
            reason: `このカードの画像が上限(${formatBytes(MAX_IMAGES_TOTAL_BYTES)})を超えます。既存の画像を削除してから追加してください`,
        }
    }
    return { ok: true }
}
