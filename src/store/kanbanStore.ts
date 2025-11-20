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
import { db } from '../lib/firebase'
import type { Card, ColumnType } from '../types'

interface KanbanState {
  cards: Card[]
  searchQuery: string
  isLoading: boolean
  error: string | null

  // Actions
  setCards: (cards: Card[]) => void
  addCard: (text: string, columnId: ColumnType) => Promise<void>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  moveCard: (cardId: string, newColumnId: ColumnType, newOrder: number) => Promise<void>
  setSearchQuery: (query: string) => void
  subscribeToCards: () => () => void
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  cards: [],
  searchQuery: '',
  isLoading: false,
  error: null,

  setCards: (cards) => set({ cards }),

  addCard: async (text, columnId) => {
    try {
      set({ isLoading: true, error: null })
      const cardsInColumn = get().cards.filter(c => c.columnId === columnId)
      const maxOrder = cardsInColumn.length > 0
        ? Math.max(...cardsInColumn.map(c => c.order))
        : -1

      const newCard = {
        text,
        columnId,
        order: maxOrder + 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await addDoc(collection(db, 'cards'), newCard)
      set({ isLoading: false })
    } catch (error) {
      console.error('Error adding card:', error)
      set({ error: 'カードの追加に失敗しました', isLoading: false })
    }
  },

  updateCard: async (id, updates) => {
    try {
      set({ isLoading: true, error: null })
      const cardRef = doc(db, 'cards', id)
      await updateDoc(cardRef, {
        ...updates,
        updatedAt: Date.now()
      })
      set({ isLoading: false })
    } catch (error) {
      console.error('Error updating card:', error)
      set({ error: 'カードの更新に失敗しました', isLoading: false })
    }
  },

  deleteCard: async (id) => {
    try {
      set({ isLoading: true, error: null })
      const cardRef = doc(db, 'cards', id)
      await deleteDoc(cardRef)
      set({ isLoading: false })
    } catch (error) {
      console.error('Error deleting card:', error)
      set({ error: 'カードの削除に失敗しました', isLoading: false })
    }
  },

  moveCard: async (cardId, newColumnId, newOrder) => {
    try {
      set({ isLoading: true, error: null })
      const cardRef = doc(db, 'cards', cardId)
      await updateDoc(cardRef, {
        columnId: newColumnId,
        order: newOrder,
        updatedAt: Date.now()
      })
      set({ isLoading: false })
    } catch (error) {
      console.error('Error moving card:', error)
      set({ error: 'カードの移動に失敗しました', isLoading: false })
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  subscribeToCards: () => {
    const q = query(collection(db, 'cards'), orderBy('order'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cards: Card[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Card))
        set({ cards, isLoading: false, error: null })
      },
      (error) => {
        console.error('Error subscribing to cards:', error)
        set({ error: 'データの取得に失敗しました', isLoading: false })
      }
    )

    return unsubscribe
  }
}))
