import { useEffect, useState } from 'react'
import { parseUrls, fetchUrlMetadata, isMetadataFresh } from '../utils/urlUtils'
import type { UrlMetadata } from '../types'

const DEBOUNCE_DELAY_MS = 500 // デバウンス遅延時間（500ms）

// 安定した空配列参照。デフォルト引数 `= []` は呼び出し側が undefined を渡すたびに
// 新しい配列を生成し、それが effect の依存になって無限再レンダリング
// （Maximum update depth exceeded）とデバウンスタイマーの永久リセットを引き起こす。
const EMPTY_METADATA: UrlMetadata[] = []

/**
 * メタデータ配列を比較する
 */
function areMetadataArraysEqual(a: UrlMetadata[], b: UrlMetadata[]): boolean {
    if (a.length !== b.length) return false
    const sortedA = [...a].sort((x, y) => x.url.localeCompare(y.url))
    const sortedB = [...b].sort((x, y) => x.url.localeCompare(y.url))
    return sortedA.every((item, i) => {
        const other = sortedB[i]
        return item.url === other.url && item.title === other.title && item.error === other.error
    })
}

/**
 * テキスト内のURLからメタ情報を取得し、キャッシュを管理するフック
 */
export function useUrlMetadata(
    text: string,
    existingMetadata: UrlMetadata[] = EMPTY_METADATA,
    onMetadataUpdate?: (metadata: UrlMetadata[]) => void
) {
    const [metadata, setMetadata] = useState<UrlMetadata[]>(existingMetadata)

    // existingMetadataが変更されたら同期。内容が同一なら state を据え置き、
    // 参照だけ変わった場合の不要な再レンダリング/フェッチ済みデータの上書きを防ぐ。
    useEffect(() => {
        setMetadata((prev) => (areMetadataArraysEqual(prev, existingMetadata) ? prev : existingMetadata))
    }, [existingMetadata])

    useEffect(() => {
        const controller = new AbortController()

        // デバウンス処理
        const timerId = setTimeout(() => {
            const urls = parseUrls(text)
            if (urls.length === 0) {
                // URLがない場合は既存のメタデータをクリア
                setMetadata([])
                onMetadataUpdate?.([])
                return
            }

            const fetchMissing = async () => {
                const updates: UrlMetadata[] = []
                const urlsToFetch: string[] = []

                // キャッシュチェック
                for (const { url } of urls) {
                    const cached = existingMetadata.find((m) => m.url === url)
                    if (cached && isMetadataFresh(cached.fetchedAt) && !cached.error) {
                        // キャッシュが有効な場合は再利用
                        updates.push(cached)
                    } else {
                        // 新規取得が必要
                        urlsToFetch.push(url)
                    }
                }

                // 並列で取得（最大3つまで同時）
                const batchSize = 3
                for (let i = 0; i < urlsToFetch.length; i += batchSize) {
                    if (controller.signal.aborted) return

                    const batch = urlsToFetch.slice(i, i + batchSize)
                    const results = await Promise.all(
                        batch.map(async (url) => {
                            const result = await fetchUrlMetadata(url)
                            return {
                                url,
                                title: result.title,
                                error: result.error,
                                fetchedAt: Date.now(),
                            }
                        })
                    )
                    updates.push(...results)
                }

                if (controller.signal.aborted) return

                setMetadata(updates)

                // メタデータが変更された場合のみコールバックを呼ぶ
                if (!areMetadataArraysEqual(updates, existingMetadata)) {
                    onMetadataUpdate?.(updates)
                }
            }

            fetchMissing()
        }, DEBOUNCE_DELAY_MS)

        return () => {
            clearTimeout(timerId)
            controller.abort()
        }
    }, [text, existingMetadata, onMetadataUpdate])

    return { metadata }
}
