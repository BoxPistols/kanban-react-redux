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
import { Header as _Header } from './Header'
import { Column } from './Column'
import { Card as CardComponent } from './Card'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import type { Card as CardType, ColumnType } from './types'

const COLUMNS: { id: ColumnType; title: string }[] = [
  { id: 'TODO', title: 'TODO' },
  { id: 'Doing', title: 'Doing' },
  { id: 'Waiting', title: 'Waiting' },
  { id: 'Done', title: 'Done' }
]

export function App() {
  const { cards, searchQuery, subscribeToCards, reorderCards } = useKanbanStore()
  const { subscribeToBoards, currentBoardId } = useBoardStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 100,
        tolerance: 5
      }
    })
  )

  useEffect(() => {
    const unsubscribeBoards = subscribeToBoards()
    return () => unsubscribeBoards()
  }, [subscribeToBoards])

  useEffect(() => {
    if (!currentBoardId) return
    const unsubscribeCards = subscribeToCards(currentBoardId)
    return () => unsubscribeCards()
  }, [subscribeToCards, currentBoardId])

  const filteredCards = useMemo(() => {
    if (!searchQuery) return cards
    return cards.filter(card =>
      card.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [cards, searchQuery])

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
      <Container>
        <Header />

        <MainArea>
          <HorizontalScroll>
            {!currentBoardId ? (
              <EmptyState>
                <EmptyIcon>📋</EmptyIcon>
                <EmptyTitle>ボードを選択してください</EmptyTitle>
                <EmptyText>ヘッダーの「+ ボード」ボタンから新しいボードを作成できます</EmptyText>
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

const Container = styled.div`
  display: flex;
  flex-flow: column;
  height: 100%;
`

const Header = styled(_Header)`
  flex-shrink: 0;
`

const MainArea = styled.div`
  height: 100%;
  padding: 16px 0;
  overflow-y: auto;
`

const HorizontalScroll = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;

  > * {
    margin-left: 16px;
    flex-shrink: 0;
  }

  ::after {
    display: block;
    flex: 0 0 16px;
    content: '';
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
  opacity: 0.5;
`

const EmptyTitle = styled.h2`
  font-size: 24px;
  color: #344563;
  margin: 0 0 12px 0;
  font-weight: 600;
`

const EmptyText = styled.p`
  font-size: 16px;
  color: #6B778C;
  margin: 0;
  max-width: 400px;
`