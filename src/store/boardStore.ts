import { create } from 'zustand'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db, isFirebaseEnabled } from '../lib/firebase'
import { BOARD_COLORS } from '../constants'
import type { Board, Label, ColumnDefinition } from '../types'
import { DEFAULT_COLUMNS } from '../types'

const STORAGE_KEY = 'kanban-boards'
const CURRENT_BOARD_KEY = 'kanban-current-board'

// Check if localStorage is available
function isLocalStorageAvailable(): boolean {
    try {
        const testKey = '__test__'
        localStorage.setItem(testKey, testKey)
        localStorage.removeItem(testKey)
        return true
    } catch {
        return false
    }
}

const localStorageAvailable = isLocalStorageAvailable()

// In-memory fallback when localStorage is not available
let inMemoryBoards: Board[] = []
let inMemoryCurrentBoardId: string | null = null

function loadBoardsFromLocalStorage(): Board[] {
    if (!localStorageAvailable) {
        return inMemoryBoards
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            return JSON.parse(stored)
        }
    } catch (error) {
        console.error('Error loading boards from localStorage:', error)
    }
    return []
}

function saveBoardsToLocalStorage(boards: Board[]): void {
    if (!localStorageAvailable) {
        inMemoryBoards = boards
        return
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
    } catch (error) {
        console.error('Error saving boards to localStorage:', error)
        // Fallback to in-memory
        inMemoryBoards = boards
    }
}

function loadCurrentBoardId(): string | null {
    if (!localStorageAvailable) {
        return inMemoryCurrentBoardId
    }
    try {
        return localStorage.getItem(CURRENT_BOARD_KEY)
    } catch (error) {
        console.error('Error loading current board id:', error)
        return inMemoryCurrentBoardId
    }
}

function saveCurrentBoardId(boardId: string | null): void {
    if (!localStorageAvailable) {
        inMemoryCurrentBoardId = boardId
        return
    }
    try {
        if (boardId) {
            localStorage.setItem(CURRENT_BOARD_KEY, boardId)
        } else {
            localStorage.removeItem(CURRENT_BOARD_KEY)
        }
    } catch (error) {
        console.error('Error saving current board id:', error)
        // Fallback to in-memory
        inMemoryCurrentBoardId = boardId
    }
}

// Firestoreは undefined 値をサポートしていないため、除去する
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const result: Partial<T> = {}
    for (const key in obj) {
        if (obj[key] !== undefined) {
            result[key] = obj[key]
        }
    }
    return result
}

interface BoardState {
    boards: Board[]
    currentBoardId: string | null
    isLoading: boolean
    error: string | null
    forceOfflineMode: boolean

    // Actions
    setBoards: (boards: Board[]) => void
    setCurrentBoardId: (boardId: string | null) => void
    setForceOfflineMode: (offline: boolean) => void
    addBoard: (name: string, description?: string, color?: string, labels?: Label[]) => Promise<void>
    updateBoard: (id: string, updates: Partial<Board>) => Promise<void>
    deleteBoard: (id: string) => Promise<void>
    addLabelToBoard: (boardId: string, label: Omit<Label, 'id'>) => Promise<void>
    removeLabelFromBoard: (boardId: string, labelId: string) => Promise<void>
    updateLabel: (boardId: string, labelId: string, updates: Partial<Label>) => Promise<void>
    // カラム管理アクション
    addColumn: (boardId: string, title: string, color?: string) => Promise<void>
    removeColumn: (boardId: string, columnId: string) => Promise<void>
    updateColumn: (boardId: string, columnId: string, updates: Partial<ColumnDefinition>) => Promise<void>
    reorderColumns: (boardId: string, columns: ColumnDefinition[]) => Promise<void>
    getColumns: (boardId?: string) => ColumnDefinition[]
    subscribeToBoards: () => () => void
    initializeOfflineMode: () => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
    boards: [],
    currentBoardId: null,
    isLoading: false,
    error: null,
    forceOfflineMode: false,

    setBoards: (boards) => {
        set({ boards })
        const useFirebase = isFirebaseEnabled && !get().forceOfflineMode
        if (!useFirebase) {
            saveBoardsToLocalStorage(boards)
        }
    },

    setCurrentBoardId: (boardId) => {
        set({ currentBoardId: boardId })
        saveCurrentBoardId(boardId)
    },

    setForceOfflineMode: (offline) => {
        set({ forceOfflineMode: offline })
    },

    // Initialize offline mode with default board
    initializeOfflineMode: () => {
        let boards = loadBoardsFromLocalStorage()
        let currentBoardId = loadCurrentBoardId()

        // Create default board if none exist
        if (boards.length === 0) {
            const defaultBoard: Board = {
                id: uuidv4(),
                name: 'マイボード',
                description: 'デフォルトのボード',
                color: BOARD_COLORS[0],
                labels: [],
                columns: DEFAULT_COLUMNS,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }
            boards = [defaultBoard]
            saveBoardsToLocalStorage(boards)
            currentBoardId = defaultBoard.id
            saveCurrentBoardId(currentBoardId)
        }

        // 既存ボードにcolumnsが未設定の場合、デフォルトカラムを追加
        let updated = false
        boards = boards.map((board) => {
            if (!board.columns || board.columns.length === 0) {
                updated = true
                return { ...board, columns: DEFAULT_COLUMNS }
            }
            return board
        })
        if (updated) {
            saveBoardsToLocalStorage(boards)
        }

        set({ boards, currentBoardId, isLoading: false, error: null, forceOfflineMode: true })

        // Set first board as current if none selected
        if (!currentBoardId && boards.length > 0) {
            get().setCurrentBoardId(boards[0].id)
        }
    },

    addBoard: async (name, description, color, labels) => {
        try {
            set({ isLoading: true, error: null })

            const newBoardData = {
                name,
                description: description || '',
                color: color || '#0079BF',
                labels: labels || [],
                columns: DEFAULT_COLUMNS,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }

            const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
            if (useFirebase) {
                const docRef = await addDoc(collection(db!, 'boards'), newBoardData)
                // Set as current board if it's the first one
                const currentBoards = get().boards
                if (currentBoards.length === 0) {
                    get().setCurrentBoardId(docRef.id)
                }
            } else {
                const newBoard: Board = {
                    id: uuidv4(),
                    ...newBoardData,
                }
                const currentBoards = get().boards
                const updatedBoards = [...currentBoards, newBoard]
                set({ boards: updatedBoards })
                saveBoardsToLocalStorage(updatedBoards)
                // Always set as current board after creation
                get().setCurrentBoardId(newBoard.id)
            }
            set({ isLoading: false })
        } catch (error) {
            console.error('Error adding board:', error)
            set({ error: 'ボードの追加に失敗しました', isLoading: false })
        }
    },

    updateBoard: async (id, updates) => {
        try {
            set({ isLoading: true, error: null })

            const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
            if (useFirebase) {
                const boardRef = doc(db!, 'boards', id)
                const cleanedUpdates = removeUndefinedFields({
                    ...updates,
                    updatedAt: Date.now(),
                })
                await updateDoc(boardRef, cleanedUpdates)
            } else {
                const currentBoards = get().boards
                const updatedBoards = currentBoards.map((board) =>
                    board.id === id ? { ...board, ...updates, updatedAt: Date.now() } : board
                )
                set({ boards: updatedBoards })
                saveBoardsToLocalStorage(updatedBoards)
            }
            set({ isLoading: false })
        } catch (error) {
            console.error('Error updating board:', error)
            set({ error: 'ボードの更新に失敗しました', isLoading: false })
        }
    },

    deleteBoard: async (id) => {
        try {
            set({ isLoading: true, error: null })

            const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
            if (useFirebase) {
                const boardRef = doc(db!, 'boards', id)
                await deleteDoc(boardRef)
            } else {
                const currentBoards = get().boards
                const updatedBoards = currentBoards.filter((board) => board.id !== id)
                set({ boards: updatedBoards })
                saveBoardsToLocalStorage(updatedBoards)
            }

            // If deleting current board, switch to another or null
            if (get().currentBoardId === id) {
                const remainingBoards = get().boards.filter((b) => b.id !== id)
                get().setCurrentBoardId(remainingBoards.length > 0 ? remainingBoards[0].id : null)
            }

            set({ isLoading: false })
        } catch (error) {
            console.error('Error deleting board:', error)
            set({ error: 'ボードの削除に失敗しました', isLoading: false })
        }
    },

    addLabelToBoard: async (boardId, label) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const newLabel: Label = {
                id: uuidv4(),
                ...label,
            }

            const updatedLabels = [...(board.labels || []), newLabel]
            await get().updateBoard(boardId, { labels: updatedLabels })
        } catch (error) {
            console.error('Error adding label to board:', error)
            set({ error: 'ラベルの追加に失敗しました' })
        }
    },

    removeLabelFromBoard: async (boardId, labelId) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const updatedLabels = (board.labels || []).filter((l) => l.id !== labelId)
            await get().updateBoard(boardId, { labels: updatedLabels })
        } catch (error) {
            console.error('Error removing label from board:', error)
            set({ error: 'ラベルの削除に失敗しました' })
        }
    },

    updateLabel: async (boardId, labelId, updates) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const updatedLabels = (board.labels || []).map((label) =>
                label.id === labelId ? { ...label, ...updates } : label
            )
            await get().updateBoard(boardId, { labels: updatedLabels })
        } catch (error) {
            console.error('Error updating label:', error)
            set({ error: 'ラベルの更新に失敗しました' })
        }
    },

    // カラム管理
    addColumn: async (boardId, title, color) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const columns = board.columns || DEFAULT_COLUMNS
            const newColumn: ColumnDefinition = {
                id: uuidv4(),
                title,
                order: columns.length,
                color,
            }

            const updatedColumns = [...columns, newColumn]
            await get().updateBoard(boardId, { columns: updatedColumns })
        } catch (error) {
            console.error('Error adding column:', error)
            set({ error: 'カラムの追加に失敗しました' })
        }
    },

    removeColumn: async (boardId, columnId) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const columns = board.columns || DEFAULT_COLUMNS
            if (columns.length <= 1) return // 最低1カラムは必要

            const updatedColumns = columns.filter((c) => c.id !== columnId).map((c, index) => ({ ...c, order: index }))
            await get().updateBoard(boardId, { columns: updatedColumns })
        } catch (error) {
            console.error('Error removing column:', error)
            set({ error: 'カラムの削除に失敗しました' })
        }
    },

    updateColumn: async (boardId, columnId, updates) => {
        try {
            const board = get().boards.find((b) => b.id === boardId)
            if (!board) return

            const columns = board.columns || DEFAULT_COLUMNS
            const updatedColumns = columns.map((col) => (col.id === columnId ? { ...col, ...updates } : col))
            await get().updateBoard(boardId, { columns: updatedColumns })
        } catch (error) {
            console.error('Error updating column:', error)
            set({ error: 'カラムの更新に失敗しました' })
        }
    },

    reorderColumns: async (boardId, columns) => {
        try {
            const reorderedColumns = columns.map((col, index) => ({
                ...col,
                order: index,
            }))
            await get().updateBoard(boardId, { columns: reorderedColumns })
        } catch (error) {
            console.error('Error reordering columns:', error)
            set({ error: 'カラムの並べ替えに失敗しました' })
        }
    },

    getColumns: (boardId) => {
        const id = boardId || get().currentBoardId
        const board = get().boards.find((b) => b.id === id)
        const columns = board?.columns
        if (columns && columns.length > 0) {
            return [...columns].sort((a, b) => a.order - b.order)
        }
        return DEFAULT_COLUMNS
    },

    subscribeToBoards: () => {
        set({ isLoading: true, error: null })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            const q = query(collection(db!, 'boards'), orderBy('createdAt'))

            const unsubscribe = onSnapshot(
                q,
                async (snapshot) => {
                    const boards: Board[] = snapshot.docs.map((doc) => {
                        const data = doc.data()
                        return {
                            id: doc.id,
                            name: data.name ?? '',
                            description: data.description || '',
                            color: data.color || '#0079BF',
                            labels: data.labels || [],
                            columns: data.columns || DEFAULT_COLUMNS,
                            createdAt: data.createdAt ?? Date.now(),
                            updatedAt: data.updatedAt ?? Date.now(),
                        } as Board
                    })

                    // Create default board if none exist
                    if (boards.length === 0) {
                        await get().addBoard('マイボード', 'デフォルトのボード', '#0079BF')
                        return // Will be called again with new board
                    }

                    set({ boards, isLoading: false, error: null })

                    // Set first board as current if none selected
                    const currentBoardId = get().currentBoardId
                    if (!currentBoardId && boards.length > 0) {
                        get().setCurrentBoardId(boards[0].id)
                    }
                },
                (error) => {
                    console.error('Error subscribing to boards:', error)
                    // Firebaseエラー時はオフラインモードにフォールバック
                    get().initializeOfflineMode()
                }
            )

            return unsubscribe
        } else {
            // Already in offline mode or Firebase not configured
            get().initializeOfflineMode()
            return () => {}
        }
    },
}))

// Export helper to check storage availability
export { localStorageAvailable }
