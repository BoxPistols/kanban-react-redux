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
import * as color from './color'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
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
  onCancelEdit
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
    <ChecklistItemRow ref={setNodeRef} style={style}>
      <DragHandle {...attributes} {...listeners}>
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
          />
          <SmallButton onClick={onSaveEdit} title="保存">
            ✓
          </SmallButton>
          <SmallButton onClick={onCancelEdit} title="キャンセル">
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
            onDoubleClick={onEdit}
            title="ダブルクリックで編集"
          >
            {item.text}
          </ChecklistItemText>
          <SmallButton onClick={onEdit} title="編集">
            ✏️
          </SmallButton>
          <DeleteItemButton onClick={onDelete}>
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

  const currentBoard = boards.find(b => b.id === currentBoardId)
  const boardLabels = currentBoard?.labels || []

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
    await updateCard(card.id, {
      title,
      description,
      labels: selectedLabels,
      checklist,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      progress,
      color: cardColor
    })
    onClose()
  }

  const toggleLabel = (label: Label) => {
    const isSelected = selectedLabels.some(l => l.id === label.id)
    if (isSelected) {
      setSelectedLabels(selectedLabels.filter(l => l.id !== label.id))
    } else {
      setSelectedLabels([...selectedLabels, label])
    }
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    const newItem: ChecklistItem = {
      id: `checklist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  const isDueSoon = !!(dueDate && new Date(dueDate).getTime() < Date.now() + 86400000) // 24 hours
  const isOverdue = !!(dueDate && new Date(dueDate).getTime() < Date.now())

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header $color={cardColor}>
          <TitleInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="カードのタイトル"
          />
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          {/* Labels Section */}
          <Section>
            <SectionTitle>ラベル</SectionTitle>
            <LabelsContainer>
              {boardLabels.map(label => (
                <LabelTag
                  key={label.id}
                  $color={label.color}
                  $selected={selectedLabels.some(l => l.id === label.id)}
                  onClick={() => toggleLabel(label)}
                >
                  {label.name}
                </LabelTag>
              ))}
              {boardLabels.length === 0 && (
                <EmptyState>ボードにラベルを追加してください</EmptyState>
              )}
            </LabelsContainer>
          </Section>

          {/* Due Date Section */}
          <Section>
            <SectionTitle>期限</SectionTitle>
            <DueDateInput
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              $isOverdue={isOverdue}
              $isDueSoon={isDueSoon && !isOverdue}
            />
            {isOverdue && <WarningText>期限切れです</WarningText>}
            {isDueSoon && !isOverdue && <WarningText $warning>まもなく期限です</WarningText>}
          </Section>

          {/* Card Color Section */}
          <Section>
            <SectionTitle>カードの色</SectionTitle>
            <ColorPicker>
              <ColorOption
                $color=""
                $selected={!cardColor}
                onClick={() => setCardColor('')}
                title="デフォルト"
              />
              {['#FFEAA7', '#81ECEC', '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7'].map(c => (
                <ColorOption
                  key={c}
                  $color={c}
                  $selected={cardColor === c}
                  onClick={() => setCardColor(c)}
                />
              ))}
            </ColorPicker>
          </Section>

          {/* Description Section */}
          <Section>
            <SectionTitle>説明</SectionTitle>
            <DescriptionTextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="詳細な説明を入力..."
              rows={4}
            />
          </Section>

          {/* Checklist Section */}
          <Section>
            <SectionTitle>
              チェックリスト
              {checklist.length > 0 && (
                <ProgressText> ({progress}% 完了)</ProgressText>
              )}
            </SectionTitle>

            {checklist.length > 0 && (
              <>
                <ProgressBar>
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
              />
              <AddButton onClick={addChecklistItem}>追加</AddButton>
            </AddChecklistItemRow>
          </Section>
        </Content>

        <Footer>
          <SaveButton onClick={handleSave}>保存</SaveButton>
          <CancelButton onClick={onClose}>キャンセル</CancelButton>
        </Footer>
      </Modal>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  overflow-y: auto;
`

const Modal = styled.div`
  background-color: ${color.White};
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin: auto;
`

const Header = styled.div<{ $color?: string }>`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid ${color.Silver};
  background-color: ${props => props.$color || 'transparent'};
  border-radius: 8px 8px 0 0;
  gap: 12px;
`

const TitleInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 20px;
  font-weight: 600;
  color: ${color.Black};
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline: 2px solid ${color.Blue};
    background-color: ${color.White};
  }
`

const CloseButton = styled.button`
  border: none;
  background: none;
  font-size: 28px;
  color: ${color.Gray};
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    background-color: ${color.LightSilver};
    color: ${color.Black};
  }
`

const Content = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${color.Black};
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

const LabelTag = styled.button<{ $color: string; $selected: boolean }>`
  padding: 6px 12px;
  border-radius: 4px;
  border: 2px solid ${props => props.$selected ? color.Black : 'transparent'};
  background-color: ${props => props.$color};
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  &:hover {
    opacity: 0.8;
  }
`

const EmptyState = styled.div`
  color: ${color.Gray};
  font-size: 13px;
  font-style: italic;
`

const DueDateInput = styled.input<{ $isOverdue?: boolean; $isDueSoon?: boolean }>`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${props =>
    props.$isOverdue ? color.Red :
    props.$isDueSoon ? '#FF9F1A' :
    color.Silver
  };
  border-radius: 4px;
  font-size: 14px;
  background-color: ${props =>
    props.$isOverdue ? '#FFE5E5' :
    props.$isDueSoon ? '#FFF4E5' :
    color.White
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

const ColorOption = styled.button<{ $color: string; $selected: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 3px solid ${props => props.$selected ? color.Black : color.Silver};
  background-color: ${props => props.$color || color.White};
  cursor: pointer;
  transition: transform 0.1s;

  &:hover {
    transform: scale(1.1);
  }
`

const DescriptionTextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  font-size: 14px;
  color: ${color.Black};
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }
`

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${color.LightSilver};
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

const ChecklistItemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  background-color: ${color.LightSilver};

  &:hover {
    background-color: #E0E0E0;
  }
`

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
`

const ChecklistItemText = styled.span<{ $completed: boolean }>`
  flex: 1;
  font-size: 14px;
  color: ${color.Black};
  text-decoration: ${props => props.$completed ? 'line-through' : 'none'};
  opacity: ${props => props.$completed ? 0.6 : 1};
  cursor: pointer;
  user-select: none;
`

const DragHandle = styled.div`
  cursor: grab;
  color: ${color.Gray};
  font-size: 14px;
  padding: 0 4px;
  flex-shrink: 0;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    color: ${color.Black};
  }
`

const EditChecklistInput = styled.input`
  flex: 1;
  padding: 6px 8px;
  border: 1px solid ${color.Blue};
  border-radius: 4px;
  font-size: 14px;
  outline: 2px solid ${color.Blue};
  outline-offset: 2px;
`

const SmallButton = styled.button`
  border: none;
  background: ${color.LightSilver};
  color: ${color.Black};
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;

  &:hover {
    background-color: ${color.Silver};
  }
`

const DeleteItemButton = styled.button`
  border: none;
  background: none;
  color: ${color.Gray};
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

const ChecklistInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  font-size: 14px;

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

const Footer = styled.div`
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid ${color.Silver};
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

const CancelButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Black};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.LightSilver};
  }
`
