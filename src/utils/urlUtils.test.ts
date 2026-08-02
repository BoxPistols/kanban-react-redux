import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { parseUrls, isMetadataFresh, toProxySafeUrl, isYouTubeUrl } from './urlUtils'

describe('urlUtils', () => {
    describe('parseUrls', () => {
        it('should detect http URL', () => {
            const text = 'Check out http://example.com for more info'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('http://example.com')
            expect(urls[0].startIndex).toBe(10)
            expect(urls[0].endIndex).toBe(28) // 10 + 18 = 28
        })

        it('should detect https URL', () => {
            const text = 'Visit https://example.com/path'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://example.com/path')
        })

        it('should detect multiple URLs', () => {
            const text = 'Visit https://example.com and also http://test.org'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(2)
            expect(urls[0].url).toBe('https://example.com')
            expect(urls[1].url).toBe('http://test.org')
        })

        it('should exclude trailing punctuation', () => {
            const text = 'Check https://example.com, https://test.org. and https://foo.com!'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(3)
            expect(urls[0].url).toBe('https://example.com')
            expect(urls[1].url).toBe('https://test.org')
            expect(urls[2].url).toBe('https://foo.com')
        })

        it('should handle URLs with query parameters', () => {
            const text = 'Search https://example.com?q=test&lang=en'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://example.com?q=test&lang=en')
        })

        it('should handle URLs with parentheses in path', () => {
            const text = 'Wikipedia: https://en.wikipedia.org/wiki/Test_(example)'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://en.wikipedia.org/wiki/Test_(example)')
        })

        it('should return empty array for text without URLs', () => {
            const text = 'This is just plain text without any links'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(0)
        })

        it('should handle YouTube short URLs', () => {
            const text = 'Watch https://youtu.be/dQw4w9WgXcQ'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://youtu.be/dQw4w9WgXcQ')
        })

        it('should handle YouTube watch URLs', () => {
            const text = 'Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        })

        it('should handle URLs with hash fragments', () => {
            const text = 'Anchor: https://example.com/page#section'
            const urls = parseUrls(text)

            expect(urls).toHaveLength(1)
            expect(urls[0].url).toBe('https://example.com/page#section')
        })
    })

    describe('isMetadataFresh', () => {
        let mockNow: number

        beforeEach(() => {
            mockNow = new Date('2024-01-15T12:00:00Z').getTime()
            vi.setSystemTime(mockNow)
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('should return true for metadata fetched 1 day ago', () => {
            const oneDayAgo = mockNow - 24 * 60 * 60 * 1000
            expect(isMetadataFresh(oneDayAgo)).toBe(true)
        })

        it('should return true for metadata fetched 29 days ago', () => {
            const twentyNineDaysAgo = mockNow - 29 * 24 * 60 * 60 * 1000
            expect(isMetadataFresh(twentyNineDaysAgo)).toBe(true)
        })

        it('should return false for metadata fetched 31 days ago', () => {
            const thirtyOneDaysAgo = mockNow - 31 * 24 * 60 * 60 * 1000
            expect(isMetadataFresh(thirtyOneDaysAgo)).toBe(false)
        })

        it('should return true for metadata just fetched', () => {
            expect(isMetadataFresh(mockNow)).toBe(true)
        })

        it('should return false for metadata fetched more than 30 days ago', () => {
            const twoMonthsAgo = mockNow - 60 * 24 * 60 * 60 * 1000
            expect(isMetadataFresh(twoMonthsAgo)).toBe(false)
        })

        it('should handle edge case at exactly 30 days', () => {
            const thirtyDaysAgo = mockNow - 30 * 24 * 60 * 60 * 1000
            // At exactly 30 days, the condition is: 0 < 30days, which is false
            expect(isMetadataFresh(thirtyDaysAgo)).toBe(false)
        })
    })

    // メタデータ取得は公開 CORS プロキシ経由なので、カード内の URL は第三者に
    // 送信され、その第三者がサーバー側で実際に開く。何を送らないかを固定する。
    describe('toProxySafeUrl (外部プロキシへの流出防止)', () => {
        it('通常の URL はクエリとフラグメントを落として通す', () => {
            expect(toProxySafeUrl('https://example.com/article?id=123#section')).toBe('https://example.com/article')
            expect(toProxySafeUrl('https://example.com')).toBe('https://example.com/')
            expect(toProxySafeUrl('http://example.com/a/b/c')).toBe('http://example.com/a/b/c')
        })

        it('社内・プライベートなホストは送らない', () => {
            const internal = [
                'http://localhost:3000/board',
                'http://127.0.0.1/admin',
                'http://10.0.1.5/wiki/page',
                'http://192.168.1.10/nas',
                'http://172.16.0.9/jenkins',
                'http://169.254.169.254/latest/meta-data/', // クラウドのメタデータ
                'http://wiki/page', // ドット無し = イントラネット名
                'https://confluence.corp/spaces/HR',
                'https://printer.local/status',
                'https://build.internal/job/42',
            ]
            for (const url of internal) {
                expect(toProxySafeUrl(url), url).toBeNull()
            }
        })

        it('資格情報を運ぶ URL は(クエリを削らず)丸ごと送らない', () => {
            const secrets = [
                'https://example.com/f?token=abc123',
                'https://example.com/f?access_token=abc',
                'https://example.com/reset?code=one-time',
                'https://bucket.s3.amazonaws.com/o?X-Amz-Signature=deadbeef',
                'https://storage.googleapis.com/o?X-Goog-Signature=deadbeef',
                'https://example.com/f?apiKey=zzz',
                'https://user:pass@example.com/private',
                'https://example.com/cb#access_token=implicit-flow',
            ]
            for (const url of secrets) {
                expect(toProxySafeUrl(url), url).toBeNull()
            }
        })

        it('http/https 以外と壊れた URL は送らない', () => {
            expect(toProxySafeUrl('javascript:alert(1)')).toBeNull()
            expect(toProxySafeUrl('file:///etc/passwd')).toBeNull()
            expect(toProxySafeUrl('data:text/html,<h1>x</h1>')).toBeNull()
            expect(toProxySafeUrl('not a url')).toBeNull()
        })

        it('公開ホストで紛らわしい名前は通す(過剰な除外をしない)', () => {
            // "local" を含むが内部 TLD ではない
            expect(toProxySafeUrl('https://localhost.example.com/x')).toBe('https://localhost.example.com/x')
            // 172.15 / 172.32 は私的レンジ外
            expect(toProxySafeUrl('http://172.15.0.1/x')).toBe('http://172.15.0.1/x')
            expect(toProxySafeUrl('http://172.32.0.1/x')).toBe('http://172.32.0.1/x')
        })
    })

    describe('isYouTubeUrl', () => {
        it('ホスト名で判定する', () => {
            expect(isYouTubeUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
            expect(isYouTubeUrl('https://youtu.be/abc')).toBe(true)
            expect(isYouTubeUrl('https://m.youtube.com/watch?v=abc')).toBe(true)
        })

        it('URL 文字列に youtube.com/watch を含むだけの他サイトは YouTube 扱いしない', () => {
            expect(isYouTubeUrl('https://evil.example.com/?u=youtube.com/watch')).toBe(false)
            expect(isYouTubeUrl('https://notyoutube.com/watch?v=abc')).toBe(false)
        })
    })
})
