// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useKanbanStore } from './kanbanStore'
import { useTrashStore } from './trashStore'
import { useAuthStore } from './authStore'
import type { Card } from '../types'

// Build a fully-typed Card with sensible defaults that callers can override.
function makeCard(over: Partial<Card> = {}): Card {
    return {
        id: 'card-default',
        text: 'card',
        columnId: 'TODO',
        boardId: 'b1',
        order: 0,
        createdAt: 0,
        updatedAt: 0,
        ...over,
    }
}

describe('kanbanStore (offline / localStorage mode)', () => {
    beforeEach(() => {
        // jsdom's localStorage in this env lacks a usable clear(); install a Map-based mock
        // (same pattern as themeStore.test.ts). setItem/removeItem still work so the store's
        // module-level localStorageAvailable check stays true and writes hit this mock.
        const store = new Map<string, string>()
        const mock: Storage = {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value)
            },
            removeItem: (key: string) => {
                store.delete(key)
            },
            clear: () => {
                store.clear()
            },
            get length() {
                return store.size
            },
            key: (index: number) => Array.from(store.keys())[index] ?? null,
        }
        Object.defineProperty(window, 'localStorage', { configurable: true, value: mock })

        // Force the pure-localStorage branch so no Firebase write/onSnapshot runs.
        useKanbanStore.setState({ cards: [], forceOfflineMode: true, isLoading: false, error: null })
        useTrashStore.setState({ trashedCards: [] })
        // Null user is fine for addCard (userId becomes undefined and is dropped).
        useAuthStore.setState({ user: null })
        localStorage.clear()
    })

    describe('addCard', () => {
        it('sets order to max(order)+1 scoped to the SAME column AND board', async () => {
            useKanbanStore.setState({
                cards: [
                    makeCard({ id: 'a', columnId: 'TODO', boardId: 'b1', order: 0 }),
                    makeCard({ id: 'b', columnId: 'TODO', boardId: 'b1', order: 5 }),
                    // Different board, same column -> must be ignored even though order is high.
                    makeCard({ id: 'c', columnId: 'TODO', boardId: 'b2', order: 99 }),
                    // Same board, different column -> must be ignored.
                    makeCard({ id: 'd', columnId: 'Done', boardId: 'b1', order: 50 }),
                ],
            })

            await useKanbanStore.getState().addCard('new card', 'TODO', 'b1')

            const cards = useKanbanStore.getState().cards
            const created = cards.find((c) => c.text === 'new card')
            expect(created).toBeDefined()
            // max(TODO@b1) = 5 -> 6, not influenced by b2 (99) or Done (50)
            expect(created?.order).toBe(6)
            expect(created?.columnId).toBe('TODO')
            expect(created?.boardId).toBe('b1')
        })

        it('uses order 0 when the target column/board is empty', async () => {
            useKanbanStore.setState({
                cards: [makeCard({ id: 'x', columnId: 'TODO', boardId: 'b1', order: 10 })],
            })

            await useKanbanStore.getState().addCard('first in Done', 'Done', 'b1')

            const created = useKanbanStore.getState().cards.find((c) => c.text === 'first in Done')
            expect(created?.order).toBe(0)
        })
    })

    describe('moveCard', () => {
        it('updates columnId/order of the target card only', async () => {
            useKanbanStore.setState({
                cards: [
                    makeCard({ id: 'target', columnId: 'TODO', boardId: 'b1', order: 0 }),
                    makeCard({ id: 'other', columnId: 'TODO', boardId: 'b1', order: 1 }),
                ],
            })

            await useKanbanStore.getState().moveCard('target', 'Done', 3)

            const cards = useKanbanStore.getState().cards
            const target = cards.find((c) => c.id === 'target')
            const other = cards.find((c) => c.id === 'other')
            expect(target?.columnId).toBe('Done')
            expect(target?.order).toBe(3)
            // Untouched card stays exactly as before.
            expect(other?.columnId).toBe('TODO')
            expect(other?.order).toBe(1)
        })
    })

    describe('reorderCards', () => {
        it('applies each update including the optional columnId', async () => {
            useKanbanStore.setState({
                cards: [
                    makeCard({ id: 'x', columnId: 'TODO', boardId: 'b1', order: 0 }),
                    makeCard({ id: 'y', columnId: 'TODO', boardId: 'b1', order: 1 }),
                    makeCard({ id: 'z', columnId: 'Done', boardId: 'b1', order: 0 }),
                ],
            })

            await useKanbanStore.getState().reorderCards([
                { id: 'x', order: 2, columnId: 'Done' }, // order + column change
                { id: 'y', order: 0 }, // order only, column unchanged
            ])

            const cards = useKanbanStore.getState().cards
            const x = cards.find((c) => c.id === 'x')
            const y = cards.find((c) => c.id === 'y')
            const z = cards.find((c) => c.id === 'z')

            expect(x?.order).toBe(2)
            expect(x?.columnId).toBe('Done')

            expect(y?.order).toBe(0)
            expect(y?.columnId).toBe('TODO') // no columnId in update -> preserved

            // Card not listed in updates is untouched.
            expect(z?.order).toBe(0)
            expect(z?.columnId).toBe('Done')
        })
    })

    describe('restoreCard', () => {
        it('inserts a card without trash-only fields and with order=max+1 in the target column', async () => {
            useKanbanStore.setState({
                cards: [
                    makeCard({ id: 'existing', columnId: 'TODO', boardId: 'b1', order: 7 }),
                    // Different column/board to confirm scoping of max().
                    makeCard({ id: 'noise', columnId: 'Done', boardId: 'b1', order: 99 }),
                ],
            })

            // A trashed-shaped card carrying the trash-only fields.
            const trashed = {
                ...makeCard({ id: 'restore-me', columnId: 'OldCol', boardId: 'old-board', order: 3 }),
                deletedAt: 123456,
                originalBoardId: 'old-board',
                originalColumnId: 'OldCol',
            } as Card

            await useKanbanStore.getState().restoreCard(trashed, 'b1', 'TODO')

            const restored = useKanbanStore.getState().cards.find((c) => c.id === 'restore-me')
            expect(restored).toBeDefined()
            // order = max(TODO@b1)=7 -> 8
            expect(restored?.order).toBe(8)
            expect(restored?.boardId).toBe('b1')
            expect(restored?.columnId).toBe('TODO')
            // Trash-only fields must be stripped.
            expect('deletedAt' in (restored as Card)).toBe(false)
            expect('originalBoardId' in (restored as Card)).toBe(false)
            expect('originalColumnId' in (restored as Card)).toBe(false)
            // Original id preserved.
            expect(restored?.id).toBe('restore-me')
        })
    })

    describe('updateCard', () => {
        it('deletes a field when its update value is null (offline null-delete loop)', async () => {
            useKanbanStore.setState({
                cards: [
                    makeCard({ id: 'u1', columnId: 'TODO', boardId: 'b1', order: 0, color: 'red', dueDate: 12345 }),
                ],
            })

            // dueDate is typed `number | null`; null triggers the for..in delete loop.
            await useKanbanStore.getState().updateCard('u1', { dueDate: null })

            const updated = useKanbanStore.getState().cards.find((c) => c.id === 'u1')
            expect(updated).toBeDefined()
            // Field removed entirely, not set to null.
            expect('dueDate' in (updated as Card)).toBe(false)
            // Unrelated field preserved.
            expect(updated?.color).toBe('red')
        })
    })

    describe('deleteCard', () => {
        it('moves the card into the trash store and removes it from cards', async () => {
            const card = makeCard({ id: 'del-1', columnId: 'TODO', boardId: 'b1', order: 0, text: 'to delete' })
            useKanbanStore.setState({
                cards: [card, makeCard({ id: 'keep', columnId: 'TODO', boardId: 'b1', order: 1 })],
            })

            await useKanbanStore.getState().deleteCard('del-1')

            const cards = useKanbanStore.getState().cards
            expect(cards.some((c) => c.id === 'del-1')).toBe(false)
            expect(cards.some((c) => c.id === 'keep')).toBe(true)

            // Pushed into the trash store via addToTrash with trash metadata.
            const trashed = useTrashStore.getState().trashedCards
            expect(trashed).toHaveLength(1)
            expect(trashed[0].id).toBe('del-1')
            expect(trashed[0].originalBoardId).toBe('b1')
            expect(trashed[0].originalColumnId).toBe('TODO')
            expect(typeof trashed[0].deletedAt).toBe('number')
        })
    })
})
