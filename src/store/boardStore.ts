import { create } from 'zustand'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db, isFirebaseEnabled } from '../lib/firebase'
import { BOARD_COLORS } from '../constants'
import type { Board, Label } from '../types'

const STORAGE_KEY = 'kanban-boards'
const CURRENT_BOARD_KEY = 'kanban-current-board'

function loadBoardsFromLocalStorage(): Board[] {
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
  } catch (error) {
    console.error('Error saving boards to localStorage:', error)
  }
}

function loadCurrentBoardId(): string | null {
  try {
    return localStorage.getItem(CURRENT_BOARD_KEY)
  } catch (error) {
    console.error('Error loading current board id:', error)
    return null
  }
}

function saveCurrentBoardId(boardId: string | null): void {
  try {
    if (boardId) {
      localStorage.setItem(CURRENT_BOARD_KEY, boardId)
    } else {
      localStorage.removeItem(CURRENT_BOARD_KEY)
    }
  } catch (error) {
    console.error('Error saving current board id:', error)
  }
}

// Firestoreは undefined 値をサポートしていないため、除去する
function removeUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {}
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

  // Actions
  setBoards: (boards: Board[]) => void
  setCurrentBoardId: (boardId: string | null) => void
  addBoard: (name: string, description?: string, color?: string) => Promise<void>
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  addLabelToBoard: (boardId: string, label: Omit<Label, 'id'>) => Promise<void>
  removeLabelFromBoard: (boardId: string, labelId: string) => Promise<void>
  updateLabel: (boardId: string, labelId: string, updates: Partial<Label>) => Promise<void>
  subscribeToBoards: () => () => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoardId: null,
  isLoading: false,
  error: null,

  setBoards: (boards) => {
    set({ boards })
    if (!isFirebaseEnabled) {
      saveBoardsToLocalStorage(boards)
    }
  },

  setCurrentBoardId: (boardId) => {
    set({ currentBoardId: boardId })
    saveCurrentBoardId(boardId)
  },

  addBoard: async (name, description, color) => {
    try {
      set({ isLoading: true, error: null })
      const newBoardData = {
        name,
        description: description || '',
        color: color || '#0079BF',
        labels: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      if (isFirebaseEnabled && db) {
        const docRef = await addDoc(collection(db, 'boards'), newBoardData)
        // Set as current board if it's the first one
        const currentBoards = get().boards
        if (currentBoards.length === 0) {
          get().setCurrentBoardId(docRef.id)
        }
      } else {
        const newBoard: Board = {
          id: uuidv4(),
          ...newBoardData
        }
        const currentBoards = get().boards
        const updatedBoards = [...currentBoards, newBoard]
        set({ boards: updatedBoards })
        saveBoardsToLocalStorage(updatedBoards)
        // Set as current board if it's the first one
        if (currentBoards.length === 0) {
          get().setCurrentBoardId(newBoard.id)
        }
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

      if (isFirebaseEnabled && db) {
        const boardRef = doc(db, 'boards', id)
        const cleanedUpdates = removeUndefinedFields({
          ...updates,
          updatedAt: Date.now()
        })
        await updateDoc(boardRef, cleanedUpdates)
      } else {
        const currentBoards = get().boards
        const updatedBoards = currentBoards.map(board =>
          board.id === id
            ? { ...board, ...updates, updatedAt: Date.now() }
            : board
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

      if (isFirebaseEnabled && db) {
        const boardRef = doc(db, 'boards', id)
        await deleteDoc(boardRef)
      } else {
        const currentBoards = get().boards
        const updatedBoards = currentBoards.filter(board => board.id !== id)
        set({ boards: updatedBoards })
        saveBoardsToLocalStorage(updatedBoards)
      }

      // If deleting current board, switch to another or null
      if (get().currentBoardId === id) {
        const remainingBoards = get().boards.filter(b => b.id !== id)
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
      const board = get().boards.find(b => b.id === boardId)
      if (!board) return

      const newLabel: Label = {
        id: uuidv4(),
        ...label
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
      const board = get().boards.find(b => b.id === boardId)
      if (!board) return

      const updatedLabels = (board.labels || []).filter(l => l.id !== labelId)
      await get().updateBoard(boardId, { labels: updatedLabels })
    } catch (error) {
      console.error('Error removing label from board:', error)
      set({ error: 'ラベルの削除に失敗しました' })
    }
  },

  updateLabel: async (boardId, labelId, updates) => {
    try {
      const board = get().boards.find(b => b.id === boardId)
      if (!board) return

      const updatedLabels = (board.labels || []).map(label =>
        label.id === labelId ? { ...label, ...updates } : label
      )
      await get().updateBoard(boardId, { labels: updatedLabels })
    } catch (error) {
      console.error('Error updating label:', error)
      set({ error: 'ラベルの更新に失敗しました' })
    }
  },

  subscribeToBoards: () => {
    set({ isLoading: true, error: null })

    if (isFirebaseEnabled && db) {
      const q = query(collection(db, 'boards'), orderBy('createdAt'))

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          let boards: Board[] = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              name: data.name ?? '',
              description: data.description || '',
              color: data.color || '#0079BF',
              labels: data.labels || [],
              createdAt: data.createdAt ?? Date.now(),
              updatedAt: data.updatedAt ?? Date.now()
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
          set({ error: 'ボードデータの取得に失敗しました', isLoading: false })
        }
      )

      return unsubscribe
    } else {
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
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        boards = [defaultBoard]
        saveBoardsToLocalStorage(boards)
        currentBoardId = defaultBoard.id
        saveCurrentBoardId(currentBoardId)
      }

      set({ boards, currentBoardId, isLoading: false, error: null })

      // Set first board as current if none selected
      if (!currentBoardId && boards.length > 0) {
        get().setCurrentBoardId(boards[0].id)
      }

      return () => {}
    }
  }
}))
