import { useEffect, useMemo } from 'react'
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
import { useState } from 'react'
import { Header as _Header } from './Header'
import { Column } from './Column'
import { Card as CardComponent } from './Card'
import { useKanbanStore } from './store/kanbanStore'
import type { ColumnType } from './types'

const COLUMNS: { id: ColumnType; title: string }[] = [
  { id: 'TODO', title: 'TODO' },
  { id: 'Doing', title: 'Doing' },
  { id: 'Waiting', title: 'Waiting' },
  { id: 'Done', title: 'Done' }
]

export function App() {
  const { cards, searchQuery, subscribeToCards } = useKanbanStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  useEffect(() => {
    const unsubscribe = subscribeToCards()
    return () => unsubscribe()
  }, [subscribeToCards])

  const filteredCards = useMemo(() => {
    if (!searchQuery) return cards
    return cards.filter(card =>
      card.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [cards, searchQuery])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeCard = cards.find(c => c.id === active.id)
    if (!activeCard) return

    const overId = over.id as string
    const overColumn = COLUMNS.find(col => col.id === overId)

    if (overColumn && activeCard.columnId !== overColumn.id) {
      const { moveCard } = useKanbanStore.getState()
      const cardsInNewColumn = cards.filter(c => c.columnId === overColumn.id)
      const newOrder = cardsInNewColumn.length
      moveCard(activeCard.id, overColumn.id, newOrder)
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
            {COLUMNS.map(column => {
              const columnCards = filteredCards
                .filter(card => card.columnId === column.id)
                .sort((a, b) => a.order - b.order)

              return (
                <Column
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  cards={columnCards}
                />
              )
            })}
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