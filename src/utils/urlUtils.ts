// 定数定義
const FETCH_TIMEOUT_MS = 5000 // メタデータ取得のタイムアウト（5秒）
const MAX_TITLE_LENGTH = 150 // タイトルの最大文字数
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // キャッシュの有効期限（30日）

// URL検出の正規表現（http:// または https:// で始まり、末尾の句読点を除外）
// ピリオドはURL内で有効な文字（ドメインやパスに含まれる）なので許可し、
// 末尾の句読点のみを後読みアサーションで除外
const URL_REGEX = /https?:\/\/[^\s<>"'\)\]\}]+(?<![.,!?;:])/gi

/**
 * テキスト内のURLを検出し、位置情報とともに返す
 */
export function parseUrls(text: string): Array<{
  url: string
  startIndex: number
  endIndex: number
}> {
  const urls: Array<{ url: string; startIndex: number; endIndex: number }> = []
  const matches = text.matchAll(URL_REGEX)

  for (const match of matches) {
    if (match.index !== undefined) {
      urls.push({
        url: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
  }

  return urls
}

/**
 * YouTube URLからvideo IDを抽出
 */
function extractYouTubeId(url: string): string | null {
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/)
  if (watchMatch) return watchMatch[1]

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/)
  if (shortMatch) return shortMatch[1]

  return null
}

/**
 * YouTubeのoEmbed APIを使ってタイトルを取得
 */
async function fetchYouTubeMetadata(url: string): Promise<{ title?: string; error?: boolean }> {
  try {
    const videoId = extractYouTubeId(url)
    if (!videoId) {
      return { error: true }
    }

    // YouTube oEmbed API
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(oembedUrl, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { error: true }
    }

    const data = await response.json()
    return { title: data.title || undefined }
  } catch (error) {
    console.warn('Failed to fetch YouTube metadata:', error)
    return { error: true }
  }
}

/**
 * URLからメタ情報（タイトル）を取得
 */
export async function fetchUrlMetadata(
  url: string
): Promise<{ title?: string; error?: boolean }> {
  try {
    // YouTube URLの場合は専用処理
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      return await fetchYouTubeMetadata(url)
    }

    // CORS Proxyを使用してHTMLを取得
    // 注意: 外部サービス（api.allorigins.win）を使用しています
    // 本番環境では自己ホスト型のプロキシの使用を推奨します
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const response = await fetch(proxyUrl, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return { error: true }
    }

    const data = await response.json()
    const html = data.contents

    // DOMParserでHTMLをパース
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // タイトルを取得（優先度: og:title > title）
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const titleTag = doc.querySelector('title')?.textContent

    const title = ogTitle || titleTag

    if (title) {
      // タイトルが長すぎる場合は切り詰める
      return { title: title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH) + '...' : title }
    }

    return { error: true }
  } catch (error) {
    console.warn('Failed to fetch URL metadata:', error)
    return { error: true }
  }
}

/**
 * キャッシュされたメタデータが有効かどうかを判定（30日以内）
 */
export function isMetadataFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < CACHE_DURATION_MS
}
