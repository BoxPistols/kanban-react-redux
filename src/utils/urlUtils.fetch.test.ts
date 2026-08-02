// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { fetchUrlMetadata } from './urlUtils'

/**
 * 「送らない」ことをネットワーク層で確認する。
 *
 * 純粋関数のテスト(toProxySafeUrl)だけだと、呼び出し側がサニタイズ結果を
 * 使い忘れていても気付けない。実際に fetch へ渡った URL を検証する。
 * happy-dom は DOMParser のために必要。
 */
describe('fetchUrlMetadata の送信内容', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn(async () => ({
            ok: true,
            json: async () => ({ contents: '<html><head><title>ページ名</title></head></html>' }),
        }))
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    // fetch に渡った URL のうち、プロキシの url= に載っていた元 URL を取り出す
    function proxiedTarget(callIndex = 0): string | null {
        const called = fetchMock.mock.calls[callIndex]?.[0] as string | undefined
        if (!called) return null
        const param = new URL(called).searchParams.get('url')
        return param
    }

    it('社内ホストの URL は一切ネットワークに出さない', async () => {
        const result = await fetchUrlMetadata('http://wiki.internal/secret-page')
        expect(result.error).toBe(true)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('署名付き URL は一切ネットワークに出さない', async () => {
        const result = await fetchUrlMetadata('https://bucket.s3.amazonaws.com/f?X-Amz-Signature=deadbeef')
        expect(result.error).toBe(true)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('通常の URL はクエリを落としてプロキシに渡す', async () => {
        const result = await fetchUrlMetadata('https://example.com/article?utm_source=mail&id=42#frag')
        expect(result.title).toBe('ページ名')
        expect(fetchMock).toHaveBeenCalledTimes(1)
        // クエリもフラグメントも第三者に渡っていない
        expect(proxiedTarget()).toBe('https://example.com/article')
    })

    it('YouTube はプロキシを経由せず oEmbed を直接叩く', async () => {
        fetchMock.mockImplementation(async () => ({
            ok: true,
            json: async () => ({ title: '動画タイトル' }),
        }))
        const result = await fetchUrlMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        expect(result.title).toBe('動画タイトル')
        const called = fetchMock.mock.calls[0][0] as string
        expect(called).toContain('youtube.com/oembed')
        expect(called).not.toContain('allorigins')
    })
})
