import { useState, useEffect, useRef, useCallback, memo } from 'react'
import styled from 'styled-components'
import { v4 as uuidv4 } from 'uuid'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import {
    PrimaryButton,
    SecondaryButton,
    DangerButton as SharedDangerButton,
    SmallPrimaryButton,
    SmallButton,
    SmallDangerButton,
} from './Button'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { BOARD_COLORS, LABEL_COLORS } from './constants'
import { BaseModal } from './BaseModal'
import type { Label } from './types'

interface BoardModalProps {
    boardId?: string | null
    onClose: () => void
}

type TabType = 'basic' | 'labels'

// Type guard for imported labels
interface ImportedLabel {
    name?: unknown
    color?: unknown
}

function isValidLabel(obj: ImportedLabel): obj is { name: string; color: string } {
    return obj && typeof obj.name === 'string' && typeof obj.color === 'string'
}

// Sortable Label Item Component
interface SortableLabelItemProps {
    label: Label
    editingLabel: Label | null
    setEditingLabel: (label: Label | null) => void
    handleUpdateLabel: () => Promise<void>
    handleDeleteLabel: (labelId: string) => Promise<void>
    isDarkMode: boolean
    theme: Theme
    editingCustomColorInputRef: React.RefObject<HTMLInputElement>
    setShouldOpenEditingColorPicker: (value: boolean) => void
}

function SortableLabelItem({
    label,
    editingLabel,
    setEditingLabel,
    handleUpdateLabel,
    handleDeleteLabel,
    isDarkMode,
    theme,
    editingCustomColorInputRef,
    setShouldOpenEditingColorPicker,
}: SortableLabelItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: label.id,
        disabled: editingLabel?.id === label.id, // 編集中はドラッグ無効化
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <LabelItem ref={setNodeRef} style={style} $theme={theme} {...attributes} {...listeners}>
            {editingLabel?.id === label.id ? (
                <>
                    <LabelInput
                        type='text'
                        value={editingLabel.name}
                        onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                        $theme={theme}
                    />
                    <LabelColorPicker>
                        {LABEL_COLORS.map((c) => (
                            <LabelColorOption
                                key={c}
                                type='button'
                                $color={c}
                                $selected={editingLabel.color === c}
                                $isDarkMode={isDarkMode}
                                onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                            />
                        ))}
                        <CustomColorButton
                            type='button'
                            $selected={!LABEL_COLORS.includes(editingLabel.color)}
                            $isDarkMode={isDarkMode}
                            $currentColor={!LABEL_COLORS.includes(editingLabel.color) ? editingLabel.color : undefined}
                            onClick={() => setShouldOpenEditingColorPicker(true)}
                            title='カスタムカラー'
                        >
                            +
                        </CustomColorButton>
                        <HiddenColorInput
                            ref={editingCustomColorInputRef}
                            type='color'
                            value={editingLabel.color}
                            onChange={(e) =>
                                setEditingLabel({
                                    ...editingLabel,
                                    color: e.target.value,
                                })
                            }
                        />
                    </LabelColorPicker>
                    <SaveLabelButton
                        type='button'
                        onClick={handleUpdateLabel}
                        aria-label={`ラベル「${editingLabel.name}」を保存`}
                    >
                        保存
                    </SaveLabelButton>
                    <CancelLabelButton
                        type='button'
                        onClick={() => setEditingLabel(null)}
                        $theme={theme}
                        aria-label='ラベルの編集をキャンセル'
                    >
                        キャンセル
                    </CancelLabelButton>
                </>
            ) : (
                <>
                    <DragHandle title='ドラッグして並び替え'>⋮⋮</DragHandle>
                    <LabelPreview $color={label.color}>{label.name}</LabelPreview>
                    <EditLabelButton
                        type='button'
                        onClick={() => setEditingLabel(label)}
                        $theme={theme}
                        aria-label={`ラベル「${label.name}」を編集`}
                    >
                        編集
                    </EditLabelButton>
                    <DeleteLabelButton
                        type='button'
                        onClick={() => handleDeleteLabel(label.id)}
                        aria-label={`ラベル「${label.name}」を削除`}
                    >
                        削除
                    </DeleteLabelButton>
                </>
            )}
        </LabelItem>
    )
}

export const BoardModal = memo(function BoardModal({ boardId, onClose }: BoardModalProps) {
    const { boards, updateBoard, addBoard, deleteBoard, addLabelToBoard, removeLabelFromBoard, updateLabel } =
        useBoardStore()
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const board = boardId ? boards.find((b) => b.id === boardId) : null

    const [activeTab, setActiveTab] = useState<TabType>('basic')
    const [name, setName] = useState(board?.name || '')
    const [description, setDescription] = useState(board?.description || '')
    const [selectedColor, setSelectedColor] = useState(board?.color || BOARD_COLORS[0])

    // Label management state
    const [newLabelName, setNewLabelName] = useState('')
    const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
    const [editingLabel, setEditingLabel] = useState<Label | null>(null)
    const [shouldOpenColorPicker, setShouldOpenColorPicker] = useState(false)
    const [shouldOpenEditingColorPicker, setShouldOpenEditingColorPicker] = useState(false)
    const customColorInputRef = useRef<HTMLInputElement>(null)
    const editingCustomColorInputRef = useRef<HTMLInputElement>(null)
    const importFileInputRef = useRef<HTMLInputElement>(null)

    // boardデータの読み込み時にフォームを初期化（外部データとの同期）
    useEffect(() => {
        if (board) {
            setName(board.name)
            setDescription(board.description || '')
            setSelectedColor(board.color || BOARD_COLORS[0])
        }
    }, [board])

    // カラーピッカーの制御（DOM操作との同期）
    useEffect(() => {
        if (shouldOpenColorPicker) {
            customColorInputRef.current?.click()
            setShouldOpenColorPicker(false)
        }
    }, [shouldOpenColorPicker])

    // 編集中カラーピッカーの制御（DOM操作との同期）
    useEffect(() => {
        if (shouldOpenEditingColorPicker) {
            editingCustomColorInputRef.current?.click()
            setShouldOpenEditingColorPicker(false)
        }
    }, [shouldOpenEditingColorPicker])

    const handleAddLabel = useCallback(
        async (e?: React.MouseEvent) => {
            if (e) e.preventDefault()
            if (!boardId || !newLabelName.trim()) return
            await addLabelToBoard(boardId, {
                name: newLabelName,
                color: newLabelColor,
            })
            setNewLabelName('')
            setNewLabelColor(LABEL_COLORS[0])
        },
        [boardId, newLabelName, newLabelColor, addLabelToBoard]
    )

    const handleLabelKeyPress = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleAddLabel()
            }
        },
        [handleAddLabel]
    )

    const handleUpdateLabel = useCallback(async () => {
        if (!boardId || !editingLabel) return
        await updateLabel(boardId, editingLabel.id, {
            name: editingLabel.name,
            color: editingLabel.color,
        })
        setEditingLabel(null)
    }, [boardId, editingLabel, updateLabel])

    const handleDeleteLabel = useCallback(
        async (labelId: string) => {
            if (!boardId) return
            if (window.confirm('このラベルを削除しますか？')) {
                await removeLabelFromBoard(boardId, labelId)
            }
        },
        [boardId, removeLabelFromBoard]
    )

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || !boardId || !board?.labels || active.id === over.id) return

            const oldIndex = board.labels.findIndex((l) => l.id === active.id)
            const newIndex = board.labels.findIndex((l) => l.id === over.id)

            if (oldIndex === -1 || newIndex === -1) return

            // 配列を並び替える
            const reorderedLabels = [...board.labels]
            const [movedLabel] = reorderedLabels.splice(oldIndex, 1)
            reorderedLabels.splice(newIndex, 0, movedLabel)

            await updateBoard(boardId, { labels: reorderedLabels })
        },
        [boardId, board?.labels, updateBoard]
    )

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px移動するまでドラッグ開始しない
            },
        })
    )

    const handleExportLabels = useCallback(() => {
        if (!board?.labels || board.labels.length === 0) {
            alert('エクスポートするラベルがありません')
            return
        }
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            boardName: board.name,
            labels: board.labels.map((l) => ({
                name: l.name,
                color: l.color,
            })),
        }
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `labels-${board.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [board])

    const handleImportLabels = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file || !boardId) return

            try {
                const text = await file.text()
                const data = JSON.parse(text)

                if (!data.labels || !Array.isArray(data.labels)) {
                    alert('無効なファイル形式です')
                    return
                }

                // Use type guard to filter valid labels
                const validLabels = (data.labels as ImportedLabel[]).filter(isValidLabel)

                if (validLabels.length === 0) {
                    alert('有効なラベルが見つかりませんでした')
                    return
                }

                const existingNames = new Set(board?.labels?.map((l) => l.name.toLowerCase()) || [])
                const labelsToAdd: { name: string; color: string }[] = []
                let skippedCount = 0

                for (const label of validLabels) {
                    if (existingNames.has(label.name.toLowerCase())) {
                        skippedCount++
                        continue
                    }
                    labelsToAdd.push({ name: label.name, color: label.color })
                    existingNames.add(label.name.toLowerCase())
                }

                // Batch update: add all labels at once
                if (labelsToAdd.length > 0) {
                    const newLabels = labelsToAdd.map((l) => ({ ...l, id: uuidv4() }))
                    const updatedLabels = [...(board?.labels || []), ...newLabels]
                    await updateBoard(boardId, { labels: updatedLabels })
                }

                const importedCount = labelsToAdd.length
                alert(
                    `${importedCount}個のラベルをインポートしました${skippedCount > 0 ? `\n（${skippedCount}個は既に存在するためスキップしました）` : ''}`
                )
            } catch (error) {
                alert('ファイルの読み込みに失敗しました')
            }

            // Reset file input
            if (importFileInputRef.current) {
                importFileInputRef.current.value = ''
            }
        },
        [boardId, board?.labels, updateBoard]
    )

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            if (!name.trim()) return

            if (boardId) {
                await updateBoard(boardId, { name, description, color: selectedColor })
            } else {
                await addBoard(name, description, selectedColor)
            }
            onClose()
        },
        [boardId, name, description, selectedColor, updateBoard, addBoard, onClose]
    )

    const handleDelete = useCallback(async () => {
        if (!boardId) return
        if (window.confirm('このボードを削除しますか？ボード内のカードも全て削除されます。')) {
            await deleteBoard(boardId)
            onClose()
        }
    }, [boardId, deleteBoard, onClose])

    return (
        <BaseModal onClose={onClose} maxWidth='500px'>
            <ModalContent $theme={theme}>
                <Header $theme={theme}>
                    <Title $theme={theme}>{boardId ? 'ボードを編集' : '新しいボード'}</Title>
                    <CloseButton onClick={onClose} $theme={theme} aria-label='閉じる'>
                        ×
                    </CloseButton>
                </Header>

                {boardId && (
                    <TabBar $theme={theme}>
                        <Tab
                            $active={activeTab === 'basic'}
                            $theme={theme}
                            onClick={() => setActiveTab('basic')}
                            aria-label='基本情報タブ'
                        >
                            基本情報
                        </Tab>
                        <Tab
                            $active={activeTab === 'labels'}
                            $theme={theme}
                            onClick={() => setActiveTab('labels')}
                            aria-label='ラベル管理タブ'
                        >
                            ラベル管理
                        </Tab>
                    </TabBar>
                )}

                {activeTab === 'basic' ? (
                    <Form onSubmit={handleSubmit} $theme={theme}>
                        <FormGroup>
                            <FormLabel $theme={theme}>ボード名</FormLabel>
                            <Input
                                type='text'
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder='例: プロジェクト管理'
                                autoFocus
                                required
                                $theme={theme}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel $theme={theme}>説明（任意）</FormLabel>
                            <TextArea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder='このボードの説明を入力...'
                                rows={3}
                                $theme={theme}
                            />
                        </FormGroup>

                        <FormGroup>
                            <FormLabel $theme={theme}>色</FormLabel>
                            <ColorGrid>
                                {BOARD_COLORS.map((boardColor) => (
                                    <ColorOption
                                        key={boardColor}
                                        $color={boardColor}
                                        $selected={selectedColor === boardColor}
                                        $isDarkMode={isDarkMode}
                                        onClick={() => setSelectedColor(boardColor)}
                                        type='button'
                                    />
                                ))}
                            </ColorGrid>
                        </FormGroup>

                        <ButtonGroup>
                            <SubmitButton type='submit'>{boardId ? '更新' : '作成'}</SubmitButton>
                            <CancelButton type='button' onClick={onClose} $theme={theme}>
                                キャンセル
                            </CancelButton>
                            {boardId && (
                                <DeleteButton type='button' onClick={handleDelete}>
                                    削除
                                </DeleteButton>
                            )}
                        </ButtonGroup>
                    </Form>
                ) : (
                    <LabelsContent $theme={theme}>
                        <LabelsSection>
                            <SectionTitle $theme={theme}>新しいラベルを追加</SectionTitle>
                            <LabelForm>
                                <LabelInputRow>
                                    <LabelInput
                                        type='text'
                                        value={newLabelName}
                                        onChange={(e) => setNewLabelName(e.target.value)}
                                        onKeyDown={handleLabelKeyPress}
                                        placeholder='ラベル名'
                                        $theme={theme}
                                    />
                                    <LabelColorPicker>
                                        {LABEL_COLORS.map((c) => (
                                            <LabelColorOption
                                                key={c}
                                                type='button'
                                                $color={c}
                                                $selected={newLabelColor === c}
                                                $isDarkMode={isDarkMode}
                                                onClick={() => setNewLabelColor(c)}
                                            />
                                        ))}
                                        <CustomColorButton
                                            type='button'
                                            $selected={!LABEL_COLORS.includes(newLabelColor)}
                                            $isDarkMode={isDarkMode}
                                            $currentColor={
                                                !LABEL_COLORS.includes(newLabelColor) ? newLabelColor : undefined
                                            }
                                            onClick={() => setShouldOpenColorPicker(true)}
                                            title='カスタムカラー'
                                        >
                                            +
                                        </CustomColorButton>
                                        <HiddenColorInput
                                            ref={customColorInputRef}
                                            type='color'
                                            value={newLabelColor}
                                            onChange={(e) => setNewLabelColor(e.target.value)}
                                        />
                                    </LabelColorPicker>
                                    <AddLabelButton type='button' onClick={handleAddLabel}>
                                        追加
                                    </AddLabelButton>
                                </LabelInputRow>
                            </LabelForm>
                        </LabelsSection>

                        <LabelsSection>
                            <ExportImportRow>
                                <ExportButton type='button' onClick={handleExportLabels} $theme={theme}>
                                    ラベルをエクスポート
                                </ExportButton>
                                <ImportButton type='button' onClick={() => importFileInputRef.current?.click()}>
                                    ラベルをインポート
                                </ImportButton>
                                <HiddenFileInput
                                    ref={importFileInputRef}
                                    type='file'
                                    accept='.json'
                                    onChange={handleImportLabels}
                                />
                            </ExportImportRow>
                        </LabelsSection>

                        <LabelsSection>
                            <SectionTitle $theme={theme}>既存のラベル</SectionTitle>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <LabelsList $theme={theme}>
                                    {board?.labels && board.labels.length > 0 ? (
                                        <SortableContext
                                            items={board.labels.map((l) => l.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {board.labels.map((label) => (
                                                <SortableLabelItem
                                                    key={label.id}
                                                    label={label}
                                                    editingLabel={editingLabel}
                                                    setEditingLabel={setEditingLabel}
                                                    handleUpdateLabel={handleUpdateLabel}
                                                    handleDeleteLabel={handleDeleteLabel}
                                                    isDarkMode={isDarkMode}
                                                    theme={theme}
                                                    editingCustomColorInputRef={editingCustomColorInputRef}
                                                    setShouldOpenEditingColorPicker={setShouldOpenEditingColorPicker}
                                                />
                                            ))}
                                        </SortableContext>
                                    ) : (
                                        <EmptyLabels $theme={theme}>ラベルがありません</EmptyLabels>
                                    )}
                                </LabelsList>
                            </DndContext>
                        </LabelsSection>

                        <LabelsFooter>
                            <CancelButton type='button' onClick={onClose} $theme={theme}>
                                閉じる
                            </CancelButton>
                        </LabelsFooter>
                    </LabelsContent>
                )}
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
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
`

const Header = styled.div<{ $theme: Theme }>`
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const Title = styled.h2<{ $theme: Theme }>`
    margin: 0;
    font-size: 18px;
    color: ${(props) => props.$theme.text};
`

const CloseButton = styled.button<{ $theme: Theme }>`
    border: none;
    background: none;
    font-size: 28px;
    color: ${(props) => props.$theme.textSecondary};
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition:
        background-color 0.2s,
        color 0.2s;

    &:hover {
        background-color: ${(props) => props.$theme.surfaceHover};
        color: ${(props) => props.$theme.text};
    }
`

const Form = styled.form<{ $theme: Theme }>`
    padding: 20px;
    background-color: ${(props) => props.$theme.surface};
    flex: 1;
    min-height: 0;
`

const FormGroup = styled.div`
    margin-bottom: 20px;
`

const FormLabel = styled.label<{ $theme: Theme }>`
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
`

const Input = styled.input<{ $theme: Theme }>`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 4px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    box-sizing: border-box;

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
        border-color: ${color.Blue};
    }

    &::placeholder {
        color: ${(props) => props.$theme.textSecondary};
    }
`

const TextArea = styled.textarea<{ $theme: Theme }>`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 4px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
        border-color: ${color.Blue};
    }

    &::placeholder {
        color: ${(props) => props.$theme.textSecondary};
    }
`

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    border: 3px solid
        ${(props) => {
            if (!props.$selected) return 'transparent'
            return props.$isDarkMode ? color.White : color.Black
        }};
    background-color: ${(props) => props.$color};
    cursor: pointer;
    transition:
        transform 0.1s,
        border-color 0.2s;

    &:hover {
        transform: scale(1.1);
    }
`

const ButtonGroup = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 24px;
`

const SubmitButton = styled(PrimaryButton)`
    flex: 1;
    padding: 10px 16px;
`

const CancelButton = styled(SecondaryButton)`
    flex: 1;
    padding: 10px 16px;
`

const DeleteButton = styled(SharedDangerButton)`
    padding: 10px 16px;
`

const TabBar = styled.div<{ $theme: Theme }>`
    position: sticky;
    top: 0;
    z-index: 1;
    display: flex;
    border-bottom: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const Tab = styled.button<{ $active: boolean; $theme: Theme }>`
    flex: 1;
    padding: 12px;
    border: none;
    background-color: ${(props) => (props.$active ? props.$theme.surface : props.$theme.surfaceHover)};
    color: ${(props) => (props.$active ? color.Blue : props.$theme.textSecondary)};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border-bottom: 2px solid ${(props) => (props.$active ? color.Blue : 'transparent')};
    transition: background-color 0.2s;

    &:hover {
        background-color: ${(props) => props.$theme.surface};
    }
`

const LabelsContent = styled.div<{ $theme: Theme }>`
    padding: 20px;
    background-color: ${(props) => props.$theme.surface};
    flex: 1;
    min-height: 0;
`

const LabelsSection = styled.div`
    margin-bottom: 24px;
`

const SectionTitle = styled.h3<{ $theme: Theme }>`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
`

const LabelForm = styled.div``

const LabelInputRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`

const LabelInput = styled.input<{ $theme: Theme }>`
    padding: 8px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 4px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
    }

    &::placeholder {
        color: ${(props) => props.$theme.textSecondary};
    }
`

const LabelColorPicker = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    align-items: center;
`

const LabelColorOption = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid
        ${(props) => {
            if (!props.$selected) return 'transparent'
            return props.$isDarkMode ? color.White : color.Black
        }};
    background-color: ${(props) => props.$color};
    cursor: pointer;
    transition:
        transform 0.1s,
        border-color 0.2s;

    &:hover {
        transform: scale(1.1);
    }
`

const CustomColorButton = styled.button<{ $selected: boolean; $isDarkMode?: boolean; $currentColor?: string }>`
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid
        ${(props) => {
            if (!props.$selected) return props.$isDarkMode ? '#555' : color.Silver
            return props.$isDarkMode ? color.White : color.Black
        }};
    background-color: ${(props) => props.$currentColor || (props.$isDarkMode ? '#444' : '#f0f0f0')};
    cursor: pointer;
    transition:
        transform 0.1s,
        border-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: ${(props) => (props.$currentColor ? color.White : props.$isDarkMode ? color.White : color.Black)};
    text-shadow: ${(props) => (props.$currentColor ? '0 1px 2px rgba(0,0,0,0.5)' : 'none')};

    &:hover {
        transform: scale(1.1);
    }
`

const HiddenColorInput = styled.input`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
`

const ExportImportRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`

const ExportButton = styled(SecondaryButton)`
    padding: 8px 16px;
    font-size: 13px;
`

const ImportButton = styled(SecondaryButton)`
    padding: 8px 16px;
    font-size: 13px;
`

const HiddenFileInput = styled.input`
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
    pointer-events: none;
`

const AddLabelButton = styled(SmallPrimaryButton)`
    padding: 8px 16px;
`

const LabelsList = styled.div<{ $theme: Theme }>`
    display: flex;
    flex-direction: column;
    gap: 8px;
`

const LabelItem = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 4px;
    background-color: ${(props) => props.$theme.inputBackground};
    flex-wrap: wrap;
    cursor: move;
    transition: background-color 0.2s;

    &:hover {
        background-color: ${(props) => props.$theme.surfaceHover};
    }
`

const DragHandle = styled.div`
    color: rgba(255, 255, 255, 0.4);
    font-size: 18px;
    line-height: 1;
    cursor: grab;
    user-select: none;
    padding: 0 4px;

    &:active {
        cursor: grabbing;
    }
`

const LabelPreview = styled.div<{ $color: string }>`
    flex: 1;
    padding: 6px 12px;
    border-radius: 4px;
    background-color: ${(props) => props.$color};
    color: ${color.White};
    font-size: 14px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`

const EditLabelButton = styled(SmallButton)`
    padding: 6px 12px;
`

const DeleteLabelButton = styled(SmallDangerButton)`
    padding: 6px 12px;
`

const SaveLabelButton = styled(SmallPrimaryButton)`
    padding: 6px 12px;
`

const CancelLabelButton = styled(SmallButton)`
    padding: 6px 12px;
`

const EmptyLabels = styled.div<{ $theme: Theme }>`
    padding: 20px;
    text-align: center;
    color: ${(props) => props.$theme.textSecondary};
    font-size: 14px;
    font-style: italic;
`

const LabelsFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-top: 24px;
`
