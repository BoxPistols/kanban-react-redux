import { useState } from 'react'
import styled from 'styled-components'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { CheckIcon as _CheckIcon, TrashIcon, CalendarIcon, ListIcon, DocumentIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'
import { getDueDateStatus } from './utils/dateUtils'
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
  const { isDarkMode } = useThemeStore()
  const [showModal, setShowModal] = useState(false)

  const theme = getTheme(isDarkMode)

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
  const primaryLabelColor = hasLabels ? card.labels![0].color : undefined

  // Debug: Log card labels (always show in console)
  console.log('📌 Card:', card.text, 'Labels:', card.labels, 'hasLabels:', hasLabels, 'primaryColor:', primaryLabelColor)

  const { isDueSoon, isOverdue } = getDueDateStatus(card.dueDate)

  // Get description preview (first 80 characters)
  const descriptionPreview = card.description ?
    (card.description.length > 80 ? card.description.slice(0, 80) + '...' : card.description)
    : null

  return (
    <>
      <Container
        ref={setNodeRef}
        style={style}
        $isDragging={isDragging || isSortableDragging}
        $labelColor={primaryLabelColor}
        $theme={theme}
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
            <Title $theme={theme}>{displayText}</Title>
            {descriptionPreview && (
              <Description $theme={theme}>{descriptionPreview}</Description>
            )}
          </TextContent>
        </ContentRow>

        <MetadataRow>
          {hasDueDate && (
            <DueDateBadge $isOverdue={isOverdue} $isDueSoon={isDueSoon && !isOverdue}>
              <CalendarIcon />
              <span>{new Date(card.dueDate!).toLocaleDateString('ja-JP', {
                month: 'short',
                day: 'numeric'
              })}</span>
            </DueDateBadge>
          )}

          {hasChecklist && (
            <ChecklistBadge $allCompleted={completedItems === totalItems}>
              <ListIcon />
              <span>{completedItems}/{totalItems}</span>
            </ChecklistBadge>
          )}

          {card.description && (
            <DescriptionBadge $theme={theme} title="説明あり">
              <DocumentIcon />
            </DescriptionBadge>
          )}
        </MetadataRow>

        <DeleteButton onClick={handleDelete} $theme={theme} />
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

const Container = styled.div<{ $isDragging?: boolean; $labelColor?: string; $theme: any }>`
  position: relative;
  z-index: 1;
  border: solid 1px ${props => props.$theme.border};
  border-radius: 6px;
  border-top: 4px solid ${props => props.$labelColor || props.$theme.border};
  box-shadow: 0 1px 3px ${props => props.$theme.shadow};
  padding: 10px;
  background-color: ${props => props.$theme.cardBackground};
  cursor: pointer;
  opacity: ${props => (props.$isDragging ? 0.5 : 1)};
  touch-action: none;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    box-shadow: 0 2px 8px ${props => props.$theme.shadowHover};
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
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Title = styled.div<{ $theme: any }>`
  color: ${props => props.$theme.text};
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-word;
`

const Description = styled.div<{ $theme: any }>`
  color: ${props => props.$theme.textSecondary};
  font-size: 12px;
  line-height: 1.4;
  word-break: break-word;
`

const MetadataRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
`

const DueDateBadge = styled.div<{ $isOverdue?: boolean; $isDueSoon?: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
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

  svg {
    width: 12px;
    height: 12px;
  }
`

const ChecklistBadge = styled.div<{ $allCompleted: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 3px;
  background-color: ${props => props.$allCompleted ? color.Green : color.LightSilver};
  color: ${props => props.$allCompleted ? color.White : color.Black};
  font-size: 11px;
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
`

const DescriptionBadge = styled.div<{ $theme: any }>`
  display: flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 3px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.textSecondary};
  font-size: 11px;

  svg {
    width: 12px;
    height: 12px;
  }
`

const DeleteButton = styled.button.attrs({
    type: 'button',
    children: <TrashIcon />,
})<{ $theme: any }>`
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 14px;
  color: ${props => props.$theme.textSecondary};
  background: ${props => props.$theme.cardBackground};
  border-radius: 3px;
  padding: 2px;
  opacity: 0.7;

  :hover {
    color: ${color.Red};
    opacity: 1;
  }
`
