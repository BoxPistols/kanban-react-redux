import { useState, useMemo, useCallback, memo } from 'react'
import styled from 'styled-components'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { BaseModal } from './BaseModal'
import { PrimaryButton, SecondaryButton } from './Button'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import type { ColumnDefinition } from './types'

// レーンの色パレット (jewel tones)
const COLUMN_COLORS = [
    '', // デフォルト（色なし）
    '#2B6CB0', // Sapphire
    '#2F855A', // Emerald
    '#B7791F', // Amber
    '#C53030', // Ruby
    '#805AD5', // Amethyst
    '#2C7A7B', // Teal
    '#D53F8C', // Rose
]

interface SortableColumnItemProps {
    column: ColumnDefinition
    onEdit: (id: string, title: string) => void
    onDelete: (id: string) => void
    onColorChange: (id: string, color: string) => void
    theme: Theme
    canDelete: boolean
}

const SortableColumnItem = memo(function SortableColumnItem({
    column,
    onEdit,
    onDelete,
    onColorChange,
    theme,
    canDelete,
}: SortableColumnItemProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState(column.title)
    const [showColors, setShowColors] = useState(false)

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleSaveEdit = useCallback(() => {
        if (editTitle.trim()) {
            onEdit(column.id, editTitle.trim())
        }
        setIsEditing(false)
    }, [editTitle, onEdit, column.id])

    return (
        <ColumnItemRow ref={setNodeRef} style={style} $theme={theme}>
            <DragHandle $theme={theme} {...attributes} {...listeners}>
                ⋮⋮
            </DragHandle>

            {column.color && <ColorDot $color={column.color} />}

            {isEditing ? (
                <EditInput
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') {
                            setEditTitle(column.title)
                            setIsEditing(false)
                        }
                    }}
                    autoFocus
                    $theme={theme}
                />
            ) : (
                <ColumnTitle $theme={theme} onDoubleClick={() => setIsEditing(true)} title='ダブルクリックで名前を変更'>
                    {column.title}
                </ColumnTitle>
            )}

            <ActionsRow>
                <SmallIconButton
                    onClick={() => setShowColors(!showColors)}
                    $theme={theme}
                    title='色を変更'
                    aria-label='レーンの色を変更'
                >
                    🎨
                </SmallIconButton>
                <SmallIconButton
                    onClick={() => setIsEditing(true)}
                    $theme={theme}
                    title='名前を変更'
                    aria-label='レーン名を変更'
                >
                    ✏️
                </SmallIconButton>
                {canDelete && (
                    <SmallIconButton
                        onClick={() => {
                            if (
                                window.confirm(
                                    `「${column.title}」レーンを削除しますか？\nこのレーン内のカードは残ります。`
                                )
                            ) {
                                onDelete(column.id)
                            }
                        }}
                        $theme={theme}
                        $danger
                        title='削除'
                        aria-label={`レーン「${column.title}」を削除`}
                    >
                        ×
                    </SmallIconButton>
                )}
            </ActionsRow>

            {showColors && (
                <ColorPicker>
                    {COLUMN_COLORS.map((c, i) => (
                        <ColorOption
                            key={i}
                            $color={c}
                            $selected={column.color === c || (!column.color && !c)}
                            $theme={theme}
                            onClick={() => {
                                onColorChange(column.id, c)
                                setShowColors(false)
                            }}
                            aria-label={!c ? 'デフォルトカラー（色なし）' : `カラー ${i}`}
                        />
                    ))}
                    <CustomColorLabel $theme={theme} title='カスタムカラー'>
                        <CustomColorInput
                            type='color'
                            value={column.color || '#2D5A8A'}
                            onChange={(e) => {
                                onColorChange(column.id, e.target.value)
                            }}
                            aria-label='カスタムカラーを選択'
                        />
                        <CustomColorIcon>⊕</CustomColorIcon>
                    </CustomColorLabel>
                </ColorPicker>
            )}
        </ColumnItemRow>
    )
})

interface ColumnManagerProps {
    boardId: string
    onClose: () => void
}

export const ColumnManager = memo(function ColumnManager({ boardId, onClose }: ColumnManagerProps) {
    const { getColumns, addColumn, removeColumn, updateColumn, reorderColumns } = useBoardStore()
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)

    const columns = useMemo(() => getColumns(boardId), [getColumns, boardId])
    const [newColumnTitle, setNewColumnTitle] = useState('')

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return

            const oldIndex = columns.findIndex((c) => c.id === active.id)
            const newIndex = columns.findIndex((c) => c.id === over.id)
            const reordered = arrayMove(columns, oldIndex, newIndex)
            reorderColumns(boardId, reordered)
        },
        [columns, boardId, reorderColumns]
    )

    const handleAddColumn = useCallback(() => {
        if (!newColumnTitle.trim()) return
        addColumn(boardId, newColumnTitle.trim())
        setNewColumnTitle('')
    }, [newColumnTitle, boardId, addColumn])

    const handleEditColumn = useCallback(
        (columnId: string, title: string) => {
            updateColumn(boardId, columnId, { title })
        },
        [boardId, updateColumn]
    )

    const handleDeleteColumn = useCallback(
        (columnId: string) => {
            removeColumn(boardId, columnId)
        },
        [boardId, removeColumn]
    )

    const handleColorChange = useCallback(
        (columnId: string, newColor: string) => {
            updateColumn(boardId, columnId, { color: newColor || undefined })
        },
        [boardId, updateColumn]
    )

    return (
        <BaseModal onClose={onClose} maxWidth='500px'>
            <ModalContent $theme={theme}>
                <Header $theme={theme}>
                    <ModalTitle $theme={theme}>レーン管理</ModalTitle>
                    <CloseButton onClick={onClose} $theme={theme} aria-label='閉じる'>
                        ×
                    </CloseButton>
                </Header>

                <Content $theme={theme}>
                    <Description $theme={theme}>
                        ドラッグ&ドロップでレーンの並び順を変更できます。
                        <br />
                        ダブルクリックで名前を変更できます。
                    </Description>

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                            <ColumnsList>
                                {columns.map((column) => (
                                    <SortableColumnItem
                                        key={column.id}
                                        column={column}
                                        onEdit={handleEditColumn}
                                        onDelete={handleDeleteColumn}
                                        onColorChange={handleColorChange}
                                        theme={theme}
                                        canDelete={columns.length > 1}
                                    />
                                ))}
                            </ColumnsList>
                        </SortableContext>
                    </DndContext>

                    <AddSection>
                        <AddInput
                            type='text'
                            value={newColumnTitle}
                            onChange={(e) => setNewColumnTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                            placeholder='新しいレーン名を入力...'
                            $theme={theme}
                            aria-label='新しいレーン名を入力'
                        />
                        <AddButton
                            onClick={handleAddColumn}
                            disabled={!newColumnTitle.trim()}
                            aria-label='レーンを追加'
                        >
                            追加
                        </AddButton>
                    </AddSection>
                </Content>

                <Footer $theme={theme}>
                    <DoneButton onClick={onClose} aria-label='完了'>
                        完了
                    </DoneButton>
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

const Header = styled.div<{ $theme: Theme }>`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const ModalTitle = styled.h2<{ $theme: Theme }>`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${(props) => props.$theme.text};
`

const CloseButton = styled.button<{ $theme: Theme }>`
    border: none;
    background: none;
    font-size: 24px;
    color: ${(props) => props.$theme.textSecondary};
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;

    &:hover {
        color: ${(props) => props.$theme.text};
        background: ${(props) => props.$theme.surfaceHover};
    }
`

const Content = styled.div<{ $theme: Theme }>`
    padding: 20px;
    flex: 1;
    overflow-y: auto;
    background-color: ${(props) => props.$theme.surface};
`

const Description = styled.p<{ $theme: Theme }>`
    margin: 0 0 16px 0;
    font-size: 13px;
    color: ${(props) => props.$theme.textSecondary};
    line-height: 1.6;
`

const ColumnsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
`

const ColumnItemRow = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background-color: ${(props) => props.$theme.surfaceHover};
    flex-wrap: wrap;

    &:hover {
        background-color: ${(props) => props.$theme.border};
    }
`

const DragHandle = styled.div<{ $theme: Theme }>`
    cursor: grab;
    color: ${(props) => props.$theme.textSecondary};
    font-size: 14px;
    padding: 0 4px;
    user-select: none;

    &:active {
        cursor: grabbing;
    }
`

const ColorDot = styled.div<{ $color: string }>`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    flex-shrink: 0;
`

const ColumnTitle = styled.div<{ $theme: Theme }>`
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
    cursor: pointer;
    min-width: 0;
`

const EditInput = styled.input<{ $theme: Theme }>`
    flex: 1;
    padding: 4px 8px;
    border: 1px solid ${color.Blue};
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
    background: ${(props) => props.$theme.inputBackground};
    outline: none;
    min-width: 0;
`

const ActionsRow = styled.div`
    display: flex;
    gap: 4px;
    flex-shrink: 0;
`

const SmallIconButton = styled.button<{ $theme: Theme; $danger?: boolean }>`
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: ${(props) => (props.$danger ? color.Red : props.$theme.textSecondary)};

    &:hover {
        background: ${(props) => props.$theme.surface};
        color: ${(props) => (props.$danger ? color.Red : props.$theme.text)};
    }
`

const ColorPicker = styled.div`
    display: flex;
    gap: 6px;
    width: 100%;
    padding-top: 8px;
    padding-left: 28px;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $theme: Theme }>`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid ${(props) => (props.$selected ? props.$theme.text : props.$theme.border)};
    background-color: ${(props) => props.$color || props.$theme.surface};
    cursor: pointer;
    transition: transform 0.1s;

    &:hover {
        transform: scale(1.15);
    }
`

const CustomColorLabel = styled.label<{ $theme: Theme }>`
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px dashed ${(props) => props.$theme.border};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;

    &:hover {
        transform: scale(1.15);
        border-color: ${(props) => props.$theme.textSecondary};
    }
`

const CustomColorInput = styled.input`
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
`

const CustomColorIcon = styled.span`
    font-size: 14px;
    pointer-events: none;
    opacity: 0.5;
`

const AddSection = styled.div`
    display: flex;
    gap: 8px;
`

const AddInput = styled.input<{ $theme: Theme }>`
    flex: 1;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: -1px;
        border-color: ${color.Blue};
    }
`

const AddButton = styled(PrimaryButton)`
    padding: 10px 20px;
    border-radius: 8px;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`

const Footer = styled.div<{ $theme: Theme }>`
    display: flex;
    justify-content: flex-end;
    padding: 16px 20px;
    border-top: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const DoneButton = styled(SecondaryButton)`
    padding: 10px 32px;
    border-radius: 8px;
`
