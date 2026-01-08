import { useEffect, useState } from 'react'
import { parseUrls, fetchUrlMetadata, isMetadataFresh } from '../utils/urlUtils'
import type { UrlMetadata } from '../types'

const DEBOUNCE_DELAY_MS = 500 // デバウンス遅延時間（500ms）

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
  existingMetadata: UrlMetadata[] = [],
  onMetadataUpdate?: (metadata: UrlMetadata[]) => void
) {
  const [metadata, setMetadata] = useState<UrlMetadata[]>(existingMetadata)

  // existingMetadataが変更されたら同期
  useEffect(() => {
    setMetadata(existingMetadata)
  }, [existingMetadata])

  useEffect(() => {
    const controller = new AbortController()

    // デバウンス処理
    const timerId = setTimeout(() => {
      const urls = parseUrls(text)
      if (urls.length === 0) {
        // URLがない場合は既存のメタデータをクリア
        if (metadata.length > 0) {
          setMetadata([])
          onMetadataUpdate?.([])
        }
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
