import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react'
import styled from 'styled-components'
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    CollisionDetection,
    closestCenter,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    horizontalListSortingStrategy,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { GlobalStyle } from './GlobalStyle'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { Card as CardComponent } from './Card'
import { Auth } from './Auth'
import { ReloadPrompt } from './ReloadPrompt'
import { ErrorBoundary } from './ErrorBoundary'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { BlockerWarning } from './components/BlockerWarning'
import { ToastContainer } from './components/Toast'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { showToast } from './store/toastStore'
import { BoardIcon } from './icon'
import { getTheme, Theme } from './theme'
import { isFirebaseEnabled } from './lib/firebase'
import { isShortcutKey } from './utils/keyboard'
import type { Card as CardType, ColumnType } from './types'

// Firestore デバッグユーティリティ(window.debugFirestore)は開発時のみロードする。
// 本番に同梱すると全ユーザーのカードをコンソールにダンプし得るため(監査C8)。
// import.meta.env.DEV は本番ビルドで false に畳まれ、この動的importごと除去される。
if (import.meta.env.DEV) {
    void import('./utils/debugFirestore')
}

// 遅延ロード: モーダル系コンポーネント
const ColumnManager = lazy(() => import('./ColumnManager').then((m) => ({ default: m.ColumnManager })))

export function App() {
    const {
        cards,
        searchQuery,
        selectedLabelIds,
        subscribeToCards,
        setSearchQuery,
        setSelectedLabelIds,
        beginDrag,
        moveCardLocal,
        cancelDrag,
        commitDrag,
        setForceOfflineMode: setKanbanOfflineMode,
    } = useKanbanStore()
    const {
        subscribeToBoards,
        currentBoardId,
        setForceOfflineMode: setBoardOfflineMode,
        getColumns,
        reorderColumns,
    } = useBoardStore()
    const { isDarkMode, initializeTheme } = useThemeStore()
    const { user, isInitialized, initAuth } = useAuthStore()
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeType, setActiveType] = useState<'card' | 'column' | null>(null)
    const [offlineMode, setOfflineMode] = useState(false)
    const [showColumnManager, setShowColumnManager] = useState(false)
    const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set())
    const [showReloadPrompt, setShowReloadPrompt] = useState(false)

    // オフラインモードをストアに同期
    useEffect(() => {
        setBoardOfflineMode(offlineMode)
        setKanbanOfflineMode(offlineMode)
    }, [offlineMode, setBoardOfflineMode, setKanbanOfflineMode])

    const theme = getTheme(isDarkMode)

    // ボードのカラム定義を取得
    const boards = useBoardStore((state) => state.boards)
    const columns = useMemo(() => {
        return getColumns(currentBoardId || undefined)
        // getColumns は安定参照なので boards を含めないと、同一 currentBoardId のまま
        // レーンを追加/改名/並べ替え/削除しても再計算されず画面に反映されない(監査)。
    }, [getColumns, currentBoardId, boards])

    const currentBoard = useMemo(() => boards.find((b) => b.id === currentBoardId), [boards, currentBoardId])

    // マウスは短距離移動で即ドラッグ開始(delay なし)、タッチは長押しでスクロールと区別、
    // キーボード操作(Space+矢印)にも対応する。
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 220, tolerance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // All hooks must be called before any conditional returns
    const filteredCards = useMemo(() => {
        let filtered = cards

        // Filter by search query
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (card) =>
                    // 表示名(title があれば title)と説明だけを対象にする。
                    // 非表示の text も対象にすると「見えない文字列でヒットする」混乱が起きる。
                    (card.title || card.text).toLowerCase().includes(q) || card.description?.toLowerCase().includes(q)
            )
        }

        // Filter by selected labels
        if (selectedLabelIds.length > 0) {
            filtered = filtered.filter((card) => {
                if (!card.labels || card.labels.length === 0) return false
                return card.labels.some((label) => selectedLabelIds.includes(label.id))
            })
        }

        return filtered
    }, [cards, searchQuery, selectedLabelIds])

    // 検索/ラベルでフィルタ中か。フィルタ中はドラッグ並べ替えを抑止する(C7)。
    const isFiltered = searchQuery.trim() !== '' || selectedLabelIds.length > 0

    const cardsByColumn = useMemo(() => {
        const grouped = filteredCards.reduce<Record<ColumnType, CardType[]>>(
            (acc, card) => {
                ;(acc[card.columnId] = acc[card.columnId] || []).push(card)
                return acc
            },
            {} as Record<ColumnType, CardType[]>
        )

        Object.values(grouped).forEach((columnCards) => columnCards.sort((a, b) => a.order - b.order))

        return grouped
    }, [filteredCards])

    useEffect(() => {
        initializeTheme()
    }, [initializeTheme])

    useEffect(() => {
        initAuth()
    }, [initAuth])

    // Firebase有効時は認証が解決(isInitialized && user)するまで購読を待つ。
    // 解決前に購読すると userId 未確定のクエリがセキュリティルールで拒否され、
    // 以降 deps が変化せず再購読されないためクラウドデータが永久に空になる(監査C3)。
    // userId を deps に含め、サインイン/ユーザー切替時に正しく再購読させる。
    const userId = user?.uid
    const firebaseAuthPending = isFirebaseEnabled && !offlineMode && (!isInitialized || !userId)

    useEffect(() => {
        if (firebaseAuthPending) return
        const unsubscribeBoards = subscribeToBoards()
        return () => unsubscribeBoards()
    }, [subscribeToBoards, firebaseAuthPending, userId])

    useEffect(() => {
        if (!currentBoardId) return
        if (firebaseAuthPending) return
        const unsubscribeCards = subscribeToCards(currentBoardId)
        return () => unsubscribeCards()
    }, [subscribeToCards, currentBoardId, firebaseAuthPending, userId])

    // 折りたたみ状態の復元
    // localStorageとの同期は外部システムとの連携なので、useEffect内のsetStateは適切
    useEffect(() => {
        if (!currentBoardId) {
            setCollapsedColumns(new Set())
            return
        }
        try {
            const stored = localStorage.getItem('kanban-collapsed-columns')
            if (stored) {
                const data = JSON.parse(stored)
                setCollapsedColumns(new Set(data[currentBoardId] || []))
            } else {
                setCollapsedColumns(new Set())
            }
        } catch {
            setCollapsedColumns(new Set())
        }
    }, [currentBoardId])

    // データ取得の問題を検出してリロードを促す
    useEffect(() => {
        if (!isFirebaseEnabled || offlineMode || !isInitialized || !user) {
            return
        }

        // 認証完了後10秒経過してもボードが空の場合、リロードプロンプトを表示
        const timer = setTimeout(() => {
            if (boards.length === 0) {
                setShowReloadPrompt(true)
            }
        }, 10000)

        return () => clearTimeout(timer)
    }, [isInitialized, user, boards.length, offlineMode])

    // グローバルショートカットキー（Cmd+K / Ctrl+K で検索欄にフォーカス）
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K / Ctrl+K で検索欄にフォーカス
            if (isShortcutKey(e, 'k', { requireModifier: true })) {
                e.preventDefault()
                const searchInput = document.querySelector<HTMLInputElement>('input[aria-label="カード検索"]')
                searchInput?.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    const clearFilters = useCallback(() => {
        setSearchQuery('')
        setSelectedLabelIds([])
    }, [setSearchQuery, setSelectedLabelIds])

    const handleDragStart = useCallback(
        (event: DragStartEvent) => {
            const type = (event.active.data.current?.type as 'card' | 'column' | undefined) ?? 'card'
            setActiveId(event.active.id as string)
            setActiveType(type)

            if (type === 'card') {
                if (isFiltered) {
                    // order 破壊防止のためフィルタ中は並べ替え不可(監査C7)。理由を必ず伝える。
                    showToast('フィルター適用中は並べ替えできません。フィルターを解除してください', 'info', {
                        label: 'クリア',
                        onAction: clearFilters,
                    })
                    return
                }
                beginDrag()
            }
        },
        [isFiltered, beginDrag, clearFilters]
    )

    // ドラッグ中のライブプレビュー: カラムをまたいだ瞬間にローカル state 上で
    // カードを移動し、挿入位置をリアルタイムに見せる(Trello 同等)。
    // 同一カラム内の並び替えプレビューは SortableContext が自動で行う。
    // 衝突判定: ドラッグ中のカードは自分自身のrectがカーソルに追従するため、
    // 既定の判定だと常に自分が最近傍になり over が切り替わらない。
    // アクティブ要素を除外した上で、ポインタ位置ベース(pointerWithin)を優先する。
    const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
        const droppableContainers = args.droppableContainers.filter((c) => c.id !== args.active.id)

        // レーンのドラッグはレーン同士だけで判定する
        if (args.active.data.current?.type === 'column') {
            return closestCenter({
                ...args,
                droppableContainers: droppableContainers.filter((c) => c.data.current?.type === 'column'),
            })
        }

        const pointerCollisions = pointerWithin({ ...args, droppableContainers })
        if (pointerCollisions.length > 0) return pointerCollisions
        return rectIntersection({ ...args, droppableContainers })
    }, [])

    const handleDragOver = useCallback(
        (event: DragOverEvent) => {
            if (activeType !== 'card' || isFiltered) return
            const { active, over } = event
            if (!over) return

            const activeCardId = active.id as string
            const overId = over.id as string
            if (activeCardId === overId) return

            const activeCard = cards.find((c) => c.id === activeCardId)
            if (!activeCard) return

            const overIsColumn = over.data.current?.type === 'column' || columns.some((col) => col.id === overId)
            const overColumnId: ColumnType | undefined = overIsColumn
                ? overId
                : cards.find((c) => c.id === overId)?.columnId

            if (!overColumnId || activeCard.columnId === overColumnId) return

            const overCards = (cardsByColumn[overColumnId] || []).filter((c) => c.id !== activeCardId)
            let insertIndex = overCards.length
            if (!overIsColumn) {
                const overIndex = overCards.findIndex((c) => c.id === overId)
                if (overIndex >= 0) {
                    // ポインタが対象カードの下半分にあれば「後ろ」に挿入
                    const activeTop = active.rect.current.translated?.top
                    const isBelow = activeTop !== undefined && activeTop > over.rect.top + over.rect.height / 2
                    insertIndex = overIndex + (isBelow ? 1 : 0)
                }
            }

            moveCardLocal(activeCardId, overColumnId, insertIndex)
        },
        [activeType, isFiltered, cards, columns, cardsByColumn, moveCardLocal]
    )

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            setActiveId(null)
            setActiveType(null)

            // レーン自体の並べ替え
            if (active.data.current?.type === 'column') {
                if (!over || !currentBoardId || active.id === over.id) return
                const oldIndex = columns.findIndex((col) => col.id === active.id)
                const newIndex = columns.findIndex((col) => col.id === over.id)
                if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return
                reorderColumns(currentBoardId, arrayMove(columns, oldIndex, newIndex))
                return
            }

            // フィルタ適用中の並べ替えは非表示カードの order を破壊する(監査C7)ため確定しない
            if (isFiltered) {
                cancelDrag()
                return
            }

            if (!over) {
                // ドロップ先なし: dragOver で動かした分は確定する(視覚と結果を一致させる)
                commitDrag()
                return
            }

            const activeCardId = active.id as string
            const overId = over.id as string
            const activeCard = cards.find((c) => c.id === activeCardId)
            if (!activeCard) {
                commitDrag()
                return
            }

            // 同一カラム内での並べ替え位置を確定(カラムまたぎは dragOver で反映済み)
            const overCard = cards.find((c) => c.id === overId)
            if (overCard && overCard.columnId === activeCard.columnId && activeCardId !== overId) {
                const columnCards = cardsByColumn[activeCard.columnId] || []
                const newIndex = columnCards.findIndex((c) => c.id === overId)
                if (newIndex !== -1) {
                    moveCardLocal(activeCardId, activeCard.columnId, newIndex)
                }
            }

            commitDrag()
        },
        [
            cards,
            columns,
            cardsByColumn,
            currentBoardId,
            reorderColumns,
            isFiltered,
            cancelDrag,
            commitDrag,
            moveCardLocal,
        ]
    )

    const handleDragCancel = useCallback(() => {
        setActiveId(null)
        setActiveType(null)
        cancelDrag()
    }, [cancelDrag])

    const toggleColumnCollapse = useCallback(
        (columnId: string) => {
            setCollapsedColumns((prev) => {
                const next = new Set(prev)
                if (next.has(columnId)) {
                    next.delete(columnId)
                } else {
                    next.add(columnId)
                }
                if (currentBoardId) {
                    try {
                        const stored = localStorage.getItem('kanban-collapsed-columns')
                        const data = stored ? JSON.parse(stored) : {}
                        data[currentBoardId] = [...next]
                        localStorage.setItem('kanban-collapsed-columns', JSON.stringify(data))
                    } catch {
                        /* localStorage書き込み失敗時は無視 */
                    }
                }
                return next
            })
        },
        [currentBoardId]
    )

    const handleHardReload = useCallback(() => {
        // ハードリロード（キャッシュをクリア）
        window.location.reload()
    }, [])

    const activeCard = activeId && activeType === 'card' ? cards.find((c) => c.id === activeId) : null
    const columnIds = useMemo(() => columns.map((col) => col.id), [columns])

    // Show loading while checking auth
    if (isFirebaseEnabled && !isInitialized && !offlineMode) {
        return (
            <>
                <GlobalStyle $theme={theme} />
                <LoadingContainer $theme={theme}>
                    <LoadingText $theme={theme}>読み込み中...</LoadingText>
                </LoadingContainer>
            </>
        )
    }

    // Show auth screen if Firebase is enabled and user is not authenticated and not in offline mode
    if (isFirebaseEnabled && !user && !offlineMode) {
        return (
            <>
                <GlobalStyle $theme={theme} />
                <Auth onSkipAuth={() => setOfflineMode(true)} />
            </>
        )
    }

    return (
        <ErrorBoundary>
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetectionStrategy}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <GlobalStyle $theme={theme} />
                <Container $theme={theme} data-app-container>
                    <Header />

                    {isFiltered && (
                        <FilterBar $theme={theme}>
                            <FilterInfo>
                                {filteredCards.length}件のカードを表示中(フィルター適用中は並べ替えできません)
                            </FilterInfo>
                            <FilterClearButton onClick={clearFilters}>フィルターをクリア</FilterClearButton>
                        </FilterBar>
                    )}

                    <MainArea $theme={theme} $boardColor={currentBoard?.color}>
                        <HorizontalScroll data-horizontal-scroll>
                            {!currentBoardId ? (
                                <EmptyState>
                                    <EmptyIcon>
                                        <BoardIcon />
                                    </EmptyIcon>
                                    <EmptyTitle $theme={theme}>ボードを選択してください</EmptyTitle>
                                    <EmptyText $theme={theme}>
                                        ヘッダーの「+ ボード」ボタンから新しいボードを作成できます
                                    </EmptyText>
                                </EmptyState>
                            ) : (
                                <>
                                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                                        {columns.map((column) => {
                                            const columnCards = cardsByColumn[column.id] || []

                                            return (
                                                <Column
                                                    key={column.id}
                                                    id={column.id}
                                                    title={column.title}
                                                    cards={columnCards}
                                                    boardId={currentBoardId}
                                                    columnColor={column.color}
                                                    isCollapsed={collapsedColumns.has(column.id)}
                                                    onToggleCollapse={() => toggleColumnCollapse(column.id)}
                                                />
                                            )
                                        })}
                                    </SortableContext>
                                    <AddColumnButton
                                        $theme={theme}
                                        onClick={() => setShowColumnManager(true)}
                                        title='レーンを管理'
                                        aria-label='レーンを管理'
                                    >
                                        <AddColumnIcon>+</AddColumnIcon>
                                        <AddColumnText>レーン管理</AddColumnText>
                                    </AddColumnButton>
                                </>
                            )}
                        </HorizontalScroll>
                    </MainArea>

                    <DragOverlay>{activeCard ? <CardComponent card={activeCard} isDragging /> : null}</DragOverlay>

                    <ReloadPrompt isVisible={showReloadPrompt} onReload={handleHardReload} />

                    <BlockerWarning />

                    <ToastContainer />

                    {showColumnManager && currentBoardId && (
                        <ChunkErrorBoundary>
                            <Suspense fallback={<LoadingOverlay $theme={theme}>読み込み中...</LoadingOverlay>}>
                                <ColumnManager boardId={currentBoardId} onClose={() => setShowColumnManager(false)} />
                            </Suspense>
                        </ChunkErrorBoundary>
                    )}
                </Container>
            </DndContext>
        </ErrorBoundary>
    )
}

const Container = styled.div<{ $theme: Theme }>`
    display: flex;
    flex-flow: column;
    height: 100%;
    background-color: ${(props) => props.$theme.background};
    position: relative;
    z-index: 0;
`

const LoadingOverlay = styled.div<{ $theme: Theme }>`
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${(props) => props.$theme.background}ee;
    backdrop-filter: blur(4px);
    color: ${(props) => props.$theme.text};
    font-size: 14px;
    z-index: 9999;
`

const Header = styled(_Header)`
    flex-shrink: 0;
`

const FilterBar = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px;
    background: ${(props) => props.$theme.surfaceHover};
    border-bottom: 1px solid ${(props) => props.$theme.border};
    color: ${(props) => props.$theme.textSecondary};
    font-size: 12px;
    flex-shrink: 0;
`

const FilterInfo = styled.span`
    flex: 1;
`

const FilterClearButton = styled.button`
    border: none;
    background: transparent;
    color: #2196f3;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;

    &:hover {
        background: rgba(33, 150, 243, 0.12);
    }
`

const MainArea = styled.div<{ $theme: Theme; $boardColor?: string }>`
    flex: 1;
    min-height: 0;
    padding: 16px 0;
    overflow: hidden;
    background: ${(props) => props.$theme.background};
    position: relative;
    z-index: 0;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            ${(props) =>
                props.$boardColor
                    ? // 選択中ボードの色を背景に薄く敷き、ボードの「場所」感を出す
                      `linear-gradient(180deg, ${props.$boardColor}26 0%, ${props.$boardColor}0d 30%, transparent 70%),`
                    : ''}
                radial-gradient(ellipse 80% 50% at 20% 40%, ${(props) => props.$theme.accentGlow} 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 60%, ${(props) => props.$theme.accentGlow2} 0%, transparent 70%);
        pointer-events: none;
        z-index: -1;
    }
`

const HorizontalScroll = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 8px;
    position: relative;
    z-index: 0;

    /* モバイルでのスクロール改善 */
    @media (max-width: 768px) {
        scroll-snap-type: x proximity;
        padding-left: 8px;

        > * {
            scroll-snap-align: start;
        }
    }

    > * {
        margin-left: 16px;
        flex-shrink: 0;

        @media (max-width: 768px) {
            margin-left: 8px;
        }
    }

    &::after {
        display: block;
        flex: 0 0 16px;
        content: '';

        @media (max-width: 768px) {
            flex: 0 0 8px;
        }
    }
`

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 40px;
    text-align: center;
`

const EmptyIcon = styled.div`
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.3;
    color: #6b778c;

    svg {
        width: 64px;
        height: 64px;
    }
`

const EmptyTitle = styled.h2<{ $theme: Theme }>`
    font-size: 24px;
    color: ${(props) => props.$theme.text};
    margin: 0 0 12px 0;
    font-weight: 600;
`

const EmptyText = styled.p<{ $theme: Theme }>`
    font-size: 16px;
    color: ${(props) => props.$theme.textSecondary};
    margin: 0;
    max-width: 400px;
`

const LoadingContainer = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color: ${(props) => props.$theme.background};
`

const LoadingText = styled.div<{ $theme: Theme }>`
    color: ${(props) => props.$theme.text};
    font-size: 18px;
`

const AddColumnButton = styled.button<{ $theme: Theme }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 200px;
    height: 120px;
    border: 2px dashed ${(props) => props.$theme.textSecondary}50;
    border-radius: 12px;
    background: transparent;
    color: ${(props) => props.$theme.textSecondary};
    cursor: pointer;
    transition: all 0.2s ease;
    gap: 8px;
    align-self: flex-start;
    margin-top: 0;

    &:hover {
        border-color: ${(props) => props.$theme.textSecondary};
        background: ${(props) => props.$theme.surfaceHover};
        color: ${(props) => props.$theme.text};
    }
`

const AddColumnIcon = styled.div`
    font-size: 28px;
    line-height: 1;
`

const AddColumnText = styled.div`
    font-size: 13px;
    font-weight: 500;
`
