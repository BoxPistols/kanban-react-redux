import { useEffect, useState } from 'react'
import { parseUrls, fetchUrlMetadata, isMetadataFresh } from '../utils/urlUtils'
import type { UrlMetadata } from '../types'

/**
 * テキスト内のURLからメタ情報を取得し、キャッシュを管理するフック
 */
export function useUrlMetadata(
  text: string,
  existingMetadata: UrlMetadata[] = [],
  onMetadataUpdate?: (metadata: UrlMetadata[]) => void
) {
  const [metadata, setMetadata] = useState<UrlMetadata[]>(existingMetadata)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
      setLoading(true)
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

      setMetadata(updates)
      setLoading(false)

      // メタデータが変更された場合のみコールバックを呼ぶ
      if (JSON.stringify(updates) !== JSON.stringify(existingMetadata)) {
        onMetadataUpdate?.(updates)
      }
    }

    fetchMissing()
  }, [text])

  return { metadata, loading }
}
