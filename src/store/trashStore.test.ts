// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTrashStore, type TrashedCard } from './trashStore'
import type { Card } from '../types'

// Fixed clock anchor for deterministic time math
const NOW = new Date('2026-06-28T00:00:00.000Z').getTime()
const ONE_HOUR = 60 * 60 * 1000
const ONE_DAY = 24 * ONE_HOUR
const THIRTY_DAYS = 30 * ONE_DAY

function makeCard(overrides: Partial<Card> = {}): Card {
    return {
        id: 'card-1',
        text: 'hello world',
        columnId: 'TODO',
        boardId: 'board-1',
        order: 0,
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    }
}

function makeTrashedCard(overrides: Partial<TrashedCard> = {}): TrashedCard {
    return {
        ...makeCard(),
        deletedAt: NOW,
        originalBoardId: 'board-1',
        originalColumnId: 'TODO',
        ...overrides,
    }
}

describe('trashStore', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(NOW)
        // NOTE: in this jsdom env `localStorage` has no Storage methods, so the
        // store resolves localStorageAvailable=false at import and uses its
        // in-memory fallback. Persistence is therefore unobservable via a
        // localStorage spy; we reset only the zustand state (real state shape).
        useTrashStore.setState({ trashedCards: [] })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    describe('getDaysUntilPermanentDeletion', () => {
        it('returns 30 when deletedAt is now', () => {
            const { getDaysUntilPermanentDeletion } = useTrashStore.getState()
            expect(getDaysUntilPermanentDeletion(NOW)).toBe(30)
        })

        it('returns 1 just under the 30-day boundary', () => {
            const { getDaysUntilPermanentDeletion } = useTrashStore.getState()
            // elapsed = 30 days minus 1 hour -> ~1 hour remaining -> ceil to 1
            const deletedAt = NOW - (THIRTY_DAYS - ONE_HOUR)
            expect(getDaysUntilPermanentDeletion(deletedAt)).toBe(1)
        })

        it('returns 0 once past the 30-day boundary', () => {
            const { getDaysUntilPermanentDeletion } = useTrashStore.getState()
            const deletedAt = NOW - (THIRTY_DAYS + ONE_DAY)
            expect(getDaysUntilPermanentDeletion(deletedAt)).toBe(0)
        })
    })

    describe('cleanupExpiredCards', () => {
        it('keeps a 29-day-old card and removes a 31-day-old card', () => {
            const fresh = makeTrashedCard({ id: 'fresh', deletedAt: NOW - 29 * ONE_DAY })
            const stale = makeTrashedCard({ id: 'stale', deletedAt: NOW - 31 * ONE_DAY })
            useTrashStore.setState({ trashedCards: [fresh, stale] })

            useTrashStore.getState().cleanupExpiredCards()

            const { trashedCards } = useTrashStore.getState()
            expect(trashedCards).toHaveLength(1)
            expect(trashedCards[0].id).toBe('fresh')
        })

        it('does NOT re-persist when nothing changed (length + reference preserved)', () => {
            const fresh = makeTrashedCard({ id: 'fresh', deletedAt: NOW - 29 * ONE_DAY })
            const before = [fresh]
            useTrashStore.setState({ trashedCards: before })

            useTrashStore.getState().cleanupExpiredCards()

            const after = useTrashStore.getState().trashedCards
            // Guard short-circuits: set() is never called, so length is unchanged
            // AND the exact same array reference is kept (no re-persist work done).
            expect(after).toHaveLength(1)
            expect(after).toBe(before)
        })

        it('replaces the array (re-persists) when a card is removed', () => {
            const stale = makeTrashedCard({ id: 'stale', deletedAt: NOW - 31 * ONE_DAY })
            const before = [stale]
            useTrashStore.setState({ trashedCards: before })

            useTrashStore.getState().cleanupExpiredCards()

            const after = useTrashStore.getState().trashedCards
            expect(after).toHaveLength(0)
            expect(after).not.toBe(before)
        })
    })

    describe('addToTrash', () => {
        it('stamps deletedAt and the original board/column ids', () => {
            const card = makeCard({ id: 'to-trash', boardId: 'board-9', columnId: 'Doing' })
            useTrashStore.getState().addToTrash(card)

            const { trashedCards } = useTrashStore.getState()
            expect(trashedCards).toHaveLength(1)
            const trashed = trashedCards[0]
            expect(trashed.id).toBe('to-trash')
            expect(trashed.deletedAt).toBe(NOW)
            expect(trashed.originalBoardId).toBe('board-9')
            expect(trashed.originalColumnId).toBe('Doing')
        })
    })

    describe('restoreFromTrash', () => {
        it('returns the matching card and removes only it', () => {
            const a = makeTrashedCard({ id: 'a' })
            const b = makeTrashedCard({ id: 'b' })
            useTrashStore.setState({ trashedCards: [a, b] })

            const restored = useTrashStore.getState().restoreFromTrash('a')

            expect(restored).not.toBeNull()
            expect(restored?.id).toBe('a')
            const { trashedCards } = useTrashStore.getState()
            expect(trashedCards).toHaveLength(1)
            expect(trashedCards[0].id).toBe('b')
        })

        it('returns null for an unknown id and leaves the trash untouched', () => {
            const a = makeTrashedCard({ id: 'a' })
            useTrashStore.setState({ trashedCards: [a] })

            const restored = useTrashStore.getState().restoreFromTrash('missing')

            expect(restored).toBeNull()
            expect(useTrashStore.getState().trashedCards).toHaveLength(1)
        })
    })

    describe('permanentlyDelete', () => {
        it('removes only the targeted card', () => {
            const a = makeTrashedCard({ id: 'a' })
            const b = makeTrashedCard({ id: 'b' })
            useTrashStore.setState({ trashedCards: [a, b] })

            useTrashStore.getState().permanentlyDelete('a')

            const { trashedCards } = useTrashStore.getState()
            expect(trashedCards).toHaveLength(1)
            expect(trashedCards[0].id).toBe('b')
        })
    })
})
