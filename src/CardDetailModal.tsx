import { useState, useCallback } from 'react'
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
import {
  PrimaryButton,
  SecondaryButton,
  IconButton,
  SmallPrimaryButton
} from './Button'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { CARD_COLORS } from './constants'
import { getDueDateStatus } from './utils/dateUtils'
import { getContrastTextColor, isLightColor } from './utils/colorUtils'
import { BaseModal } from './BaseModal'
import { LinkedText } from './LinkedText'
import { useUrlMetadata } from './hooks/useUrlMetadata'
import type { Card, ChecklistItem, Label, UrlMetadata } from './types'

interface CardDetailModalProps {
  card: Card
  onClose: () => void
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  isEditing: boolean
  editingText: string
  isConverting: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onConvertToCard: (e: React.MouseEvent) => void
  onEditTextChange: (text: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  theme: Theme
  metadata?: UrlMetadata[]
}

function SortableChecklistItem({
  item,
  isEditing,
  editingText,
  isConverting,
  onToggle,
  onEdit,
  onDelete,
  onConvertToCard,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  theme,
  metadata
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
            <LinkedText text={item.text} metadata={metadata} theme={theme} />
          </ChecklistItemText>
          <SmallButton onClick={onEdit} title="編集" $theme={theme}>
            &#9998;
          </SmallButton>
          <ConvertToCardButton
            onClick={onConvertToCard}
            title="カードに変換"
            $theme={theme}
            disabled={isConverting}
          >
            {isConverting ? '...' : '↗'}
          </ConvertToCardButton>
          <DeleteItemButton onClick={onDelete} $theme={theme}>
            ×
          </DeleteItemButton>
        </>
      )}
    </ChecklistItemRow>
  )
}

export function CardDetailModal({ card, onClose }: CardDetailModalProps) {
  const { updateCard, addCard } = useKanbanStore()
  const { boards, currentBoardId } = useBoardStore()
  const { isDarkMode } = useThemeStore()

  const theme = getTheme(isDarkMode)
  const currentBoard = boards.find(b => b.id === currentBoardId)
  const boardLabels = currentBoard?.labels || []

  const [title, setTitle] = useState(card.title || card.text)
  const [description, setDescription] = useState(card.description || '')
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(card.labels || [])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || [])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null)
  const [editingChecklistText, setEditingChecklistText] = useState('')
  const [convertingItemId, setConvertingItemId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''
  )
  const [cardColor, setCardColor] = useState(card.color || '')
  const [editingDescription, setEditingDescription] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  // URLメタデータの取得
  const allText = description + ' ' + checklist.map(item => item.text).join(' ')

  const onMetadataUpdate = useCallback((newMetadata: import('./types').UrlMetadata[]) => {
    updateCard(card.id, { urlMetadata: newMetadata })
  }, [card.id, updateCard])

  const { metadata } = useUrlMetadata(
    allText,
    card.urlMetadata,
    onMetadataUpdate
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
      // 日付が空の場合はnullを設定して削除を明示
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
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

  const convertChecklistItemToCard = async (e: React.MouseEvent, item: ChecklistItem) => {
    e.stopPropagation()
    e.preventDefault()

    // 処理中なら何もしない
    if (convertingItemId) return

    setConvertingItemId(item.id)
    try {
      // 新しいカードを作成（元のカードと同じカラム・ボードに）
      await addCard(item.text, card.columnId, card.boardId)
      // 元のチェックリストアイテムを削除
      setChecklist(checklist.filter(i => i.id !== item.id))
    } catch (error) {
      console.error('Failed to convert checklist item to card:', error)
      alert('カードへの変換に失敗しました。')
    } finally {
      setConvertingItemId(null)
    }
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
              $isDarkMode={isDarkMode}
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
            {!editingDescription && description ? (
              <DescriptionDisplay
                $theme={theme}
                onClick={() => setEditingDescription(true)}
                title="クリックして編集"
              >
                <LinkedText text={description} metadata={metadata} theme={theme} />
              </DescriptionDisplay>
            ) : (
              <DescriptionTextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setEditingDescription(false)}
                placeholder="詳細な説明を入力..."
                rows={4}
                $theme={theme}
                autoFocus={editingDescription}
              />
            )}
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
                          isConverting={convertingItemId === item.id}
                          onToggle={() => toggleChecklistItem(item.id)}
                          onEdit={() => startEditChecklistItem(item)}
                          onDelete={() => deleteChecklistItem(item.id)}
                          onConvertToCard={(e) => convertChecklistItemToCard(e, item)}
                          onEditTextChange={setEditingChecklistText}
                          onSaveEdit={saveEditChecklistItem}
                          onCancelEdit={cancelEditChecklistItem}
                          theme={theme}
                          metadata={metadata}
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

        <DateFooter $theme={theme}>
          <DateItem>
            <DateLabel $theme={theme}>作成</DateLabel>
            <DateValue $theme={theme}>{new Date(card.createdAt).toLocaleString('ja-JP')}</DateValue>
          </DateItem>
          <DateItem>
            <DateLabel $theme={theme}>更新</DateLabel>
            <DateValue $theme={theme}>{new Date(card.updatedAt).toLocaleString('ja-JP')}</DateValue>
          </DateItem>
        </DateFooter>

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
  overflow: hidden;
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
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
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

const DueDateInput = styled.input<{ $isOverdue?: boolean; $isDueSoon?: boolean; $theme: Theme; $isDarkMode?: boolean }>`
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
  background-color: ${props => {
    const overdueColors = { light: '#FFE5E5', dark: '#4A2020' }
    const dueSoonColors = { light: '#FFF4E5', dark: '#4A3A20' }

    if (props.$isOverdue) {
      return props.$isDarkMode ? overdueColors.dark : overdueColors.light
    }
    if (props.$isDueSoon) {
      return props.$isDarkMode ? dueSoonColors.dark : dueSoonColors.light
    }
    return props.$theme.inputBackground
  }};
  color-scheme: ${props => props.$isDarkMode ? 'dark' : 'light'};

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

const DescriptionDisplay = styled.div<{ $theme: any }>`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};
  min-height: 80px;
  cursor: text;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;

  &:hover {
    border-color: ${props => props.$theme.border};
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

// アイコン用ボタン（チェックリストの編集・保存・キャンセル）
const SmallButton = styled(IconButton)``

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

const ConvertToCardButton = styled.button<{ $theme?: Theme }>`
  border: 1px solid transparent;
  background: ${props => props.$theme?.surface || 'rgba(0, 0, 0, 0.03)'};
  color: ${props => props.$theme?.textSecondary || color.Gray};
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  flex-shrink: 0;
  border-radius: 4px;
  transition: all 0.2s;
  min-width: 28px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    color: ${color.Blue};
    background-color: ${props => props.$theme?.surfaceHover || 'rgba(0, 121, 191, 0.1)'};
    border-color: ${color.Blue};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

const AddButton = styled(SmallPrimaryButton)``

const DateFooter = styled.div<{ $theme: any }>`
  display: flex;
  gap: 16px;
  padding: 8px 20px;
  border-top: 1px solid ${props => props.$theme.border};
  background-color: ${props => props.$theme.surfaceHover};
  flex-shrink: 0;
`

const DateItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const DateLabel = styled.span<{ $theme: any }>`
  font-size: 11px;
  font-weight: 600;
  color: ${props => props.$theme.textSecondary};
`

const DateValue = styled.span<{ $theme: any }>`
  font-size: 11px;
  color: ${props => props.$theme.textSecondary};
`

const Footer = styled.div<{ $theme: any }>`
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid ${props => props.$theme.border};
  background-color: ${props => props.$theme.surface};
  flex-shrink: 0;
`

const SaveButton = styled(PrimaryButton)`
  flex: 1;
  padding: 10px 16px;
`

const CancelButton = styled(SecondaryButton)`
  flex: 1;
  padding: 10px 16px;
`
