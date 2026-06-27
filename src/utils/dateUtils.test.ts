import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { isDueSoon, isOverdue, getDueDateStatus } from './dateUtils'
import { ONE_DAY_MS } from '../constants'

describe('dateUtils', () => {
    let mockNow: number

    beforeEach(() => {
        // 2024-01-15 12:00:00 UTC をモック時刻とする
        mockNow = new Date('2024-01-15T12:00:00Z').getTime()
        vi.setSystemTime(mockNow)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('isDueSoon', () => {
        it('should return true for dates within 24 hours in the future', () => {
            const dueSoon = mockNow + ONE_DAY_MS / 2 // 12時間後
            expect(isDueSoon(dueSoon)).toBe(true)
        })

        it('should return false for dates more than 24 hours away', () => {
            const farFuture = mockNow + ONE_DAY_MS + 1000 // 24時間+ 1秒後
            expect(isDueSoon(farFuture)).toBe(false)
        })

        it('should return false for past dates', () => {
            const past = mockNow - 1000 // 1秒前
            expect(isDueSoon(past)).toBe(false)
        })

        it('should return false for null', () => {
            expect(isDueSoon(null)).toBe(false)
        })

        it('should return false for undefined', () => {
            expect(isDueSoon(undefined)).toBe(false)
        })

        it('should return true for dates exactly 24 hours away', () => {
            const exactlyOneDayAway = mockNow + ONE_DAY_MS - 1 // 1ms前
            expect(isDueSoon(exactlyOneDayAway)).toBe(true)
        })

        it('should return true for dates in 1 hour', () => {
            const oneHour = mockNow + 60 * 60 * 1000
            expect(isDueSoon(oneHour)).toBe(true)
        })
    })

    describe('isOverdue', () => {
        it('should return true for past dates', () => {
            const past = mockNow - 1000 // 1秒前
            expect(isOverdue(past)).toBe(true)
        })

        it('should return false for future dates', () => {
            const future = mockNow + 1000 // 1秒後
            expect(isOverdue(future)).toBe(false)
        })

        it('should return false for null', () => {
            expect(isOverdue(null)).toBe(false)
        })

        it('should return false for undefined', () => {
            expect(isOverdue(undefined)).toBe(false)
        })

        it('should return true for dates 1 week in the past', () => {
            const weekAgo = mockNow - 7 * ONE_DAY_MS
            expect(isOverdue(weekAgo)).toBe(true)
        })

        it('should return false for current time', () => {
            expect(isOverdue(mockNow)).toBe(false)
        })
    })

    describe('getDueDateStatus', () => {
        it('should return both false for null', () => {
            const status = getDueDateStatus(null)
            expect(status.isDueSoon).toBe(false)
            expect(status.isOverdue).toBe(false)
        })

        it('should return both false for undefined', () => {
            const status = getDueDateStatus(undefined)
            expect(status.isDueSoon).toBe(false)
            expect(status.isOverdue).toBe(false)
        })

        it('should return isDueSoon=true, isOverdue=false for near future dates', () => {
            const soon = mockNow + ONE_DAY_MS / 2
            const status = getDueDateStatus(soon)
            expect(status.isDueSoon).toBe(true)
            expect(status.isOverdue).toBe(false)
        })

        it('should return isDueSoon=false, isOverdue=true for past dates', () => {
            const past = mockNow - 1000
            const status = getDueDateStatus(past)
            expect(status.isDueSoon).toBe(false)
            expect(status.isOverdue).toBe(true)
        })

        it('should return both false for far future dates', () => {
            const farFuture = mockNow + ONE_DAY_MS * 2
            const status = getDueDateStatus(farFuture)
            expect(status.isDueSoon).toBe(false)
            expect(status.isOverdue).toBe(false)
        })
    })
})
