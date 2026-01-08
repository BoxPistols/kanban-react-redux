// URL検出の正規表現（http:// または https:// で始まるもの）
const URL_REGEX = /(https?:\/\/[^\s]+)/gi

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
    const timeoutId = setTimeout(() => controller.abort(), 5000)

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
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

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
      // タイトルが長すぎる場合は切り詰める（最大150文字）
      return { title: title.length > 150 ? title.slice(0, 150) + '...' : title }
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
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  return Date.now() - fetchedAt < THIRTY_DAYS
}
