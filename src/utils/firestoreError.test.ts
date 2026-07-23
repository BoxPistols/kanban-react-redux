import { describe, it, expect } from 'vitest'
import { classifyFirestoreError, classifyFirestoreErrorKind } from './firestoreError'

describe('classifyFirestoreErrorKind', () => {
    it('classifies permission-denied regardless of online state', () => {
        const err = { code: 'permission-denied', message: 'Missing or insufficient permissions.' }
        expect(classifyFirestoreErrorKind(err, true)).toBe('permission')
        expect(classifyFirestoreErrorKind(err, false)).toBe('permission')
    })

    it('classifies an offline device as offline, not blocked (even on a fetch error)', () => {
        // 通信断の典型: unavailable + navigator.onLine === false
        const err = { code: 'unavailable', message: 'Failed to fetch' }
        expect(classifyFirestoreErrorKind(err, false)).toBe('offline')
    })

    it('classifies online-but-unreachable as blocked (likely ad blocker/privacy)', () => {
        const err = { code: 'unavailable', message: 'Failed to fetch' }
        expect(classifyFirestoreErrorKind(err, true)).toBe('blocked')
    })

    it('treats an unknown error while online as blocked', () => {
        expect(classifyFirestoreErrorKind(new Error('boom'), true)).toBe('blocked')
    })
})

describe('classifyFirestoreError (message)', () => {
    it('does NOT label a plain offline failure as an ad blocker', () => {
        const msg = classifyFirestoreError({ code: 'unavailable', message: 'Failed to fetch' }, false)
        expect(msg.startsWith('ERR_OFFLINE:')).toBe(true)
        expect(msg).not.toContain('ERR_BLOCKED')
    })

    it('labels an online-but-unreachable failure as possibly blocked', () => {
        const msg = classifyFirestoreError({ code: 'unavailable', message: 'Failed to fetch' }, true)
        expect(msg.startsWith('ERR_BLOCKED:')).toBe(true)
        // 断定せず「可能性」表現であること
        expect(msg).toContain('可能性')
    })

    it('returns a permission message without any ERR_ prefix', () => {
        const msg = classifyFirestoreError({ code: 'permission-denied' }, true)
        expect(msg).not.toContain('ERR_BLOCKED')
        expect(msg).not.toContain('ERR_OFFLINE')
    })
})
