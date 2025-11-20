import styled from 'styled-components'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { CheckIcon as _CheckIcon, TrashIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import type { Card as CardType } from './types'

export function Card({
  card,
  isDragging = false
}: {
  card: CardType
  isDragging?: boolean
}) {
  const { deleteCard } = useKanbanStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card
    }
  })

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('このカードを削除しますか？')) {
      await deleteCard(card.id)
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <Container
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging || isSortableDragging}
      {...listeners}
      {...attributes}
    >
      <CheckIcon />

      {card.text.split(/(https?:\/\/\S+)/g).map((fragment, i) =>
        i % 2 === 0 ? (
          <Text key={i}>{fragment}</Text>
        ) : (
          <Link key={i} href={fragment}>
            {fragment}
          </Link>
        )
      )}

      <DeleteButton onClick={handleDelete} />
    </Container>
  )
}

const Container = styled.div<{ $isDragging?: boolean }>`
  position: relative;
  border: solid 1px ${color.Silver};
  border-radius: 6px;
  box-shadow: 0 1px 3px hsla(0, 0%, 7%, 0.1);
  padding: 8px 32px;
  background-color: ${color.White};
  cursor: move;
  opacity: ${props => (props.$isDragging ? 0.5 : 1)};
  touch-action: none;
`

const CheckIcon = styled(_CheckIcon)`
  position: absolute;
  top: 12px;
  left: 8px;
  color: ${color.Green};
`

const DeleteButton = styled.button.attrs({
    type: 'button',
    children: <TrashIcon />,
})`
  position: absolute;
  top: 12px;
  right: 8px;
  font-size: 14px;
  color: ${color.Gray};

  :hover {
    color: ${color.Red};
  }
`

const Text = styled.span`
  color: ${color.Black};
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
`

const Link = styled.a.attrs({
    target: '_blank',
    rel: 'noopener noreferrer',
})`
  color: ${color.Blue};
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
`
