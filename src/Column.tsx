import { useState } from 'react'
import styled from 'styled-components'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import * as color from './color'
import { Card } from './Card'
import { PlusIcon } from './icon'
import { InputForm as _InputForm } from './InputForm'
import { useKanbanStore } from './store/kanbanStore'
import type { Card as CardType, ColumnType } from './types'

export function Column({
  id,
  title,
  cards,
  boardId
}: {
  id: ColumnType
  title: string
  cards: CardType[]
  boardId: string
}) {
  const { addCard } = useKanbanStore()
  const { setNodeRef } = useDroppable({ id })

  const [text, setText] = useState('')
  const [inputMode, setInputMode] = useState(false)

  const toggleInput = () => setInputMode(v => !v)

  const confirmInput = async () => {
    if (text.trim() && boardId) {
      await addCard(text.trim(), id, boardId)
      setText('')
      setInputMode(false)
    }
  }

  const cancelInput = () => {
    setText('')
    setInputMode(false)
  }

  const cardIds = cards.map(card => card.id)

  return (
    <Container ref={setNodeRef}>
      <Header>
        <CountBadge>{cards.length}</CountBadge>
        <ColumnName>{title}</ColumnName>
        <AddButton onClick={toggleInput} />
      </Header>

      {inputMode && (
        <InputForm
          value={text}
          onChange={setText}
          onConfirm={confirmInput}
          onCancel={cancelInput}
        />
      )}

      <VerticalScroll>
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <Card key={card.id} card={card} />
          ))}
        </SortableContext>
      </VerticalScroll>
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex-flow: column;
  width: 355px;
  height: 100%;
  border: solid 1px ${color.Silver};
  border-radius: 6px;
  background-color: ${color.LightSilver};

  > :not(:last-child) {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    width: 280px;
    min-width: 280px;
  }

  @media (max-width: 480px) {
    width: 260px;
    min-width: 260px;
  }
`

const Header = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 8px;
`

const CountBadge = styled.div`
  margin-right: 8px;
  border-radius: 20px;
  padding: 2px 6px;
  color: ${color.Black};
  background-color: ${color.Silver};
  font-size: 12px;
  line-height: 1;
`

const ColumnName = styled.div`
  color: ${color.Black};
  font-size: 14px;
  font-weight: bold;
`

const AddButton = styled.button.attrs({
    type: 'button',
    children: <PlusIcon />,
})`
  margin-left: auto;
  color: ${color.Black};

  :hover {
    color: ${color.Blue};
  }
`
const InputForm = styled(_InputForm)`
   padding: 8px;
 `

const VerticalScroll = styled.div`
  height: 100%;
  padding: 8px;
  overflow-y: auto;
  flex: 1 1 auto;

  > :not(:first-child) {
    margin-top: 8px;
  }
`