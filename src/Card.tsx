import { useState } from 'react'
import styled from 'styled-components'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { TrashIcon, CalendarIcon, ListIcon, DocumentIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import { getDueDateStatus } from './utils/dateUtils'
import { CardDetailModal } from './CardDetailModal'
import { LinkedText } from './LinkedText'
import type { Card as CardType } from './types'

export function Card({ card, isDragging = false }: { card: CardType; isDragging?: boolean }) {
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
        isDragging: isSortableDragging,
    } = useSortable({
        id: card.id,
        data: {
            type: 'card',
            card,
        },
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
        transition,
    }

    const displayText = card.title || card.text
    const hasLabels = card.labels && card.labels.length > 0
    const hasChecklist = card.checklist && card.checklist.length > 0
    const hasDueDate = card.dueDate
    const hasImages = card.images && card.images.length > 0
    const completedItems = card.checklist?.filter((item) => item.completed).length || 0
    const totalItems = card.checklist?.length || 0
    const primaryLabelColor = hasLabels ? card.labels![0].color : undefined

    const { isDueSoon, isOverdue } = getDueDateStatus(card.dueDate)

    // Get description preview (first 80 characters)
    const descriptionPreview = card.description
        ? card.description.length > 80
            ? card.description.slice(0, 80) + '...'
            : card.description
        : null

    return (
        <>
            <Container
                ref={setNodeRef}
                style={style}
                $isDragging={isDragging || isSortableDragging}
                $labelColor={primaryLabelColor}
                $cardColor={card.color}
                $theme={theme}
                onClick={handleCardClick}
                data-card-container
                {...listeners}
                {...attributes}
            >
                {hasLabels && (
                    <LabelsRow>
                        {card.labels!.map((label) => (
                            <LabelBadge key={label.id} $color={label.color}>
                                {label.name}
                            </LabelBadge>
                        ))}
                    </LabelsRow>
                )}

                <ContentRow>
                    <TextContent>
                        <Title $theme={theme}>{displayText}</Title>
                        {descriptionPreview && (
                            <Description $theme={theme}>
                                <LinkedText text={descriptionPreview} metadata={card.urlMetadata} theme={theme} />
                            </Description>
                        )}
                    </TextContent>
                </ContentRow>

                {/* 画像サムネイル */}
                {hasImages && (
                    <ImageThumbnailRow>
                        {card.images!.slice(0, 3).map((img) => (
                            <ImageThumb key={img.id} src={img.dataUrl} alt='' />
                        ))}
                        {card.images!.length > 3 && <MoreImages $theme={theme}>+{card.images!.length - 3}</MoreImages>}
                    </ImageThumbnailRow>
                )}

                <MetadataRow>
                    {hasDueDate && (
                        <DueDateBadge $isOverdue={isOverdue} $isDueSoon={isDueSoon && !isOverdue}>
                            <CalendarIcon />
                            <span>
                                {new Date(card.dueDate!).toLocaleDateString('ja-JP', {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                        </DueDateBadge>
                    )}

                    {hasChecklist && (
                        <ChecklistBadge $allCompleted={completedItems === totalItems}>
                            <ListIcon />
                            <span>
                                {completedItems}/{totalItems}
                            </span>
                        </ChecklistBadge>
                    )}

                    {card.description && (
                        <DescriptionBadge $theme={theme} title='説明あり'>
                            <DocumentIcon />
                        </DescriptionBadge>
                    )}
                </MetadataRow>

                <DeleteButton onClick={handleDelete} $theme={theme} />
            </Container>

            {showModal && <CardDetailModal card={card} onClose={() => setShowModal(false)} />}
        </>
    )
}

const Container = styled.div<{ $isDragging?: boolean; $labelColor?: string; $cardColor?: string; $theme: Theme }>`
    position: relative;
    z-index: 0;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: ${(props) => props.$theme.cardBorderRadius};
    box-shadow: 0 1px 3px ${(props) => props.$theme.shadow};
    padding: 10px 12px;
    background: ${(props) => props.$cardColor || props.$theme.cardBackground};
    color: ${(props) => (props.$cardColor ? 'rgba(255, 255, 255, 0.95)' : props.$theme.text)};
    ${(props) => (props.$cardColor ? 'border-color: transparent;' : '')}
    cursor: pointer;
    opacity: ${(props) => (props.$isDragging ? 0.5 : 1)};
    touch-action: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition:
        box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        box-shadow: 0 6px 20px ${(props) => props.$theme.shadowHover};
        transform: translateY(-2px);
    }

    &:active {
        transform: translateY(0);
    }
`

const LabelsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`

const LabelBadge = styled.div<{ $color: string }>`
    padding: 4px 10px;
    border-radius: 4px;
    background: ${(props) => props.$color};
    color: ${color.White};
    font-size: 11px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    letter-spacing: 0.02em;
    min-width: 40px;
    text-align: center;
`

const ContentRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding-right: 20px;
`

const TextContent = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
`

const Title = styled.div<{ $theme: Theme }>`
    color: inherit;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.45;
    word-break: break-word;
    letter-spacing: -0.01em;
`

const Description = styled.div<{ $theme: Theme }>`
    color: inherit;
    opacity: 0.7;
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
    opacity: 0.85;
`

const ImageThumbnailRow = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`

const ImageThumb = styled.img`
    width: 40px;
    height: 28px;
    object-fit: cover;
    border-radius: 4px;
`

const MoreImages = styled.div<{ $theme: Theme }>`
    font-size: 11px;
    color: ${(props) => props.$theme.textSecondary};
    padding: 0 4px;
`

const MetadataRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: center;
`

const MetaBadge = `
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.02em;

    svg {
        width: 10px;
        height: 10px;
    }
`

const DueDateBadge = styled.div<{ $isOverdue?: boolean; $isDueSoon?: boolean }>`
    ${MetaBadge}
    background: ${(props) =>
        props.$isOverdue ? `${color.Red}20` : props.$isDueSoon ? '#FF9F1A20' : 'rgba(128, 128, 128, 0.12)'};
    color: ${(props) => (props.$isOverdue ? color.Red : props.$isDueSoon ? '#FF9F1A' : 'inherit')};
    opacity: ${(props) => (props.$isOverdue || props.$isDueSoon ? 1 : 0.6)};
`

const ChecklistBadge = styled.div<{ $allCompleted: boolean }>`
    ${MetaBadge}
    background: ${(props) => (props.$allCompleted ? `${color.Green}20` : 'rgba(128, 128, 128, 0.12)')};
    color: ${(props) => (props.$allCompleted ? color.Green : 'inherit')};
    opacity: ${(props) => (props.$allCompleted ? 1 : 0.6)};
`

const DescriptionBadge = styled.div<{ $theme: Theme }>`
    ${MetaBadge}
    background: rgba(128, 128, 128, 0.1);
    color: ${(props) => props.$theme.textSecondary};
    opacity: 0.6;
`

const DeleteButton = styled.button.attrs({
    type: 'button',
    children: <TrashIcon />,
})<{ $theme: Theme }>`
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 14px;
    color: inherit;
    background: transparent;
    border-radius: 6px;
    padding: 3px;
    opacity: 0;
    transition:
        opacity 0.15s,
        color 0.15s;

    ${Container}:hover & {
        opacity: 0.7;
    }

    :hover {
        color: ${color.Red};
        opacity: 1 !important;
    }
`
