import { useState } from 'react'
import styled from 'styled-components'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuidv4 } from 'uuid'
import * as color from './color'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'
import { CARD_COLORS } from './constants'
import { getDueDateStatus } from './utils/dateUtils'
import { getContrastTextColor, isLightColor } from './utils/colorUtils'
import { BaseModal } from './BaseModal'
import type { Card, ChecklistItem, Label } from './types'

interface CardDetailModalProps {
  card: Card
  onClose: () => void
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  isEditing: boolean
  editingText: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onEditTextChange: (text: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  theme: any
}

function SortableChecklistItem({
  item,
  isEditing,
  editingText,
  onToggle,
  onEdit,
  onDelete,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  theme
}: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <ChecklistItemRow ref={setNodeRef} style={style} $theme={theme}>
      <DragHandle $theme={theme} {...attributes} {...listeners}>
        ⋮⋮
      </DragHandle>

      {isEditing ? (
        <>
          <EditChecklistInput
            type="text"
            value={editingText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit()
              } else if (e.key === 'Escape') {
                onCancelEdit()
              }
            }}
            autoFocus
            $theme={theme}
          />
          <SmallButton onClick={onSaveEdit} title="保存" $theme={theme}>
            ✓
          </SmallButton>
          <SmallButton onClick={onCancelEdit} title="キャンセル" $theme={theme}>
            ✕
          </SmallButton>
        </>
      ) : (
        <>
          <Checkbox
            type="checkbox"
            checked={item.completed}
            onChange={onToggle}
          />
          <ChecklistItemText
            $completed={item.completed}
            $theme={theme}
            onDoubleClick={onEdit}
            title="ダブルクリックで編集"
          >
            {item.text}
          </ChecklistItemText>
          <SmallButton onClick={onEdit} title="編集" $theme={theme}>
            &#9998;
          </SmallButton>
          <DeleteItemButton onClick={onDelete} $theme={theme}>
            ×
          </DeleteItemButton>
        </>
      )}
    </ChecklistItemRow>
  )
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const { updateCard } = useKanbanStore()
  const { boards, currentBoardId } = useBoardStore()
  const { isDarkMode } = useThemeStore()

  const theme = getTheme(isDarkMode)
  const currentBoard = boards.find(b => b.id === currentBoardId)
  const boardLabels = currentBoard?.labels || []

  console.log('🔵 CardDetailModal opened - Card:', card.text, 'Card.labels:', card.labels, 'Board labels:', boardLabels)

  const [title, setTitle] = useState(card.title || card.text)
  const [description, setDescription] = useState(card.description || '')
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(card.labels || [])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || [])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
  )
  const [cardColor, setCardColor] = useState(card.color || '')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const progress = checklist.length > 0
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 0

  const handleSave = async () => {
    console.log('💾 Saving card with labels:', selectedLabels)
    await updateCard(card.id, {
      title,
      description,
      labels: selectedLabels,
      checklist,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      progress,
      color: cardColor
    })
    console.log('✅ Card saved successfully')
    onClose()
  }

  const toggleLabel = (label: Label) => {
    console.log('🏷️  Toggle label:', label.name, 'Current selected:', selectedLabels)
    const isSelected = selectedLabels.some(l => l.id === label.id)
    if (isSelected) {
      const newLabels = selectedLabels.filter(l => l.id !== label.id)
      console.log('➖ Removing label, new labels:', newLabels)
      setSelectedLabels(newLabels)
    } else {
      const newLabels = [...selectedLabels, label]
      console.log('➕ Adding label, new labels:', newLabels)
      setSelectedLabels(newLabels)
    }
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    const newItem: ChecklistItem = {
      id: uuidv4(),
      text: newChecklistItem,
      completed: false,
      order: checklist.length
    }
    setChecklist([...checklist, newItem])
    setNewChecklistItem('')
  }

  const toggleChecklistItem = (itemId: string) => {
    setChecklist(checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ))
  }

  const deleteChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter(item => item.id !== itemId))
  }

  const startEditChecklistItem = (item: ChecklistItem) => {
    setEditingChecklistItem(item.id)
    setEditingChecklistText(item.text)
  }

  const saveEditChecklistItem = () => {
    if (!editingChecklistItem || !editingChecklistText.trim()) return
    setChecklist(checklist.map(item =>
      item.id === editingChecklistItem
        ? { ...item, text: editingChecklistText }
        : item
    ))
    setEditingChecklistItem(null)
    setEditingChecklistText('')
  }

  const cancelEditChecklistItem = () => {
    setEditingChecklistItem(null)
    setEditingChecklistText('')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = checklist.findIndex(item => item.id === active.id)
    const newIndex = checklist.findIndex(item => item.id === over.id)

    const reordered = arrayMove(checklist, oldIndex, newIndex)
    const withUpdatedOrder = reordered.map((item, index) => ({
      ...item,
      order: index
    }))
    setChecklist(withUpdatedOrder)
  }

  const dueDateTimestamp = dueDate ? new Date(dueDate).getTime() : undefined
  const { isDueSoon, isOverdue } = getDueDateStatus(dueDateTimestamp)

  return (
    <BaseModal onClose={onClose} maxWidth="600px">
      <ModalContent $theme={theme}>
        <Header $color={cardColor} $theme={theme}>
          <TitleInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="カードのタイトル"
            $theme={theme}
          />
          <CloseButton onClick={onClose} $theme={theme} $cardColor={cardColor}>×</CloseButton>
        </Header>

        <Content $theme={theme}>
          {/* Labels Section */}
          <Section>
            <SectionTitle $theme={theme}>ラベル</SectionTitle>
            <LabelsContainer>
              {boardLabels.map(label => (
                <LabelTag
                  key={label.id}
                  $color={label.color}
                  $selected={selectedLabels.some(l => l.id === label.id)}
                  $isDarkMode={isDarkMode}
                  onClick={() => toggleLabel(label)}
                >
                  {label.name}
                </LabelTag>
              ))}
              {boardLabels.length === 0 && (
                <EmptyState $theme={theme}>ボードにラベルを追加してください</EmptyState>
              )}
            </LabelsContainer>
          </Section>

          {/* Due Date Section */}
          <Section>
            <SectionTitle $theme={theme}>期限</SectionTitle>
            <DueDateInput
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              $isOverdue={isOverdue}
              $isDueSoon={isDueSoon && !isOverdue}
              $theme={theme}
            />
            {isOverdue && <WarningText>期限切れです</WarningText>}
            {isDueSoon && !isOverdue && <WarningText $warning>まもなく期限です</WarningText>}
          </Section>

          {/* Card Color Section */}
          <Section>
            <SectionTitle $theme={theme}>カードの色</SectionTitle>
            <ColorPicker>
              <ColorOption
                $color=""
                $selected={!cardColor}
                $theme={theme}
                onClick={() => setCardColor('')}
                title="デフォルト"
              />
              {CARD_COLORS.map(c => (
                <ColorOption
                  key={c}
                  $color={c}
                  $selected={cardColor === c}
                  $theme={theme}
                  onClick={() => setCardColor(c)}
                />
              ))}
            </ColorPicker>
          </Section>

          {/* Description Section */}
          <Section>
            <SectionTitle $theme={theme}>説明</SectionTitle>
            <DescriptionTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細な説明を入力..."
              rows={4}
              $theme={theme}
            />
          </Section>

          {/* Checklist Section */}
          <Section>
            <SectionTitle $theme={theme}>
              チェックリスト
              {checklist.length > 0 && (
                <ProgressText> ({progress}% 完了)</ProgressText>
              )}
            </SectionTitle>

            {checklist.length > 0 && (
              <>
                <ProgressBar $theme={theme}>
                  <ProgressFill $progress={progress} />
                </ProgressBar>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={checklist.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ChecklistItems>
                      {checklist.map(item => (
                        <SortableChecklistItem
                          key={item.id}
                          item={item}
                          isEditing={editingChecklistItem === item.id}
                          editingText={editingChecklistText}
                          onToggle={() => toggleChecklistItem(item.id)}
                          onEdit={() => startEditChecklistItem(item)}
                          onDelete={() => deleteChecklistItem(item.id)}
                          onEditTextChange={setEditingChecklistText}
                          onSaveEdit={saveEditChecklistItem}
                          onCancelEdit={cancelEditChecklistItem}
                          theme={theme}
                        />
                      ))}
                    </ChecklistItems>
                  </SortableContext>
                </DndContext>
              </>
            )}

            <AddChecklistItemRow>
              <ChecklistInput
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                placeholder="新しい項目を追加..."
                $theme={theme}
              />
              <AddButton onClick={addChecklistItem}>追加</AddButton>
            </AddChecklistItemRow>
          </Section>
        </Content>

        <Footer $theme={theme}>
          <SaveButton onClick={handleSave}>保存</SaveButton>
          <CancelButton onClick={onClose} $theme={theme}>キャンセル</CancelButton>
        </Footer>
      </ModalContent>
    </BaseModal>
  )
}

const ModalContent = styled.div<{ $theme: any }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`

const Header = styled.div<{ $color?: string; $theme: any }>`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.$theme.border};
  background-color: ${props => props.$color || props.$theme.surface};
  border-radius: 8px 8px 0 0;
  gap: 12px;
  flex-shrink: 0;
`

const TitleInput = styled.input<{ $theme: any }>`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 20px;
  font-weight: 600;
  color: ${props => props.$theme.text};
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }

  &:focus {
    outline: 2px solid ${color.Blue};
    background-color: ${props => props.$theme.inputBackground};
  }
`

const CloseButton = styled.button<{ $theme: any; $cardColor?: string }>`
  border: none;
  background: ${props => props.$cardColor ? 'rgba(0, 0, 0, 0.1)' : 'none'};
  font-size: 28px;
  color: ${props => {
    if (props.$cardColor) {
      return getContrastTextColor(props.$cardColor)
    }
    return props.$theme.textSecondary
  }};
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: ${props => {
      if (props.$cardColor) {
        return isLightColor(props.$cardColor) ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.2)'
      }
      return props.$theme.surfaceHover
    }};
    color: ${props => {
      if (props.$cardColor) {
        return getContrastTextColor(props.$cardColor)
      }
      return props.$theme.text
    }};
  }
`

const Content = styled.div<{ $theme: any }>`
  padding: 20px;
  flex: 1;
  min-height: 0;
  background-color: ${props => props.$theme.surface};
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3<{ $theme: any }>`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$theme.text};
  display: flex;
  align-items: center;
`

const ProgressText = styled.span`
  margin-left: 8px;
  font-size: 12px;
  color: ${color.Gray};
  font-weight: normal;
`

const LabelsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const LabelTag = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
  padding: 6px 12px;
  border-radius: 4px;
  border: 2px solid ${props => {
    if (!props.$selected) return 'transparent'
    return props.$isDarkMode ? color.White : color.Black
  }};
  background-color: ${props => props.$color};
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: border-color 0.2s, transform 0.1s;

  &:hover {
    opacity: 0.9;
    transform: scale(1.02);
  }
`

const EmptyState = styled.div<{ $theme: any }>`
  color: ${props => props.$theme.textSecondary};
  font-size: 13px;
  font-style: italic;
`

const DueDateInput = styled.input<{ $isOverdue?: boolean; $isDueSoon?: boolean; $theme: any }>`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props =>
    props.$isOverdue ? color.Red :
    props.$isDueSoon ? '#FF9F1A' :
    props.$theme.border
  };
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props =>
    props.$isOverdue ? '#FFE5E5' :
    props.$isDueSoon ? '#FFF4E5' :
    props.$theme.inputBackground
  };

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
  }
`

const WarningText = styled.div<{ $warning?: boolean }>`
  margin-top: 4px;
  font-size: 12px;
  color: ${props => props.$warning ? '#FF9F1A' : color.Red};
  font-weight: 600;
`

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $theme: any }>`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 3px solid ${props => props.$selected ? props.$theme.text : props.$theme.border};
  background-color: ${props => props.$color || props.$theme.surface};
  cursor: pointer;
  transition: transform 0.1s;

  &:hover {
    transform: scale(1.1);
  }
`

const DescriptionTextArea = styled.textarea<{ $theme: any }>`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }
`

const ProgressBar = styled.div<{ $theme?: any }>`
  width: 100%;
  height: 8px;
  background-color: ${props => props.$theme?.border || color.LightSilver};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
`

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${props => props.$progress}%;
  background-color: ${props => props.$progress === 100 ? color.Green : color.Blue};
  transition: width 0.3s, background-color 0.3s;
`

const ChecklistItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`

const ChecklistItemRow = styled.div<{ $theme?: any }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  background-color: ${props => props.$theme?.surfaceHover || color.LightSilver};

  &:hover {
    background-color: ${props => props.$theme?.border || '#E0E0E0'};
  }
`

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
`

const ChecklistItemText = styled.span<{ $completed: boolean; $theme?: any }>`
  flex: 1;
  font-size: 14px;
  color: ${props => props.$theme?.text || color.Black};
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
  opacity: ${props => props.$completed ? 0.6 : 1};
  cursor: pointer;
  user-select: none;
`

const DragHandle = styled.div<{ $theme?: any }>`
  cursor: grab;
  color: ${props => props.$theme?.textSecondary || color.Gray};
  font-size: 14px;
  padding: 0 4px;
  flex-shrink: 0;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    color: ${props => props.$theme?.text || color.Black};
  }
`

const EditChecklistInput = styled.input<{ $theme: any }>`
  flex: 1;
  padding: 6px 8px;
  border: 1px solid ${color.Blue};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};
  outline: 2px solid ${color.Blue};
  outline-offset: 2px;
`

const SmallButton = styled.button<{ $theme: any }>`
  border: none;
  background: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid ${props => props.$theme.border};

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }
`

const DeleteItemButton = styled.button<{ $theme?: any }>`
  border: none;
  background: none;
  color: ${props => props.$theme?.textSecondary || color.Gray};
  font-size: 20px;
  cursor: pointer;
  padding: 0 4px;
  flex-shrink: 0;

  &:hover {
    color: ${color.Red};
  }
`

const AddChecklistItemRow = styled.div`
  display: flex;
  gap: 8px;
`

const ChecklistInput = styled.input<{ $theme: any }>`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }
`

const AddButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: #026AA7;
  }
`

const Footer = styled.div<{ $theme: any }>`
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid ${props => props.$theme.border};
  background-color: ${props => props.$theme.surface};
  flex-shrink: 0;
`

const SaveButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #026AA7;
  }
`

const CancelButton = styled.button<{ $theme: any }>`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }
`
