import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { GlobalStyle } from './GlobalStyle'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { Card as CardComponent } from './Card'
import { Auth } from './Auth'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { BoardIcon } from './icon'
import { getTheme } from './theme'
import { isFirebaseEnabled } from './lib/firebase'
import type { Card as CardType, ColumnType } from './types'

const COLUMNS: { id: ColumnType; title: string }[] = [
  { id: 'TODO', title: 'TODO' },
  { id: 'Doing', title: 'Doing' },
  { id: 'Waiting', title: 'Waiting' },
  { id: 'Done', title: 'Done' }
]

export function App() {
  const { cards, searchQuery, selectedLabelIds, subscribeToCards, reorderCards, setForceOfflineMode: setKanbanOfflineMode } = useKanbanStore()
  const { subscribeToBoards, currentBoardId, setForceOfflineMode: setBoardOfflineMode } = useBoardStore()
  const { isDarkMode, initializeTheme } = useThemeStore()
  const { user, isInitialized, initAuth } = useAuthStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [offlineMode, setOfflineMode] = useState(false)

  // オフラインモードをストアに同期
  useEffect(() => {
    setBoardOfflineMode(offlineMode)
    setKanbanOfflineMode(offlineMode)
  }, [offlineMode, setBoardOfflineMode, setKanbanOfflineMode])

  const theme = getTheme(isDarkMode)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5
      }
    })
  )

  // All hooks must be called before any conditional returns
  const filteredCards = useMemo(() => {
    let filtered = cards

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by selected labels
    if (selectedLabelIds.length > 0) {
      filtered = filtered.filter(card => {
        if (!card.labels || card.labels.length === 0) return false
        return card.labels.some(label => selectedLabelIds.includes(label.id))
      })
    }

    return filtered
  }, [cards, searchQuery, selectedLabelIds])

  const cardsByColumn = useMemo(() => {
    const grouped = filteredCards.reduce<Record<ColumnType, CardType[]>>((acc, card) => {
      (acc[card.columnId] = acc[card.columnId] || []).push(card)
      return acc
    }, {} as Record<ColumnType, CardType[]>)

    Object.values(grouped).forEach(columnCards =>
      columnCards.sort((a, b) => a.order - b.order)
    )

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
  }, [subscribeToBoards, offlineMode])

  useEffect(() => {
    if (!currentBoardId) return
    const unsubscribeCards = subscribeToCards(currentBoardId)
    return () => unsubscribeCards()
  }, [subscribeToCards, currentBoardId, offlineMode])

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeCard = cards.find(c => c.id === activeId)
    if (!activeCard) return

    // Check if dropping on a column or a card
    const overColumn = COLUMNS.find(col => col.id === overId)
    const overCard = cards.find(c => c.id === overId)

    if (overCard) {
      // Dropping on a card - handle sorting within same or different column
      const activeColumnId = activeCard.columnId
      const overColumnId = overCard.columnId

      if (activeColumnId === overColumnId) {
        // Same column - reorder within column
        const columnCards = cardsByColumn[activeColumnId] || []
        const oldIndex = columnCards.findIndex(c => c.id === activeId)
        const newIndex = columnCards.findIndex(c => c.id === overId)

        if (oldIndex !== newIndex) {
          const reorderedCards = arrayMove(columnCards, oldIndex, newIndex)
          const updates = reorderedCards.map((card, index) => ({
            id: card.id,
            order: index
          }))
          reorderCards(updates)
        }
      } else {
        // Different column - move card to new column at specific position
        const targetColumnCards = cardsByColumn[overColumnId] || []
        const targetIndex = targetColumnCards.findIndex(c => c.id === overId)

        // Create new order for the moved card and update all cards in target column
        const updates: { id: string; order: number; columnId?: ColumnType }[] = []

        // Update the moved card
        updates.push({
          id: activeId,
          order: targetIndex,
          columnId: overColumnId
        })

        // Update cards in the target column that come after the insertion point
        targetColumnCards.forEach((card, index) => {
          if (index >= targetIndex) {
            updates.push({
              id: card.id,
              order: index + 1
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

        reorderCards([{
          id: activeId,
          order: newOrder,
          columnId: overColumn.id
        }])
      }
    }
  }

  const activeCard = activeId ? cards.find(c => c.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <GlobalStyle $theme={theme} />
      <Container $theme={theme} data-app-container>
        <Header />

        <MainArea $theme={theme}>
          <HorizontalScroll data-horizontal-scroll>
            {!currentBoardId ? (
              <EmptyState>
                <EmptyIcon><BoardIcon /></EmptyIcon>
                <EmptyTitle $theme={theme}>ボードを選択してください</EmptyTitle>
                <EmptyText $theme={theme}>ヘッダーの「+ ボード」ボタンから新しいボードを作成できます</EmptyText>
              </EmptyState>
            ) : (
              COLUMNS.map(column => {
                const columnCards = cardsByColumn[column.id] || []

                return (
                  <Column
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    cards={columnCards}
                    boardId={currentBoardId}
                  />
                )
              })
            )}
          </HorizontalScroll>
        </MainArea>

        <DragOverlay>
          {activeCard ? <CardComponent card={activeCard} isDragging /> : null}
        </DragOverlay>
      </Container>
    </DndContext>
  )
}

const Container = styled.div<{ $theme: any }>`
  display: flex;
  flex-flow: column;
  height: 100%;
  background-color: ${props => props.$theme.background};
  position: relative;
  z-index: 1;
`

const Header = styled(_Header)`
  flex-shrink: 0;
`

const MainArea = styled.div<{ $theme: any }>`
  flex: 1;
  min-height: 90vh;
  padding: 16px 0;
  overflow: hidden;
  background-color: ${props => props.$theme.background};
  position: relative;
  z-index: 0;
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
  color: #6B778C;

  svg {
    width: 64px;
    height: 64px;
  }
`

const EmptyTitle = styled.h2<{ $theme: any }>`
  font-size: 24px;
  color: ${props => props.$theme.text};
  margin: 0 0 12px 0;
  font-weight: 600;
`

const EmptyText = styled.p<{ $theme: any }>`
  font-size: 16px;
  color: ${props => props.$theme.textSecondary};
  margin: 0;
  max-width: 400px;
`

const LoadingContainer = styled.div<{ $theme: any }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: ${props => props.$theme.background};
`

const LoadingText = styled.div<{ $theme: any }>`
  color: ${props => props.$theme.text};
  font-size: 18px;
`