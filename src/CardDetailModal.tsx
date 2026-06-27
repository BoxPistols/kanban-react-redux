import { useState, useCallback, useRef, memo } from 'react'
import styled from 'styled-components'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuidv4 } from 'uuid'
import * as color from './color'
import { PrimaryButton, SecondaryButton, IconButton, SmallPrimaryButton } from './Button'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { CARD_COLOR_LABELS } from './constants'
import { getDueDateStatus } from './utils/dateUtils'
import { BaseModal } from './BaseModal'
import { LinkedText } from './LinkedText'
import { useUrlMetadata } from './hooks/useUrlMetadata'
import type { Card, ChecklistItem, Label, UrlMetadata, ImageAttachment } from './types'

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
    metadata,
}: SortableChecklistItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <ChecklistItemRow ref={setNodeRef} style={style} $theme={theme}>
            <DragHandle $theme={theme} {...attributes} {...listeners}>
                ⋮⋮
            </DragHandle>

            {isEditing ? (
                <>
                    <EditChecklistInput
                        type='text'
                        value={editingText}
                        onChange={(e) => onEditTextChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSaveEdit()
                            } else if (e.key === 'Escape') {
                                onCancelEdit()
                            }
                        }}
                        autoFocus
                        $theme={theme}
                    />
                    <SmallButton onClick={onSaveEdit} title='保存' $theme={theme} aria-label='チェックリスト項目を保存'>
                        ✓
                    </SmallButton>
                    <SmallButton
                        onClick={onCancelEdit}
                        title='キャンセル'
                        $theme={theme}
                        aria-label='チェックリスト項目の編集をキャンセル'
                    >
                        ✕
                    </SmallButton>
                </>
            ) : (
                <>
                    <Checkbox type='checkbox' checked={item.completed} onChange={onToggle} />
                    <ChecklistItemText
                        $completed={item.completed}
                        $theme={theme}
                        onDoubleClick={onEdit}
                        title='ダブルクリックで編集'
                    >
                        <LinkedText text={item.text} metadata={metadata} theme={theme} />
                    </ChecklistItemText>
                    <SmallButton onClick={onEdit} title='編集' $theme={theme} aria-label='チェックリスト項目を編集'>
                        &#9998;
                    </SmallButton>
                    <ConvertToCardButton
                        onClick={onConvertToCard}
                        title='カードに変換'
                        $theme={theme}
                        disabled={isConverting}
                        aria-label='チェックリスト項目をカードに変換'
                    >
                        {isConverting ? '...' : '↗'}
                    </ConvertToCardButton>
                    <DeleteItemButton onClick={onDelete} $theme={theme} aria-label='チェックリスト項目を削除'>
                        ×
                    </DeleteItemButton>
                </>
            )}
        </ChecklistItemRow>
    )
}

export const CardDetailModal = memo(function CardDetailModal({ card, onClose }: CardDetailModalProps) {
    const { updateCard, addCard } = useKanbanStore()
    const { boards, currentBoardId } = useBoardStore()
    const { isDarkMode } = useThemeStore()

    const theme = getTheme(isDarkMode)
    const currentBoard = boards.find((b) => b.id === currentBoardId)
    const boardLabels = currentBoard?.labels || []

    const [title, setTitle] = useState(card.title || card.text)
    const [description, setDescription] = useState(card.description || '')
    const [selectedLabels, setSelectedLabels] = useState<Label[]>(card.labels || [])
    const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || [])
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null)
    const [editingChecklistText, setEditingChecklistText] = useState('')
    const [convertingItemId, setConvertingItemId] = useState<string | null>(null)
    const [dueDate, setDueDate] = useState(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '')
    const [cardColor, setCardColor] = useState(card.color || '')
    const [editingDescription, setEditingDescription] = useState(false)
    const [images, setImages] = useState<ImageAttachment[]>(card.images || [])
    const descriptionRef = useRef<HTMLTextAreaElement>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // URLメタデータの取得
    const allText = description + ' ' + checklist.map((item) => item.text).join(' ')

    const onMetadataUpdate = useCallback(
        (newMetadata: import('./types').UrlMetadata[]) => {
            updateCard(card.id, { urlMetadata: newMetadata })
        },
        [card.id, updateCard]
    )

    const { metadata } = useUrlMetadata(allText, card.urlMetadata, onMetadataUpdate)

    const progress =
        checklist.length > 0
            ? Math.round((checklist.filter((item) => item.completed).length / checklist.length) * 100)
            : 0

    // 画像ペースト処理
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            const item = items[i]
            if (item.type.startsWith('image/')) {
                e.preventDefault()
                const file = item.getAsFile()
                if (!file) continue

                // 5MB制限
                if (file.size > 5 * 1024 * 1024) {
                    alert('画像サイズは5MB以下にしてください')
                    return
                }

                const reader = new FileReader()
                reader.onload = (event) => {
                    const dataUrl = event.target?.result as string
                    if (dataUrl) {
                        const newImage: ImageAttachment = {
                            id: uuidv4(),
                            dataUrl,
                            name: file.name || `image-${Date.now()}`,
                            createdAt: Date.now(),
                        }
                        setImages((prev) => [...prev, newImage])
                    }
                }
                reader.readAsDataURL(file)
                break
            }
        }
    }, [])

    const handleRemoveImage = useCallback((imageId: string) => {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
    }, [])

    const handleSave = useCallback(async () => {
        await updateCard(card.id, {
            title,
            description,
            labels: selectedLabels,
            checklist,
            // 日付が空の場合はnullを設定して削除を明示
            dueDate: dueDate ? new Date(dueDate).getTime() : null,
            progress,
            color: cardColor,
            images: images.length > 0 ? images : undefined,
        })
        onClose()
    }, [
        updateCard,
        card.id,
        title,
        description,
        selectedLabels,
        checklist,
        dueDate,
        progress,
        cardColor,
        images,
        onClose,
    ])

    const toggleLabel = useCallback(
        (label: Label) => {
            const isSelected = selectedLabels.some((l) => l.id === label.id)
            if (isSelected) {
                setSelectedLabels(selectedLabels.filter((l) => l.id !== label.id))
            } else {
                setSelectedLabels([...selectedLabels, label])
            }
        },
        [selectedLabels]
    )

    const addChecklistItem = useCallback(() => {
        if (!newChecklistItem.trim()) return
        const newItem: ChecklistItem = {
            id: uuidv4(),
            text: newChecklistItem,
            completed: false,
            order: 0, // 一時的な値、関数内更新で正確な値を設定
        }
        // 関数型更新でchecklist依存を除去
        setChecklist((prev) => [...prev, { ...newItem, order: prev.length }])
        setNewChecklistItem('')
    }, [newChecklistItem, setChecklist, setNewChecklistItem])

    const toggleChecklistItem = useCallback(
        (itemId: string) => {
            // 関数型更新でchecklist依存を除去
            setChecklist((prev) =>
                prev.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item))
            )
        },
        [setChecklist]
    )

    const deleteChecklistItem = useCallback(
        (itemId: string) => {
            // 関数型更新でchecklist依存を除去
            setChecklist((prev) => prev.filter((item) => item.id !== itemId))
        },
        [setChecklist]
    )

    const convertChecklistItemToCard = useCallback(
        async (e: React.MouseEvent, item: ChecklistItem) => {
            e.stopPropagation()
            e.preventDefault()

            // 処理中なら何もしない
            if (convertingItemId) return

            setConvertingItemId(item.id)
            try {
                // 新しいカードを作成（元のカードと同じカラム・ボードに）
                await addCard(item.text, card.columnId, card.boardId)
                // 元のチェックリストアイテムを削除（関数型更新）
                setChecklist((prev) => prev.filter((i) => i.id !== item.id))
            } catch (error) {
                alert('カードへの変換に失敗しました。')
            } finally {
                setConvertingItemId(null)
            }
        },
        [convertingItemId, addCard, card.columnId, card.boardId]
    )

    const startEditChecklistItem = useCallback(
        (item: ChecklistItem) => {
            setEditingChecklistItem(item.id)
            setEditingChecklistText(item.text)
        },
        [setEditingChecklistItem, setEditingChecklistText]
    )

    const saveEditChecklistItem = useCallback(() => {
        if (!editingChecklistItem || !editingChecklistText.trim()) return
        // 関数型更新でchecklist依存を除去
        setChecklist((prev) =>
            prev.map((item) => (item.id === editingChecklistItem ? { ...item, text: editingChecklistText } : item))
        )
        setEditingChecklistItem(null)
        setEditingChecklistText('')
    }, [editingChecklistItem, editingChecklistText, setChecklist, setEditingChecklistItem, setEditingChecklistText])

    const cancelEditChecklistItem = useCallback(() => {
        setEditingChecklistItem(null)
        setEditingChecklistText('')
    }, [setEditingChecklistItem, setEditingChecklistText])

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return

            // 関数型更新でchecklist依存を除去
            setChecklist((prev) => {
                const oldIndex = prev.findIndex((item) => item.id === active.id)
                const newIndex = prev.findIndex((item) => item.id === over.id)

                const reordered = arrayMove(prev, oldIndex, newIndex)
                const withUpdatedOrder = reordered.map((item, index) => ({
                    ...item,
                    order: index,
                }))
                return withUpdatedOrder
            })
        },
        [setChecklist]
    )

    const dueDateTimestamp = dueDate ? new Date(dueDate).getTime() : undefined
    const { isDueSoon, isOverdue } = getDueDateStatus(dueDateTimestamp)

    return (
        <BaseModal onClose={onClose} maxWidth='600px'>
            <ModalContent $theme={theme}>
                <ModalHeader $color={cardColor} $theme={theme}>
                    <TitleInput
                        id='modal-title'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder='カードのタイトル'
                        $theme={theme}
                        aria-label='カードタイトル'
                    />
                    <CloseButton onClick={onClose} $theme={theme} aria-label='閉じる'>
                        ×
                    </CloseButton>
                </ModalHeader>

                <Content $theme={theme}>
                    {/* Labels Section */}
                    <Section>
                        <SectionTitle $theme={theme}>ラベル</SectionTitle>
                        <LabelsContainer>
                            {boardLabels.map((label) => {
                                const isSelected = selectedLabels.some((l) => l.id === label.id)
                                return (
                                    <LabelTag
                                        key={label.id}
                                        $color={label.color}
                                        $selected={isSelected}
                                        $isDarkMode={isDarkMode}
                                        onClick={() => toggleLabel(label)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                toggleLabel(label)
                                            }
                                        }}
                                        role='checkbox'
                                        aria-checked={isSelected}
                                        tabIndex={0}
                                    >
                                        {label.name}
                                    </LabelTag>
                                )
                            })}
                            {boardLabels.length === 0 && (
                                <EmptyHint $theme={theme}>ボード編集からラベルを追加できます</EmptyHint>
                            )}
                        </LabelsContainer>
                    </Section>

                    {/* Due Date Section */}
                    <Section>
                        <SectionTitle $theme={theme}>期限</SectionTitle>
                        <DueDateInput
                            type='date'
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
                                $color=''
                                $selected={!cardColor}
                                $theme={theme}
                                onClick={() => setCardColor('')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setCardColor('')
                                    }
                                }}
                                role='radio'
                                aria-checked={!cardColor}
                                tabIndex={0}
                                title='デフォルト'
                                aria-label='デフォルト色'
                            />
                            {CARD_COLOR_LABELS.map((label) => (
                                <ColorOption
                                    key={label.color}
                                    $color={label.color}
                                    $selected={cardColor === label.color}
                                    $theme={theme}
                                    onClick={() => setCardColor(label.color)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            setCardColor(label.color)
                                        }
                                    }}
                                    role='radio'
                                    aria-checked={cardColor === label.color}
                                    tabIndex={0}
                                    title={`${label.name} - ${label.description}`}
                                    aria-label={`${label.name} - ${label.description}`}
                                />
                            ))}
                        </ColorPicker>
                    </Section>

                    {/* Description Section with Image Paste */}
                    <Section>
                        <SectionTitle $theme={theme}>説明</SectionTitle>
                        {!editingDescription && description ? (
                            <DescriptionDisplay
                                $theme={theme}
                                onClick={() => setEditingDescription(true)}
                                title='クリックして編集'
                            >
                                <LinkedText text={description} metadata={metadata} theme={theme} />
                            </DescriptionDisplay>
                        ) : (
                            <DescriptionTextArea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => setEditingDescription(false)}
                                onPaste={handlePaste}
                                placeholder='詳細な説明を入力... (画像の貼り付けも可能)'
                                rows={4}
                                $theme={theme}
                                autoFocus={editingDescription}
                            />
                        )}

                        {/* 貼り付け画像の表示 */}
                        {images.length > 0 && (
                            <ImageGallery>
                                {images.map((img, index) => (
                                    <ImageContainer key={img.id}>
                                        <ImagePreview
                                            src={img.dataUrl}
                                            alt={img.name || '画像'}
                                            loading={index > 2 ? 'lazy' : 'eager'}
                                        />
                                        <ImageRemoveButton
                                            onClick={() => handleRemoveImage(img.id)}
                                            title='画像を削除'
                                            aria-label={`画像「${img.name || '画像'}」を削除`}
                                        >
                                            ×
                                        </ImageRemoveButton>
                                    </ImageContainer>
                                ))}
                            </ImageGallery>
                        )}
                        <PasteHint $theme={theme}>Ctrl+V / Cmd+V で画像を貼り付けできます</PasteHint>
                    </Section>

                    {/* Checklist Section */}
                    <Section>
                        <SectionTitle $theme={theme}>
                            チェックリスト
                            {checklist.length > 0 && <ProgressText> ({progress}% 完了)</ProgressText>}
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
                                        items={checklist.map((item) => item.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <ChecklistItems>
                                            {checklist.map((item) => (
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
                                type='text'
                                value={newChecklistItem}
                                onChange={(e) => setNewChecklistItem(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                                placeholder='新しい項目を追加...'
                                $theme={theme}
                            />
                            <AddChecklistButton onClick={addChecklistItem} aria-label='チェックリスト項目を追加'>
                                追加
                            </AddChecklistButton>
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
                    <SaveButton onClick={handleSave} aria-label='保存'>
                        保存
                    </SaveButton>
                    <CancelButton onClick={onClose} $theme={theme} aria-label='キャンセル'>
                        キャンセル
                    </CancelButton>
                </Footer>
            </ModalContent>
        </BaseModal>
    )
}) // memo

const ModalContent = styled.div<{ $theme: Theme }>`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    flex: 1;
    overflow: hidden;
`

const ModalHeader = styled.div<{ $color?: string; $theme: Theme }>`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 24px 16px;
    background-color: ${(props) => props.$theme.surface};
    border-radius: 12px 12px 0 0;
    gap: 12px;
    flex-shrink: 0;
`

const TitleInput = styled.input<{ $theme: Theme }>`
    flex: 1;
    border: none;
    background: transparent;
    font-size: 22px;
    font-weight: 700;
    color: ${(props) => props.$theme.text};
    padding: 2px 4px;
    border-radius: 4px;
    letter-spacing: -0.02em;

    &:hover {
        background-color: ${(props) => props.$theme.surfaceHover};
    }

    &:focus {
        outline: none;
        background-color: ${(props) => props.$theme.inputBackground};
        box-shadow: inset 0 0 0 1px ${(props) => props.$theme.border};
    }
`

const CloseButton = styled.button<{ $theme: Theme; $cardColor?: string }>`
    border: none;
    background: none;
    font-size: 24px;
    color: ${(props) => props.$theme.textSecondary};
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex-shrink: 0;
    transition: all 0.15s;

    &:hover {
        background-color: ${(props) => props.$theme.surfaceHover};
        color: ${(props) => props.$theme.text};
    }
`

const Content = styled.div<{ $theme: Theme }>`
    padding: 0 24px 24px;
    flex: 1;
    min-height: 0;
    background-color: ${(props) => props.$theme.surface};
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
`

const Section = styled.div`
    margin-bottom: 20px;
`

const SectionTitle = styled.h3<{ $theme: Theme }>`
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.$theme.textSecondary};
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
`

const ProgressText = styled.span`
    margin-left: 8px;
    font-size: 12px;
    color: ${color.Gray};
    font-weight: normal;
    text-transform: none;
`

const LabelsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`

const LabelTag = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
    padding: 4px 12px;
    border-radius: 4px;
    border: 2px solid ${(props) => (props.$selected ? 'rgba(255, 255, 255, 0.6)' : 'transparent')};
    background-color: ${(props) => props.$color};
    color: ${color.White};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: opacity 0.15s;

    &:hover {
        opacity: 0.85;
    }
`

const EmptyHint = styled.div<{ $theme: Theme }>`
    color: ${(props) => props.$theme.textSecondary};
    font-size: 12px;
`

const DueDateInput = styled.input<{ $isOverdue?: boolean; $isDueSoon?: boolean; $theme: Theme; $isDarkMode?: boolean }>`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${(props) => (props.$isOverdue ? color.Red : props.$isDueSoon ? '#FF9F1A' : props.$theme.border)};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => {
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
    color-scheme: ${(props) => (props.$isDarkMode ? 'dark' : 'light')};

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
    }
`

const WarningText = styled.div<{ $warning?: boolean }>`
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => (props.$warning ? '#FF9F1A' : color.Red)};
    font-weight: 600;
`

const ColorPicker = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $theme: Theme }>`
    width: 36px;
    height: 28px;
    border-radius: 4px;
    border: 2px solid ${(props) => (props.$selected ? props.$theme.text : 'transparent')};
    background-color: ${(props) => props.$color || props.$theme.surface};
    cursor: pointer;
    transition: opacity 0.15s;
    ${(props) => (!props.$color ? `border: 2px solid ${props.$theme.border};` : '')}

    &:hover {
        opacity: 0.8;
    }
`

const DescriptionTextArea = styled.textarea<{ $theme: Theme }>`
    width: 100%;
    padding: 12px 14px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
    line-height: 1.6;

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
        border-color: ${color.Blue};
    }
`

const DescriptionDisplay = styled.div<{ $theme: Theme }>`
    width: 100%;
    padding: 12px 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    min-height: 80px;
    cursor: text;
    white-space: pre-wrap;
    word-break: break-word;
    box-sizing: border-box;
    line-height: 1.6;

    &:hover {
        border-color: ${(props) => props.$theme.border};
    }
`

// 画像関連スタイル
const ImageGallery = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
    margin-top: 12px;
`

const ImageContainer = styled.div`
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    aspect-ratio: 16 / 10;

    &:hover > button {
        opacity: 1;
    }
`

const ImagePreview = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
        transform: scale(1.02);
    }
`

const ImageRemoveButton = styled.button`
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;

    &:hover {
        background: rgba(220, 50, 50, 0.9);
    }
`

const PasteHint = styled.div<{ $theme: Theme }>`
    margin-top: 6px;
    font-size: 11px;
    color: ${(props) => props.$theme.textSecondary};
    opacity: 0.7;
`

const ProgressBar = styled.div<{ $theme?: Theme }>`
    width: 100%;
    height: 6px;
    background-color: ${(props) => props.$theme?.border || color.LightSilver};
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 12px;
`

const ProgressFill = styled.div<{ $progress: number }>`
    height: 100%;
    width: ${(props) => props.$progress}%;
    background: ${(props) =>
        props.$progress === 100
            ? `linear-gradient(90deg, ${color.Green}, #2ecc71)`
            : `linear-gradient(90deg, ${color.Blue}, #5dade2)`};
    transition:
        width 0.3s,
        background-color 0.3s;
    border-radius: 3px;
`

const ChecklistItems = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
`

const ChecklistItemRow = styled.div<{ $theme?: Theme }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background-color: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
    transition: background-color 0.15s;

    &:hover {
        background-color: ${(props) => props.$theme?.border || '#E0E0E0'};
    }
`

const Checkbox = styled.input`
    width: 18px;
    height: 18px;
    cursor: pointer;
    flex-shrink: 0;
    accent-color: ${color.Blue};
`

const ChecklistItemText = styled.span<{ $completed: boolean; $theme?: Theme }>`
    flex: 1;
    font-size: 14px;
    color: ${(props) => props.$theme?.text || color.Black};
    text-decoration: ${(props) => (props.$completed ? 'line-through' : 'none')};
    opacity: ${(props) => (props.$completed ? 0.6 : 1)};
    cursor: pointer;
    user-select: none;
`

const DragHandle = styled.div<{ $theme?: Theme }>`
    cursor: grab;
    color: ${(props) => props.$theme?.textSecondary || color.Gray};
    font-size: 14px;
    padding: 0 4px;
    flex-shrink: 0;
    user-select: none;

    &:active {
        cursor: grabbing;
    }

    &:hover {
        color: ${(props) => props.$theme?.text || color.Black};
    }
`

const EditChecklistInput = styled.input<{ $theme: Theme }>`
    flex: 1;
    padding: 6px 8px;
    border: 1px solid ${color.Blue};
    border-radius: 6px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
`

// アイコン用ボタン（チェックリストの編集・保存・キャンセル）
const SmallButton = styled(IconButton)``

const DeleteItemButton = styled.button<{ $theme?: Theme }>`
    border: none;
    background: none;
    color: ${(props) => props.$theme?.textSecondary || color.Gray};
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
    background: ${(props) => props.$theme?.surface || 'rgba(0, 0, 0, 0.03)'};
    color: ${(props) => props.$theme?.textSecondary || color.Gray};
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    flex-shrink: 0;
    border-radius: 6px;
    transition: all 0.2s;
    min-width: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(:disabled) {
        color: ${color.Blue};
        background-color: ${(props) => props.$theme?.surfaceHover || 'rgba(0, 121, 191, 0.1)'};
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

const ChecklistInput = styled.input<{ $theme: Theme }>`
    flex: 1;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
        border-color: ${color.Blue};
    }
`

const AddChecklistButton = styled(SmallPrimaryButton)`
    border-radius: 8px;
`

const DateFooter = styled.div<{ $theme: Theme }>`
    display: flex;
    gap: 16px;
    padding: 8px 20px;
    border-top: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surfaceHover};
    flex-shrink: 0;
`

const DateItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`

const DateLabel = styled.span<{ $theme: Theme }>`
    font-size: 11px;
    font-weight: 600;
    color: ${(props) => props.$theme.textSecondary};
`

const DateValue = styled.span<{ $theme: Theme }>`
    font-size: 11px;
    color: ${(props) => props.$theme.textSecondary};
`

const Footer = styled.div<{ $theme: Theme }>`
    display: flex;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const SaveButton = styled(PrimaryButton)`
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
`

const CancelButton = styled(SecondaryButton)`
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
`
