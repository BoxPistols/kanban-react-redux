// 定数定義
const FETCH_TIMEOUT_MS = 5000 // メタデータ取得のタイムアウト（5秒）
const MAX_TITLE_LENGTH = 150 // タイトルの最大文字数
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // キャッシュの有効期限（30日）

// URL検出の正規表現（http:// または https:// で始まる）。
// NOTE: 末尾句読点の除外は以前 lookbehind (?<!...) で行っていたが、lookbehind は
// Safari < 16.4 / 古い iOS Safari で未対応。正規表現リテラルはモジュール評価時に
// パースされるため、未対応ブラウザでは SyntaxError となりモジュール全体が読めず
// 「白画面」(ErrorBoundary も素通り)になる。そのため lookbehind を使わず、
// 末尾句読点は parseUrls 内で JS で除去する。
const URL_REGEX = /https?:\/\/[^\s<>"']+/gi
// URLの末尾に付きやすい句読点（文末のドット・読点など、URLには含めない）
const TRAILING_PUNCT = /[.,!?;:]$/

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
            // 末尾の句読点を除去（旧 lookbehind の代替）
            let url = match[0]
            while (TRAILING_PUNCT.test(url)) {
                url = url.slice(0, -1)
            }
            urls.push({
                url,
                startIndex: match.index,
                endIndex: match.index + url.length,
            })
        }
    }

    return urls
}

// --- 外部プロキシへ渡してよい URL の判定 ---
//
// メタデータ取得は公開 CORS プロキシ(api.allorigins.win)を経由するため、
// カードに書いた URL は「第三者に送信され、その第三者がサーバー側で実際に開く」。
// 素通しにすると次が漏れる:
//   - 社内ホスト名やプライベート IP(存在自体が情報。プロキシからは到達もできない)
//   - 署名付き URL やワンタイムトークン(クエリに載る。開かれると消費される場合もある)
// そのため「送らない URL」を明示的に弾き、送る場合もクエリとフラグメントを落とす。

/** トークン/資格情報が入りやすいクエリパラメータ名(小文字で比較) */
const CREDENTIAL_PARAM_HINTS = [
    'token',
    'access_token',
    'id_token',
    'refresh_token',
    'auth',
    'authorization',
    'apikey',
    'api_key',
    'key',
    'secret',
    'password',
    'passwd',
    'pwd',
    'sig',
    'signature',
    'session',
    'sessionid',
    'code',
    'credential',
    'unlock',
]

/** プライベート/内部ネットワークを指すホスト名か(送信も到達もさせない) */
export function isPrivateOrInternalHost(hostname: string): boolean {
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')

    if (host === 'localhost' || host.endsWith('.localhost')) return true
    // 内部向け TLD(mDNS / RFC 8375 / 慣習的な社内ドメイン)
    if (/\.(local|internal|intranet|corp|home|lan|test|localdomain)$/.test(host)) return true
    if (host.endsWith('.home.arpa')) return true
    // ドットを含まない = 名前解決が社内 DNS 依存のイントラネット名
    if (!host.includes('.') && !host.includes(':')) return true

    // IPv6 ループバック/リンクローカル/ユニークローカル
    if (host === '::1') return true
    if (/^fe80:/.test(host) || /^f[cd][0-9a-f]{2}:/.test(host)) return true

    // IPv4 の私的アドレス
    const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
    if (v4) {
        const [a, b] = [Number(v4[1]), Number(v4[2])]
        if (a === 127 || a === 10 || a === 0) return true
        if (a === 192 && b === 168) return true
        if (a === 172 && b >= 16 && b <= 31) return true
        if (a === 169 && b === 254) return true // リンクローカル(クラウドのメタデータエンドポイント)
    }

    return false
}

/** URL 自体が資格情報を運んでいるか(この場合は削るのではなく丸ごと送らない) */
export function carriesCredentials(url: URL): boolean {
    // user:pass@host
    if (url.username || url.password) return true

    const hasHint = (name: string) => {
        const n = name.toLowerCase()
        return CREDENTIAL_PARAM_HINTS.includes(n) || n.startsWith('x-amz-') || n.startsWith('x-goog-')
    }
    for (const name of url.searchParams.keys()) {
        if (hasHint(name)) return true
    }
    // 暗黙フローの access_token などはフラグメントに載る
    const fragment = url.hash.replace(/^#/, '')
    if (fragment) {
        for (const name of new URLSearchParams(fragment).keys()) {
            if (hasHint(name)) return true
        }
    }
    return false
}

/**
 * 外部プロキシへ渡してよい形に整えた URL を返す。送ってはいけない URL は null。
 *
 * 送る場合も origin + pathname だけにする(クエリ/フラグメントは落とす)。
 * その結果タイトルが URL 単位で不正確になることはあるが、未知のパラメータに
 * 機微情報が載っていた場合の被害と釣り合わない。
 */
export function toProxySafeUrl(rawUrl: string): string | null {
    let parsed: URL
    try {
        parsed = new URL(rawUrl)
    } catch {
        return null
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (isPrivateOrInternalHost(parsed.hostname)) return null
    if (carriesCredentials(parsed)) return null

    return `${parsed.origin}${parsed.pathname}`
}

/** ホスト名で YouTube を判定する */
export function isYouTubeUrl(rawUrl: string): boolean {
    try {
        const { hostname, pathname } = new URL(rawUrl)
        const host = hostname.toLowerCase().replace(/^www\./, '')
        if (host === 'youtu.be') return true
        return (host === 'youtube.com' || host === 'm.youtube.com') && pathname === '/watch'
    } catch {
        return false
    }
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
        return { error: true }
    }
}

/**
 * URLからメタ情報（タイトル）を取得
 */
export async function fetchUrlMetadata(url: string): Promise<{ title?: string; error?: boolean }> {
    try {
        // YouTube URLの場合は専用処理(プロキシを介さず YouTube の oEmbed を直接叩く)。
        // 判定はホスト名で行う。文字列 includes だと他サイトの URL に "youtube.com/watch"
        // が含まれるだけで YouTube 扱いになってしまう。
        if (isYouTubeUrl(url)) {
            return await fetchYouTubeMetadata(url)
        }

        // CORS Proxyを使用してHTMLを取得
        // 注意: 外部サービス（api.allorigins.win）を使用しています
        // 本番環境では自己ホスト型のプロキシの使用を推奨します
        //
        // 送信前に必ずサニタイズする。呼び出し側でも弾いているが、ここが最後の砦
        // (新しい呼び出し経路が増えても素通ししない)。
        const safeUrl = toProxySafeUrl(url)
        if (!safeUrl) {
            return { error: true }
        }
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(safeUrl)}`

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
        return { error: true }
    }
}

/**
 * キャッシュされたメタデータが有効かどうかを判定（30日以内）
 */
export function isMetadataFresh(fetchedAt: number): boolean {
    return Date.now() - fetchedAt < CACHE_DURATION_MS
}
