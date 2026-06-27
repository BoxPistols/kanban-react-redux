import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { parseUrls, isMetadataFresh } from './urlUtils'

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
})
