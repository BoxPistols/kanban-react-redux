import { useState } from 'react'
import styled from 'styled-components'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { CheckIcon as _CheckIcon, TrashIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { CardDetailModal } from './CardDetailModal'
import type { Card as CardType } from './types'

export function Card({
  card,
  isDragging = false
}: {
  card: CardType
  isDragging?: boolean
}) {
  const { deleteCard } = useKanbanStore()
  const [showModal, setShowModal] = useState(false)

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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking delete button or dragging
    if ((e.target as HTMLElement).closest('button')) return
    setShowModal(true)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const displayText = card.title || card.text
  const hasLabels = card.labels && card.labels.length > 0
  const hasChecklist = card.checklist && card.checklist.length > 0
  const hasDueDate = card.dueDate
  const completedItems = card.checklist?.filter(item => item.completed).length || 0
  const totalItems = card.checklist?.length || 0

  const isDueSoon = !!(card.dueDate && card.dueDate < Date.now() + 86400000) // 24 hours
  const isOverdue = !!(card.dueDate && card.dueDate < Date.now())

  return (
    <>
      <Container
        ref={setNodeRef}
        style={style}
        $isDragging={isDragging || isSortableDragging}
        $cardColor={card.color}
        onClick={handleCardClick}
        {...listeners}
        {...attributes}
      >
        {hasLabels && (
          <LabelsRow>
            {card.labels!.map(label => (
              <LabelBadge key={label.id} $color={label.color}>
                {label.name}
              </LabelBadge>
            ))}
          </LabelsRow>
        )}

        <ContentRow>
          <CheckIcon />

          <TextContent>
            {displayText.split(/(https?:\/\/\S+)/g).map((fragment, i) =>
              i % 2 === 0 ? (
                <Text key={i}>{fragment}</Text>
              ) : (
                <Link key={i} href={fragment}>
                  {fragment}
                </Link>
              )
            )}
          </TextContent>
        </ContentRow>

        <MetadataRow>
          {hasDueDate && (
            <DueDateBadge $isOverdue={isOverdue} $isDueSoon={isDueSoon && !isOverdue}>
              📅 {new Date(card.dueDate!).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric'
              })}
            </DueDateBadge>
          )}

          {hasChecklist && (
            <ChecklistBadge $allCompleted={completedItems === totalItems}>
              ✓ {completedItems}/{totalItems}
            </ChecklistBadge>
          )}

          {card.description && (
            <DescriptionBadge title="説明あり">📝</DescriptionBadge>
          )}
        </MetadataRow>

        <DeleteButton onClick={handleDelete} />
      </Container>

      {showModal && (
        <CardDetailModal
          card={card}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

const Container = styled.div<{ $isDragging?: boolean; $cardColor?: string }>`
  position: relative;
  border: solid 1px ${color.Silver};
  border-radius: 6px;
  box-shadow: 0 1px 3px hsla(0, 0%, 7%, 0.1);
  padding: 8px;
  background-color: ${props => props.$cardColor || color.White};
  cursor: pointer;
  opacity: ${props => (props.$isDragging ? 0.5 : 1)};
  touch-action: none;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    box-shadow: 0 2px 8px hsla(0, 0%, 7%, 0.2);
  }
`

const LabelsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
`

const LabelBadge = styled.div<{ $color: string }>`
  padding: 2px 8px;
  border-radius: 3px;
  background-color: ${props => props.$color};
  color: ${color.White};
  font-size: 11px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`

const ContentRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding-right: 24px;
`

const CheckIcon = styled(_CheckIcon)`
  color: ${color.Green};
  flex-shrink: 0;
  margin-top: 2px;
`

const TextContent = styled.div`
  flex: 1;
  min-width: 0;
`

const Text = styled.span`
  color: ${color.Black};
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`

const Link = styled.a.attrs({
    target: '_blank',
    rel: 'noopener noreferrer',
})`
  color: ${color.Blue};
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`

const MetadataRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
`

const DueDateBadge = styled.div<{ $isOverdue?: boolean; $isDueSoon?: boolean }>`
  padding: 2px 6px;
  border-radius: 3px;
  background-color: ${props =>
    props.$isOverdue ? color.Red :
    props.$isDueSoon ? '#FF9F1A' :
    color.LightSilver
  };
  color: ${props =>
    props.$isOverdue || props.$isDueSoon ? color.White : color.Black
  };
  font-size: 11px;
  font-weight: 600;
`

const ChecklistBadge = styled.div<{ $allCompleted: boolean }>`
  padding: 2px 6px;
  border-radius: 3px;
  background-color: ${props => props.$allCompleted ? color.Green : color.LightSilver};
  color: ${props => props.$allCompleted ? color.White : color.Black};
  font-size: 11px;
  font-weight: 600;
`

const DescriptionBadge = styled.div`
  padding: 2px 6px;
  border-radius: 3px;
  background-color: ${color.LightSilver};
  font-size: 11px;
`

const DeleteButton = styled.button.attrs({
    type: 'button',
    children: <TrashIcon />,
})`
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 14px;
  color: ${color.Gray};
  background: ${color.White};
  border-radius: 3px;
  padding: 2px;
  opacity: 0.7;

  :hover {
    color: ${color.Red};
    opacity: 1;
  }
`
