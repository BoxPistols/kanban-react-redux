import { useEffect, useMemo, useState, useCallback, lazy, Suspense } from 'react'
import styled from 'styled-components'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { GlobalStyle } from './GlobalStyle'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { Card as CardComponent } from './Card'
import { Auth } from './Auth'
import { ReloadPrompt } from './ReloadPrompt'
import { ErrorBoundary } from './ErrorBoundary'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { BlockerWarning } from './components/BlockerWarning'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { BoardIcon } from './icon'
import { getTheme, Theme } from './theme'
import { isFirebaseEnabled } from './lib/firebase'
import { isShortcutKey } from './utils/keyboard'
import './utils/debugFirestore' // デバッグユーティリティ（コンソールで window.debugFirestore() を実行）
import type { Card as CardType, ColumnType } from './types'

// 遅延ロード: モーダル系コンポーネント
const ColumnManager = lazy(() => import('./ColumnManager').then((m) => ({ default: m.ColumnManager })))

export function App() {
    const {
        cards,
        searchQuery,
        selectedLabelIds,
        subscribeToCards,
        reorderCards,
        setForceOfflineMode: setKanbanOfflineMode,
    } = useKanbanStore()
    const { subscribeToBoards, currentBoardId, setForceOfflineMode: setBoardOfflineMode, getColumns } = useBoardStore()
    const { isDarkMode, initializeTheme } = useThemeStore()
    const { user, isInitialized, initAuth } = useAuthStore()
    const [activeId, setActiveId] = useState<string | null>(null)
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
    }, [getColumns, currentBoardId]) // boards は getColumns 内で参照されるため不要

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
                delay: 100,
                tolerance: 5,
            },
        })
    )

    // All hooks must be called before any conditional returns
    const filteredCards = useMemo(() => {
        let filtered = cards

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(
                (card) =>
                    card.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    card.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    card.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

    useEffect(() => {
        const unsubscribeBoards = subscribeToBoards()
        return () => unsubscribeBoards()
    }, [subscribeToBoards])

    useEffect(() => {
        if (!currentBoardId) return
        const unsubscribeCards = subscribeToCards(currentBoardId)
        return () => unsubscribeCards()
    }, [subscribeToCards, currentBoardId])

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

    // All useCallback hooks must be called before conditional returns
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }, [])

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            setActiveId(null)

            if (!over) return

            const activeId = active.id as string
            const overId = over.id as string

            const activeCard = cards.find((c) => c.id === activeId)
            if (!activeCard) return

            // Check if dropping on a column or a card
            const overColumn = columns.find((col) => col.id === overId)
            const overCard = cards.find((c) => c.id === overId)

            if (overCard) {
                // Dropping on a card - handle sorting within same or different column
                const activeColumnId = activeCard.columnId
                const overColumnId = overCard.columnId

                if (activeColumnId === overColumnId) {
                    // Same column - reorder within column
                    const columnCards = cardsByColumn[activeColumnId] || []
                    const oldIndex = columnCards.findIndex((c) => c.id === activeId)
                    const newIndex = columnCards.findIndex((c) => c.id === overId)

                    if (oldIndex !== newIndex) {
                        const reorderedCards = arrayMove(columnCards, oldIndex, newIndex)
                        const updates = reorderedCards.map((card, index) => ({
                            id: card.id,
                            order: index,
                        }))
                        reorderCards(updates)
                    }
                } else {
                    // Different column - move card to new column at specific position
                    const targetColumnCards = cardsByColumn[overColumnId] || []
                    const targetIndex = targetColumnCards.findIndex((c) => c.id === overId)

                    // Create new order for the moved card and update all cards in target column
                    const updates: { id: string; order: number; columnId?: ColumnType }[] = []

                    // Update the moved card
                    updates.push({
                        id: activeId,
                        order: targetIndex,
                        columnId: overColumnId,
                    })

                    // Update cards in the target column that come after the insertion point
                    targetColumnCards.forEach((card, index) => {
                        if (index >= targetIndex) {
                            updates.push({
                                id: card.id,
                                order: index + 1,
                            })
                        }
                    })

                    reorderCards(updates)
                }
            } else if (overColumn) {
                // Dropping on a column - add to end of column
                if (activeCard.columnId !== overColumn.id) {
                    const targetColumnCards = cardsByColumn[overColumn.id] || []
                    const newOrder = targetColumnCards.length

                    reorderCards([
                        {
                            id: activeId,
                            order: newOrder,
                            columnId: overColumn.id,
                        },
                    ])
                }
            }
        },
        [cards, columns, cardsByColumn, reorderCards]
    )

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

    const activeCard = activeId ? cards.find((c) => c.id === activeId) : null

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
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <GlobalStyle $theme={theme} />
                <Container $theme={theme} data-app-container>
                    <Header />

                    <MainArea $theme={theme}>
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

const MainArea = styled.div<{ $theme: Theme }>`
    flex: 1;
    min-height: 90vh;
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
    scroll-behavior: smooth;
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
