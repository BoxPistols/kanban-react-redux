import { create } from 'zustand'
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    deleteField,
    doc,
    onSnapshot,
    query,
    where,
    writeBatch,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db, isFirebaseEnabled } from '../lib/firebase'
import { useTrashStore } from './trashStore'
import { useAuthStore } from './authStore'
import { showToast } from './toastStore'
import { pushUndo } from './undoStore'
import { classifyFirestoreError } from '../utils/firestoreError'
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

// 現在購読中のボードID。
// state.cards は subscribeToCards で現在のボードだけに絞り込まれる一方、
// localStorage(kanban-cards)は全ボードのカードを1キーに集約している。
// 保存時にこのIDで「現在ボード分だけ」を差し替えることで、
// 他ボードのカードを巻き込んで消すデータ消失を防ぐ。
let subscribedBoardId: string | undefined = undefined

// localStorage(kanban-cards)から全ボードのカードを読み込む(生データ)
function readAllCardsFromStorage(): Card[] {
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

// localStorage(kanban-cards)へ全ボードのカードを書き込む(生データ)
function writeAllCardsToStorage(cards: Card[]): void {
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

// ローカルストレージからカードを読み込む(全ボード分)
function loadCardsFromLocalStorage(): Card[] {
    return readAllCardsFromStorage()
}

// ローカルストレージにカードを保存する。
// state.cards は現在のボード分のみのため、保存時に他ボードのカードを温存してマージする。
// これをせず素朴に全置換すると、ボードを切り替えて1枚でも編集した瞬間に
// 他ボードのカードが丸ごと消える(データ消失バグ)。
function saveCardsToLocalStorage(cards: Card[]): void {
    // 購読ボードが未指定(=全カードスコープ)ならそのまま全置換
    if (subscribedBoardId === undefined) {
        writeAllCardsToStorage(cards)
        return
    }
    // 現在ボード以外のカードは既存ストレージから温存し、現在ボード分を state で置き換える
    const others = readAllCardsFromStorage().filter((c) => c.boardId !== subscribedBoardId)
    writeAllCardsToStorage([...others, ...cards])
}

// Firestoreは undefined 値をサポートしていないため、除去する
// nullの場合はdeleteField()を使用してフィールドを削除する
function removeUndefinedFields<T extends Record<string, unknown>>(obj: T, forFirestore = false): Partial<T> {
    const result: Partial<T> = {}
    for (const key in obj) {
        if (obj[key] === undefined) {
            // undefinedは除去
            continue
        } else if (obj[key] === null && forFirestore) {
            // Firestoreの場合、nullはdeleteField()に変換してフィールドを削除
            ;(result as Record<string, unknown>)[key] = deleteField()
        } else {
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
    // ドラッグ開始時のスナップショット。キャンセル時の復元と、確定時の差分検出に使う
    dragBackup: Card[] | null

    // Actions
    setCards: (cards: Card[]) => void
    setForceOfflineMode: (offline: boolean) => void
    addCard: (text: string, columnId: ColumnType, boardId: string) => Promise<void>
    updateCard: (id: string, updates: Partial<Card>) => Promise<void>
    deleteCard: (id: string) => Promise<void>
    // 削除+Undoトースト+Undoスタック積みまでを一括で行う(UIから使う削除の標準経路)
    trashCard: (id: string) => Promise<void>
    restoreCard: (card: Card, boardId: string, columnId: ColumnType) => Promise<void>
    moveCard: (cardId: string, newColumnId: ColumnType, newOrder: number) => Promise<void>
    reorderCards: (updates: { id: string; order: number; columnId?: ColumnType }[]) => Promise<void>
    // ドラッグ&ドロップ用: ライブプレビュー(ローカルのみ) → 確定時に一括永続化
    beginDrag: () => void
    moveCardLocal: (activeId: string, overColumnId: ColumnType, overIndex: number) => void
    cancelDrag: () => void
    commitDrag: () => Promise<void>
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
    dragBackup: null,

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
        const cardsInColumn = get().cards.filter((c) => c.columnId === columnId && c.boardId === boardId)
        const maxOrder = cardsInColumn.length > 0 ? Math.max(...cardsInColumn.map((c) => c.order)) : -1

        // Get current user ID for Firestore security
        const userId = useAuthStore.getState().user?.uid

        const newCardData = {
            text,
            columnId,
            boardId,
            order: maxOrder + 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...(userId && { userId }), // Add userId only if user is authenticated
        }

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            // 楽観的更新: 先に仮カードを表示し、サーバー反映(onSnapshot)で置き換える。
            // 失敗時は仮カードを取り除いてトーストで通知する。
            const tempId = `temp-${uuidv4()}`
            set({ cards: [...get().cards, { id: tempId, ...newCardData }], error: null })
            try {
                await addDoc(collection(db!, 'cards'), newCardData)
            } catch (error: unknown) {
                set({ cards: get().cards.filter((c) => c.id !== tempId) })

                let errorMessage = 'カードの追加に失敗しました'
                if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
                    errorMessage = '権限がありません。ログインしているか確認してください。'
                } else if (
                    error &&
                    typeof error === 'object' &&
                    'message' in error &&
                    typeof error.message === 'string'
                ) {
                    errorMessage = `エラー: ${error.message}`
                }
                set({ error: errorMessage })
                showToast(errorMessage, 'error')
                throw error
            }
        } else {
            // LocalStorage mode
            const newCard: Card = {
                id: uuidv4(),
                ...newCardData,
            }
            const updatedCards = [...get().cards, newCard]
            set({ cards: updatedCards, error: null })
            saveCardsToLocalStorage(updatedCards)
        }
    },

    updateCard: async (id, updates) => {
        // 楽観的更新: 先にローカルへ反映し、Firestore失敗時のみ巻き戻す
        const previousCards = get().cards
        const updatedCards = previousCards.map((card) => {
            if (card.id !== id) {
                return card
            }

            const newCard = { ...card, ...updates, updatedAt: Date.now() }

            // nullは「フィールド削除」の意味なのでローカルでは取り除く
            for (const key in updates) {
                if ((updates as Record<string, unknown>)[key] === null) {
                    delete (newCard as Record<string, unknown>)[key]
                }
            }
            return newCard as Card
        })
        set({ cards: updatedCards, error: null })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            try {
                // Firestoreではundefinedをサポートしていないため除去、nullはdeleteField()で削除
                const cardRef = doc(db!, 'cards', id)
                const cleanedUpdates = removeUndefinedFields(
                    {
                        ...updates,
                        updatedAt: Date.now(),
                    },
                    true
                ) // forFirestore = true
                await updateDoc(cardRef, cleanedUpdates as Record<string, unknown>)
            } catch (error) {
                set({ cards: previousCards, error: 'カードの更新に失敗しました' })
                showToast('カードの更新に失敗しました', 'error')
            }
        } else {
            saveCardsToLocalStorage(updatedCards)
        }
    },

    deleteCard: async (id) => {
        const previousCards = get().cards
        const cardToDelete = previousCards.find((card) => card.id === id)
        if (!cardToDelete) return

        // 楽観的更新: ゴミ箱へ移動しつつ即座に一覧から消す
        useTrashStore.getState().addToTrash(cardToDelete)
        set({ cards: previousCards.filter((card) => card.id !== id), error: null })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            try {
                const cardRef = doc(db!, 'cards', id)
                await deleteDoc(cardRef)
            } catch (error) {
                // 失敗時は巻き戻し(ゴミ箱からも取り除く)
                useTrashStore.getState().permanentlyDelete(id)
                set({ cards: previousCards, error: 'カードの削除に失敗しました' })
                showToast('カードの削除に失敗しました', 'error')
            }
        } else {
            saveCardsToLocalStorage(get().cards)
        }
    },

    trashCard: async (id) => {
        const card = get().cards.find((c) => c.id === id)
        if (!card) return
        await get().deleteCard(id)

        // トーストの「元に戻す」と Cmd/Ctrl+Z のどちらからでも復元できるようにする。
        // 片方で復元済みなら restoreFromTrash が null を返すので二重復元にはならない。
        const restore = () => {
            const restored = useTrashStore.getState().restoreFromTrash(id)
            if (restored) {
                get().restoreCard(restored, restored.originalBoardId, restored.originalColumnId)
            }
        }
        pushUndo({ label: 'カードの削除', undo: restore })
        showToast('カードをゴミ箱に移動しました', 'info', { label: '元に戻す', onAction: restore })
    },

    restoreCard: async (card, boardId, columnId) => {
        try {
            // 復元先カラムのカード数を取得してorderを設定
            const cardsInColumn = get().cards.filter((c) => c.columnId === columnId && c.boardId === boardId)
            const maxOrder = cardsInColumn.length > 0 ? Math.max(...cardsInColumn.map((c) => c.order)) : -1

            // TrashedCard特有のフィールド（deletedAt, originalBoardId, originalColumnId）を除外
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { deletedAt, originalBoardId, originalColumnId, ...cardWithoutTrashFields } = card as Card & {
                deletedAt?: number
                originalBoardId?: string
                originalColumnId?: string
            }

            const restoredCard: Card = {
                ...cardWithoutTrashFields,
                boardId,
                columnId,
                order: maxOrder + 1,
                updatedAt: Date.now(),
            }

            const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
            if (useFirebase) {
                // Firebase mode - 新しいドキュメントとして追加（idを除外して保存）
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _id, ...cardData } = restoredCard
                await addDoc(collection(db!, 'cards'), cardData)
            } else {
                // LocalStorage mode - preserve original ID
                const updatedCards = [...get().cards, restoredCard]
                set({ cards: updatedCards })
                saveCardsToLocalStorage(updatedCards)
            }
            set({ error: null })
        } catch (error) {
            set({ error: 'カードの復元に失敗しました' })
            showToast('カードの復元に失敗しました', 'error')
        }
    },

    moveCard: async (cardId, newColumnId, newOrder) => {
        // 楽観的更新
        const previousCards = get().cards
        const updatedCards = previousCards.map((card) =>
            card.id === cardId ? { ...card, columnId: newColumnId, order: newOrder, updatedAt: Date.now() } : card
        )
        set({ cards: updatedCards, error: null })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            try {
                const cardRef = doc(db!, 'cards', cardId)
                await updateDoc(cardRef, {
                    columnId: newColumnId,
                    order: newOrder,
                    updatedAt: Date.now(),
                })
            } catch (error) {
                set({ cards: previousCards, error: 'カードの移動に失敗しました' })
                showToast('カードの移動に失敗しました', 'error')
            }
        } else {
            saveCardsToLocalStorage(updatedCards)
        }
    },

    reorderCards: async (updates) => {
        // 楽観的更新
        const previousCards = get().cards
        const updatedCards = previousCards.map((card) => {
            const update = updates.find((u) => u.id === card.id)
            if (update) {
                return {
                    ...card,
                    order: update.order,
                    ...(update.columnId !== undefined ? { columnId: update.columnId } : {}),
                    updatedAt: Date.now(),
                }
            }
            return card
        })
        set({ cards: updatedCards, error: null })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            try {
                const firestore = db!
                const batch = writeBatch(firestore)

                updates.forEach(({ id, order, columnId }) => {
                    const cardRef = doc(firestore, 'cards', id)
                    const updateData: Record<string, unknown> = {
                        order,
                        updatedAt: Date.now(),
                    }
                    if (columnId !== undefined) {
                        updateData.columnId = columnId
                    }
                    batch.update(cardRef, updateData)
                })

                await batch.commit()
            } catch (error) {
                set({ cards: previousCards, error: 'カードの並べ替えに失敗しました' })
                showToast('カードの並べ替えに失敗しました', 'error')
            }
        } else {
            saveCardsToLocalStorage(updatedCards)
        }
    },

    // --- ドラッグ&ドロップ(ライブプレビュー付き) ---

    beginDrag: () => {
        set({ dragBackup: get().cards })
    },

    // ドラッグ中の仮移動。永続化せずローカル state のみ更新し、
    // 挿入位置をリアルタイムに見せる(Trello 同等のプレースホルダー挙動)。
    moveCardLocal: (activeId, overColumnId, overIndex) => {
        const cards = get().cards
        const active = cards.find((c) => c.id === activeId)
        if (!active) return

        const fromColumnId = active.columnId

        const columnCards = (columnId: ColumnType) =>
            cards
                .filter((c) => c.columnId === columnId && c.boardId === active.boardId && c.id !== activeId)
                .sort((a, b) => a.order - b.order)

        const targetCards = columnCards(overColumnId)
        const insertIndex = Math.max(0, Math.min(overIndex, targetCards.length))

        // 同一カラム内で位置も変わらないなら何もしない(無駄な再レンダリング防止)
        if (fromColumnId === overColumnId) {
            const currentIndex = columnCards(fromColumnId).findIndex((c) => c.order > active.order)
            const activeIndex = currentIndex === -1 ? targetCards.length : currentIndex
            if (activeIndex === insertIndex) return
        }

        const updatedById = new Map<string, Card>()

        // 挿入先カラムを再採番(activeを挿入位置に差し込む)。
        // order が変わらないカードは参照を維持する(memo 済み Card の無駄な再描画と
        // dnd-kit の再計測をドラッグ中に増やさないため)。
        const nextTarget = [...targetCards]
        nextTarget.splice(insertIndex, 0, { ...active, columnId: overColumnId })
        nextTarget.forEach((c, index) => {
            if (c.id === activeId || c.order !== index) {
                updatedById.set(c.id, { ...c, order: index })
            }
        })

        // カラム移動の場合は移動元も再採番して order の穴をなくす
        if (fromColumnId !== overColumnId) {
            columnCards(fromColumnId).forEach((c, index) => {
                if (c.order !== index) {
                    updatedById.set(c.id, { ...c, order: index })
                }
            })
        }

        set({ cards: cards.map((c) => updatedById.get(c.id) ?? c) })
    },

    cancelDrag: () => {
        const backup = get().dragBackup
        if (backup) {
            set({ cards: backup, dragBackup: null })
        }
    },

    // ドロップ確定: ドラッグ開始時とのスナップショット差分だけを一括永続化する
    commitDrag: async () => {
        const backup = get().dragBackup
        set({ dragBackup: null })
        if (!backup) return

        const current = get().cards
        const changed = current.filter((card) => {
            const before = backup.find((c) => c.id === card.id)
            return before && (before.order !== card.order || before.columnId !== card.columnId)
        })

        if (changed.length === 0) return

        // Cmd/Ctrl+Z で移動前の並びに戻せるよう、逆操作をUndoスタックへ積む
        const inverse = changed
            .map((card) => {
                const before = backup.find((c) => c.id === card.id)
                return before ? { id: before.id, order: before.order, columnId: before.columnId } : null
            })
            .filter((u): u is { id: string; order: number; columnId: ColumnType } => u !== null)
        pushUndo({
            label: 'カードの移動',
            undo: () => get().reorderCards(inverse),
        })

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            try {
                const firestore = db!
                const batch = writeBatch(firestore)
                changed.forEach((card) => {
                    batch.update(doc(firestore, 'cards', card.id), {
                        order: card.order,
                        columnId: card.columnId,
                        updatedAt: Date.now(),
                    })
                })
                await batch.commit()
            } catch (error) {
                // 失敗時はドラッグ前の状態に巻き戻す
                set({ cards: backup, error: 'カードの並べ替えに失敗しました' })
                showToast('カードの並べ替えに失敗しました', 'error')
            }
        } else {
            saveCardsToLocalStorage(current)
        }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    setSelectedLabelIds: (labelIds) => set({ selectedLabelIds: labelIds }),

    toggleLabelFilter: (labelId) => {
        const { selectedLabelIds } = get()
        const newSelectedLabelIds = selectedLabelIds.includes(labelId)
            ? selectedLabelIds.filter((id) => id !== labelId)
            : [...selectedLabelIds, labelId]
        set({ selectedLabelIds: newSelectedLabelIds })
    },

    subscribeToCards: (boardId) => {
        set({ isLoading: true, error: null })
        // 保存時に現在ボード分だけを差し替えられるよう、購読対象のボードIDを記録する
        subscribedBoardId = boardId

        const loadLocal = () => {
            const allCards = loadCardsFromLocalStorage()
            const cards = boardId ? allCards.filter((c) => c.boardId === boardId) : allCards
            set({ cards, isLoading: false, error: null })
        }

        const useFirebase = isFirebaseEnabled && db && !get().forceOfflineMode
        if (useFirebase) {
            // Firebase mode
            const userId = useAuthStore.getState().user?.uid

            // ボード切替のたびに全カードを転送しないよう boardId でサーバー側フィルタする。
            // 等価フィルタのみなら複合インデックス不要のため orderBy は付けず、並びはクライアントで揃える。
            const constraints = [
                ...(userId ? [where('userId', '==', userId)] : []),
                ...(boardId ? [where('boardId', '==', boardId)] : []),
            ]
            const q = query(collection(db!, 'cards'), ...constraints)

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const allCards: Card[] = snapshot.docs.map((doc) => {
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
                            progress: data.progress,
                            urlMetadata: data.urlMetadata,
                            images: data.images,
                        } as Card
                    })
                    // クエリ済みだが後方互換のためクライアント側でも boardId で絞る
                    const cards = (boardId ? allCards.filter((c) => c.boardId === boardId) : allCards).sort(
                        (a, b) => a.order - b.order
                    )
                    // ドラッグ中のライブプレビューを snapshot が上書きしないようにする
                    if (get().dragBackup) {
                        set({ dragBackup: cards, isLoading: false, error: null })
                    } else {
                        set({ cards, isLoading: false, error: null })
                    }
                },
                (error) => {
                    // Firebase permission error - fall back to offline mode
                    // Firebaseエラー時はオフラインモードにフォールバック
                    console.error('Firestore subscription error:', error)

                    // エラーメッセージを設定（BlockerWarning用）。
                    // 一時的な通信断を一律「広告ブロッカー」と誤表示しないよう、
                    // オフライン(ERR_OFFLINE)と遮断(ERR_BLOCKED)を区別する。
                    const online = typeof navigator === 'undefined' ? true : navigator.onLine
                    set({ error: classifyFirestoreError(error, online) })
                    loadLocal()
                }
            )

            return unsubscribe
        } else {
            // LocalStorage mode
            loadLocal()
            return () => {}
        }
    },
}))
