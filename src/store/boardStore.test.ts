// @vitest-environment jsdom
import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { DEFAULT_COLUMNS } from '../types'
import type { Board, ColumnDefinition } from '../types'

const STORAGE_KEY = 'kanban-boards'
const CURRENT_BOARD_KEY = 'kanban-current-board'

// This jsdom environment exposes a `localStorage` object with NO working methods,
// so boardStore captures `localStorageAvailable === false` at module load and would
// fall back to private in-memory state we cannot reset between tests. We install a
// working Map-based localStorage BEFORE importing boardStore so it captures
// `localStorageAvailable === true` and reads/writes the storage we fully control.
let backing: Map<string, string>
function installLocalStorage(): void {
    backing = new Map()
    const mock = {
        getItem: (key: string): string | null => (backing.has(key) ? (backing.get(key) ?? null) : null),
        setItem: (key: string, value: string): void => {
            backing.set(key, String(value))
        },
        removeItem: (key: string): void => {
            backing.delete(key)
        },
        clear: (): void => {
            backing.clear()
        },
        key: (index: number): string | null => Array.from(backing.keys())[index] ?? null,
        get length(): number {
            return backing.size
        },
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: mock })
}

// Loaded lazily after the localStorage mock is in place.
let useBoardStore: typeof import('./boardStore').useBoardStore

beforeAll(async () => {
    installLocalStorage()
    const mod = await import('./boardStore')
    useBoardStore = mod.useBoardStore
})

function makeBoard(overrides: Partial<Board> = {}): Board {
    return {
        id: 'board-1',
        name: 'Test Board',
        description: '',
        color: '#0079BF',
        labels: [],
        columns: [],
        createdAt: 1,
        updatedAt: 1,
        ...overrides,
    }
}

function cols(...defs: ColumnDefinition[]): ColumnDefinition[] {
    return defs
}

describe('boardStore', () => {
    beforeEach(() => {
        // Required reset shape for the BoardState slice under test.
        useBoardStore.setState({ boards: [], currentBoardId: null, forceOfflineMode: true })
        localStorage.clear()
    })

    describe('getColumns', () => {
        it('returns columns sorted by order', () => {
            const board = makeBoard({
                columns: cols(
                    { id: 'c', title: 'C', order: 2 },
                    { id: 'a', title: 'A', order: 0 },
                    { id: 'b', title: 'B', order: 1 }
                ),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            const result = useBoardStore.getState().getColumns(board.id)
            expect(result.map((c) => c.id)).toEqual(['a', 'b', 'c'])
        })

        it('uses currentBoardId when no boardId is passed', () => {
            const board = makeBoard({
                columns: cols({ id: 'y', title: 'Y', order: 1 }, { id: 'x', title: 'X', order: 0 }),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            const result = useBoardStore.getState().getColumns()
            expect(result.map((c) => c.id)).toEqual(['x', 'y'])
        })

        it('returns a defensive copy (does not mutate the stored columns order)', () => {
            const stored = cols(
                { id: 'c', title: 'C', order: 2 },
                { id: 'a', title: 'A', order: 0 },
                { id: 'b', title: 'B', order: 1 }
            )
            const board = makeBoard({ columns: stored })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            const result = useBoardStore.getState().getColumns(board.id)
            // A new array is returned, not the stored reference.
            expect(result).not.toBe(stored)
            // Sorting the returned array did not reorder the original stored array.
            expect(stored.map((c) => c.id)).toEqual(['c', 'a', 'b'])
        })

        it('falls back to DEFAULT_COLUMNS when the board has an empty columns array', () => {
            const board = makeBoard({ columns: [] })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            expect(useBoardStore.getState().getColumns(board.id)).toEqual(DEFAULT_COLUMNS)
        })

        it('falls back to DEFAULT_COLUMNS when the board has no columns field', () => {
            const board = makeBoard({ columns: undefined })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            expect(useBoardStore.getState().getColumns(board.id)).toEqual(DEFAULT_COLUMNS)
        })

        it('falls back to DEFAULT_COLUMNS when the board id is unknown', () => {
            expect(useBoardStore.getState().getColumns('nope')).toEqual(DEFAULT_COLUMNS)
        })
    })

    describe('removeColumn', () => {
        it('refuses to remove when only 1 column remains', async () => {
            const board = makeBoard({
                columns: cols({ id: 'only', title: 'Only', order: 0 }),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            await useBoardStore.getState().removeColumn(board.id, 'only')

            const after = useBoardStore.getState().boards[0].columns
            expect(after).toHaveLength(1)
            expect(after?.[0].id).toBe('only')
        })

        it('reindexes order to a contiguous 0..n-1 range after removal', async () => {
            const board = makeBoard({
                columns: cols(
                    { id: 'a', title: 'A', order: 0 },
                    { id: 'b', title: 'B', order: 5 },
                    { id: 'c', title: 'C', order: 9 }
                ),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            await useBoardStore.getState().removeColumn(board.id, 'b')

            const after = useBoardStore.getState().boards[0].columns ?? []
            expect(after.map((c) => c.id)).toEqual(['a', 'c'])
            expect(after.map((c) => c.order)).toEqual([0, 1])
        })

        it('does nothing for an unknown board', async () => {
            const board = makeBoard({
                columns: cols({ id: 'a', title: 'A', order: 0 }, { id: 'b', title: 'B', order: 1 }),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            await useBoardStore.getState().removeColumn('missing', 'a')

            expect(useBoardStore.getState().boards[0].columns).toHaveLength(2)
        })
    })

    describe('addColumn', () => {
        it('appends a new column with order = columns.length', async () => {
            const board = makeBoard({
                columns: cols({ id: 'a', title: 'A', order: 0 }, { id: 'b', title: 'B', order: 1 }),
            })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            await useBoardStore.getState().addColumn(board.id, 'New', '#ff0000')

            const after = useBoardStore.getState().boards[0].columns ?? []
            expect(after).toHaveLength(3)
            const appended = after[2]
            expect(appended.title).toBe('New')
            expect(appended.order).toBe(2)
            expect(appended.color).toBe('#ff0000')
            expect(appended.id).toBeTruthy()
        })

        it('appends onto DEFAULT_COLUMNS when the board has no columns', async () => {
            const board = makeBoard({ columns: undefined })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            await useBoardStore.getState().addColumn(board.id, 'Extra')

            const after = useBoardStore.getState().boards[0].columns ?? []
            expect(after).toHaveLength(DEFAULT_COLUMNS.length + 1)
            expect(after[after.length - 1].order).toBe(DEFAULT_COLUMNS.length)
            expect(after[after.length - 1].title).toBe('Extra')
        })
    })

    describe('reorderColumns', () => {
        it('recomputes contiguous order from the supplied array order', async () => {
            const a: ColumnDefinition = { id: 'a', title: 'A', order: 0 }
            const b: ColumnDefinition = { id: 'b', title: 'B', order: 1 }
            const c: ColumnDefinition = { id: 'c', title: 'C', order: 2 }
            const board = makeBoard({ columns: cols(a, b, c) })
            useBoardStore.setState({ boards: [board], currentBoardId: board.id, forceOfflineMode: true })

            // New visual order: c, a, b
            await useBoardStore.getState().reorderColumns(board.id, [c, a, b])

            const after = useBoardStore.getState().boards[0].columns ?? []
            expect(after.map((col) => col.id)).toEqual(['c', 'a', 'b'])
            expect(after.map((col) => col.order)).toEqual([0, 1, 2])
        })
    })

    describe('initializeOfflineMode', () => {
        it('creates a default board with DEFAULT_COLUMNS when none exist', () => {
            useBoardStore.getState().initializeOfflineMode()

            const state = useBoardStore.getState()
            expect(state.boards).toHaveLength(1)
            expect(state.boards[0].name).toBe('マイボード')
            expect(state.boards[0].columns).toEqual(DEFAULT_COLUMNS)
            expect(state.forceOfflineMode).toBe(true)
            // First board is auto-selected as current.
            expect(state.currentBoardId).toBe(state.boards[0].id)
            // Persisted to (mock) localStorage.
            const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Board[]
            expect(persisted).toHaveLength(1)
            expect(localStorage.getItem(CURRENT_BOARD_KEY)).toBe(state.boards[0].id)
        })

        it('back-fills DEFAULT_COLUMNS onto a legacy board seeded without columns', () => {
            const legacy = {
                id: 'legacy-1',
                name: 'Legacy',
                description: '',
                color: '#0079BF',
                labels: [],
                createdAt: 1,
                updatedAt: 1,
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify([legacy]))

            useBoardStore.getState().initializeOfflineMode()

            const state = useBoardStore.getState()
            expect(state.boards).toHaveLength(1)
            expect(state.boards[0].id).toBe('legacy-1')
            expect(state.boards[0].columns).toEqual(DEFAULT_COLUMNS)
            // Migration is persisted back to storage.
            const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Board[]
            expect(persisted[0].columns).toEqual(DEFAULT_COLUMNS)
            // First board selected as current when none was stored.
            expect(state.currentBoardId).toBe('legacy-1')
        })

        it('leaves an already-migrated board untouched', () => {
            const existing = makeBoard({
                id: 'kept',
                columns: cols({ id: 'x', title: 'X', order: 0 }, { id: 'y', title: 'Y', order: 1 }),
            })
            localStorage.setItem(STORAGE_KEY, JSON.stringify([existing]))

            useBoardStore.getState().initializeOfflineMode()

            const state = useBoardStore.getState()
            expect(state.boards).toHaveLength(1)
            expect(state.boards[0].columns?.map((c) => c.id)).toEqual(['x', 'y'])
        })
    })
})
