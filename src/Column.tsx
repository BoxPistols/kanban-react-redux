import { useState } from 'react'
import styled from 'styled-components'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import * as color from './color'
import { Card } from './Card'
import { PlusIcon } from './icon'
import { InputForm as _InputForm } from './InputForm'
import { useKanbanStore } from './store/kanbanStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'
import type { Card as CardType, ColumnType } from './types'

export function Column({
  id,
  title,
  cards,
  boardId,
  columnColor
}: {
  id: ColumnType
  title: string
  cards: CardType[]
  boardId: string
  columnColor?: string
}) {
  const { addCard } = useKanbanStore()
  const { isDarkMode } = useThemeStore()
  const { setNodeRef } = useDroppable({ id })

  const theme = getTheme(isDarkMode)
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
    <Container ref={setNodeRef} $theme={theme} $columnColor={columnColor} data-column-container>
      <HeaderBar $columnColor={columnColor}>
        <CountBadge $theme={theme} $columnColor={columnColor}>{cards.length}</CountBadge>
        <ColumnName $theme={theme}>{title}</ColumnName>
        <AddButton onClick={toggleInput} $theme={theme} />
      </HeaderBar>

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

const Container = styled.div<{ $theme: any; $columnColor?: string }>`
  display: flex;
  flex-flow: column;
  width: 340px;
  height: 100%;
  border: none;
  border-radius: 12px;
  background-color: ${props => props.$theme.columnBackground};
  position: relative;
  z-index: 0;
  box-shadow: 0 1px 4px ${props => props.$theme.shadow};

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

const HeaderBar = styled.div<{ $columnColor?: string }>`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 12px 12px 8px 12px;
  border-radius: 12px 12px 0 0;
  ${props => props.$columnColor ? `border-top: 3px solid ${props.$columnColor};` : ''}
`

const CountBadge = styled.div<{ $theme: any; $columnColor?: string }>`
  margin-right: 8px;
  border-radius: 20px;
  padding: 2px 8px;
  color: ${props => props.$columnColor ? color.White : props.$theme.text};
  background-color: ${props => props.$columnColor || props.$theme.surface};
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
`

const ColumnName = styled.div<{ $theme: any }>`
  color: ${props => props.$theme.text};
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
`

const AddButton = styled.button.attrs({
    type: 'button',
    children: <PlusIcon />,
})<{ $theme: any }>`
  margin-left: auto;
  color: ${props => props.$theme.textSecondary};
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;

  :hover {
    color: ${color.Blue};
    background: ${props => props.$theme.surfaceHover};
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
