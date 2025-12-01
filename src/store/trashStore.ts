import { create } from 'zustand'
import type { Card } from '../types'

// 30日間のミリ秒
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// ローカルストレージのキー
const TRASH_STORAGE_KEY = 'kanban-trash'

// ゴミ箱内のカード型
export interface TrashedCard extends Card {
  deletedAt: number
  originalBoardId: string
  originalColumnId: string
}

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
let inMemoryTrashedCards: TrashedCard[] = []

// ローカルストレージからゴミ箱を読み込む
function loadTrashFromLocalStorage(): TrashedCard[] {
  if (!localStorageAvailable) {
    return inMemoryTrashedCards
  }
  try {
    const stored = localStorage.getItem(TRASH_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading trash from localStorage:', error)
  }
  return []
}

// ローカルストレージにゴミ箱を保存する
function saveTrashToLocalStorage(cards: TrashedCard[]): void {
  if (!localStorageAvailable) {
    inMemoryTrashedCards = cards
    return
  }
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(cards))
  } catch (error) {
    console.error('Error saving trash to localStorage:', error)
    inMemoryTrashedCards = cards
  }
}

interface TrashState {
  trashedCards: TrashedCard[]
  isLoading: boolean

  // Actions
  addToTrash: (card: Card) => void
  restoreFromTrash: (cardId: string) => TrashedCard | null
  permanentlyDelete: (cardId: string) => void
  emptyTrash: () => void
  cleanupExpiredCards: () => void
  loadTrash: () => void
  getTrashCount: () => number
  getDaysUntilPermanentDeletion: (deletedAt: number) => number
}

export const useTrashStore = create<TrashState>((set, get) => ({
  trashedCards: [],
  isLoading: false,

  addToTrash: (card) => {
    const trashedCard: TrashedCard = {
      ...card,
      deletedAt: Date.now(),
      originalBoardId: card.boardId,
      originalColumnId: card.columnId
    }
    const currentTrashed = get().trashedCards
    const updatedTrashed = [...currentTrashed, trashedCard]
    set({ trashedCards: updatedTrashed })
    saveTrashToLocalStorage(updatedTrashed)
  },

  restoreFromTrash: (cardId) => {
    const currentTrashed = get().trashedCards
    const cardToRestore = currentTrashed.find(c => c.id === cardId)
    if (!cardToRestore) return null

    const updatedTrashed = currentTrashed.filter(c => c.id !== cardId)
    set({ trashedCards: updatedTrashed })
    saveTrashToLocalStorage(updatedTrashed)
    return cardToRestore
  },

  permanentlyDelete: (cardId) => {
    const currentTrashed = get().trashedCards
    const updatedTrashed = currentTrashed.filter(c => c.id !== cardId)
    set({ trashedCards: updatedTrashed })
    saveTrashToLocalStorage(updatedTrashed)
  },

  emptyTrash: () => {
    set({ trashedCards: [] })
    saveTrashToLocalStorage([])
  },

  cleanupExpiredCards: () => {
    const now = Date.now()
    const currentTrashed = get().trashedCards
    const validCards = currentTrashed.filter(
      card => now - card.deletedAt < THIRTY_DAYS_MS
    )
    if (validCards.length !== currentTrashed.length) {
      set({ trashedCards: validCards })
      saveTrashToLocalStorage(validCards)
    }
  },

  loadTrash: () => {
    const trashedCards = loadTrashFromLocalStorage()
    set({ trashedCards })
    // Clean up expired cards on load
    get().cleanupExpiredCards()
  },

  getTrashCount: () => {
    return get().trashedCards.length
  },

  getDaysUntilPermanentDeletion: (deletedAt) => {
    const now = Date.now()
    const elapsed = now - deletedAt
    const remaining = THIRTY_DAYS_MS - elapsed
    return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)))
  }
}))
