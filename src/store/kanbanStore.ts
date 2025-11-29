import { create } from 'zustand'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db, isFirebaseEnabled } from '../lib/firebase'
import { useBoardStore } from './boardStore'
import type { Card, ColumnType } from '../types'

// ローカルストレージのキー
const STORAGE_KEY = 'kanban-cards'

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
let inMemoryCards: Card[] = []

// ローカルストレージからカードを読み込む
function loadCardsFromLocalStorage(): Card[] {
  if (!localStorageAvailable) {
    return inMemoryCards
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error loading from localStorage:', error)
  }
  return []
}

// ローカルストレージにカードを保存する
function saveCardsToLocalStorage(cards: Card[]): void {
  if (!localStorageAvailable) {
    inMemoryCards = cards
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    inMemoryCards = cards
  }
}

// Helper to check if we should use offline mode
function shouldUseOfflineMode(): boolean {
  return useBoardStore.getState().forceOfflineMode
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

interface KanbanState {
  cards: Card[]
  searchQuery: string
  selectedLabelIds: string[]
  isLoading: boolean
  error: string | null
  forceOfflineMode: boolean

  // Actions
  setCards: (cards: Card[]) => void
  setForceOfflineMode: (offline: boolean) => void
  addCard: (text: string, columnId: ColumnType, boardId: string) => Promise<void>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  moveCard: (cardId: string, newColumnId: ColumnType, newOrder: number) => Promise<void>
  reorderCards: (updates: { id: string; order: number; columnId?: ColumnType }[]) => Promise<void>
  setSearchQuery: (query: string) => void
  setSelectedLabelIds: (labelIds: string[]) => void
  toggleLabelFilter: (labelId: string) => void
  subscribeToCards: (boardId?: string) => () => void
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  cards: [],
  searchQuery: '',
  selectedLabelIds: [],
  isLoading: false,
  error: null,
  forceOfflineMode: false,

  setCards: (cards) => {
    set({ cards })
    const useFirebase = isFirebaseEnabled && !get().forceOfflineMode
    if (!useFirebase) {
      saveCardsToLocalStorage(cards)
    }
  },

  setForceOfflineMode: (offline) => {
    set({ forceOfflineMode: offline })
  },

  addCard: async (text, columnId, boardId) => {
    try {
      set({ isLoading: true, error: null })
      const cardsInColumn = get().cards.filter(c => c.columnId === columnId && c.boardId === boardId)
      const maxOrder = cardsInColumn.length > 0
        ? Math.max(...cardsInColumn.map(c => c.order))
        : -1

      const newCardData = {
        text,
        columnId,
        boardId,
        order: maxOrder + 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
      if (useFirebase) {
        // Firebase mode
        await addDoc(collection(db!, 'cards'), newCardData)
      } else {
        // LocalStorage mode
        const newCard: Card = {
          id: uuidv4(),
          ...newCardData
        }
        const currentCards = get().cards
        const updatedCards = [...currentCards, newCard]
        set({ cards: updatedCards })
        saveCardsToLocalStorage(updatedCards)
      }
      set({ isLoading: false })
    } catch (error) {
      console.error('Error adding card:', error)
      set({ error: 'カードの追加に失敗しました', isLoading: false })
    }
  },

  updateCard: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })

      const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
      if (useFirebase) {
        // Firebase mode - Firestoreではundefinedをサポートしていないため除去
        const cardRef = doc(db!, 'cards', id)
        const cleanedUpdates = removeUndefinedFields({
          ...updates,
          updatedAt: Date.now()
        })
        await updateDoc(cardRef, cleanedUpdates)
      } else {
        // LocalStorage mode
        const currentCards = get().cards
        const updatedCards = currentCards.map(card =>
          card.id === id
            ? { ...card, ...updates, updatedAt: Date.now() }
            : card
        )
        set({ cards: updatedCards })
        saveCardsToLocalStorage(updatedCards)
      }
      set({ isLoading: false })
    } catch (error) {
      console.error('Error updating card:', error)
      set({ error: 'カードの更新に失敗しました', isLoading: false })
    }
  },

  deleteCard: async (id) => {
    try {
      set({ isLoading: true, error: null })

      const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
      if (useFirebase) {
        // Firebase mode
        const cardRef = doc(db!, 'cards', id)
        await deleteDoc(cardRef)
      } else {
        // LocalStorage mode
        const currentCards = get().cards
        const updatedCards = currentCards.filter(card => card.id !== id)
        set({ cards: updatedCards })
        saveCardsToLocalStorage(updatedCards)
      }
      set({ isLoading: false })
    } catch (error) {
      console.error('Error deleting card:', error)
      set({ error: 'カードの削除に失敗しました', isLoading: false })
    }
  },

  moveCard: async (cardId, newColumnId, newOrder) => {
    try {
      set({ isLoading: true, error: null })

      const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
      if (useFirebase) {
        // Firebase mode
        const cardRef = doc(db!, 'cards', cardId)
        await updateDoc(cardRef, {
          columnId: newColumnId,
          order: newOrder,
          updatedAt: Date.now()
        })
      } else {
        // LocalStorage mode
        const currentCards = get().cards
        const updatedCards = currentCards.map(card =>
          card.id === cardId
            ? { ...card, columnId: newColumnId, order: newOrder, updatedAt: Date.now() }
            : card
        )
        set({ cards: updatedCards })
        saveCardsToLocalStorage(updatedCards)
      }
      set({ isLoading: false })
    } catch (error) {
      console.error('Error moving card:', error)
      set({ error: 'カードの移動に失敗しました', isLoading: false })
    }
  },

  reorderCards: async (updates) => {
    try {
      set({ isLoading: true, error: null })

      const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
      if (useFirebase) {
        // Firebase mode
        const firestore = db!
        const batch = writeBatch(firestore)

        updates.forEach(({ id, order, columnId }) => {
          const cardRef = doc(firestore, 'cards', id)
          const updateData: Record<string, unknown> = {
            order,
            updatedAt: Date.now()
          }
          if (columnId !== undefined) {
            updateData.columnId = columnId
          }
          batch.update(cardRef, updateData)
        })

        await batch.commit()
      } else {
        // LocalStorage mode
        const currentCards = get().cards
        const updatedCards = currentCards.map(card => {
          const update = updates.find(u => u.id === card.id)
          if (update) {
            return {
              ...card,
              order: update.order,
              ...(update.columnId !== undefined ? { columnId: update.columnId } : {}),
              updatedAt: Date.now()
            }
          }
          return card
        })
        set({ cards: updatedCards })
        saveCardsToLocalStorage(updatedCards)
      }
      set({ isLoading: false })
    } catch (error) {
      console.error('Error reordering cards:', error)
      set({ error: 'カードの並べ替えに失敗しました', isLoading: false })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedLabelIds: (labelIds) => set({ selectedLabelIds: labelIds }),

  toggleLabelFilter: (labelId) => {
    const { selectedLabelIds } = get()
    const newSelectedLabelIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter(id => id !== labelId)
      : [...selectedLabelIds, labelId]
    set({ selectedLabelIds: newSelectedLabelIds })
  },

  subscribeToCards: (boardId) => {
    set({ isLoading: true, error: null })

    const loadLocal = () => {
      const allCards = loadCardsFromLocalStorage()
      const cards = boardId ? allCards.filter(c => c.boardId === boardId) : allCards
      set({ cards, isLoading: false, error: null })
    }

    const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
    if (useFirebase) {
      // Firebase mode
      const q = query(collection(db!, 'cards'), orderBy('order'))

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const allCards: Card[] = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              text: data.text ?? '',
              columnId: data.columnId ?? 'TODO',
              boardId: data.boardId ?? '',
              order: data.order ?? 0,
              createdAt: data.createdAt ?? Date.now(),
              updatedAt: data.updatedAt ?? Date.now(),
              title: data.title,
              description: data.description,
              labels: data.labels,
              color: data.color,
              checklist: data.checklist,
              dueDate: data.dueDate,
              progress: data.progress
            } as Card
          })
          // Filter by boardId if provided
          const cards = boardId ? allCards.filter(c => c.boardId === boardId) : allCards
          set({ cards, isLoading: false, error: null })
        },
        (error) => {
          console.error('Error subscribing to cards:', error)
          // Firebase permission error - fall back to offline mode
          console.log('🔄 Falling back to offline mode for cards')
          loadLocal()
        }
      )

      return unsubscribe
    } else {
      // LocalStorage mode
      loadLocal()
      return () => {}
    }
  }
}))
