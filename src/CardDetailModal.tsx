import { useState, useCallback, useRef, memo, useEffect } from 'react'
import styled from 'styled-components'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { v4 as uuidv4 } from 'uuid'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import * as color from './color'
import { SmallPrimaryButton } from './Button'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { showToast } from './store/toastStore'
import { pushUndo } from './store/undoStore'
import { getTheme, Theme } from './theme'
import { CARD_COLOR_LABELS } from './constants'
import { getDueDateStatus } from './utils/dateUtils'
import { isComposing } from './utils/keyboard'
import { checkImageFileSize, checkImageTotalSize, MAX_IMAGE_FILE_BYTES, formatBytes } from './utils/imageLimits'
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
    const editInputRef = useRef<HTMLInputElement>(null)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    // 編集モード開始時に入力欄にフォーカス
    useEffect(() => {
        if (isEditing) {
            editInputRef.current?.focus()
        }
    }, [isEditing])

    return (
        <ChecklistItemRow ref={setNodeRef} style={style} $theme={theme}>
            <DragHandle $theme={theme} {...attributes} {...listeners}>
                ⋮⋮
            </DragHandle>

            {isEditing ? (
                <>
                    <EditChecklistInput
                        ref={editInputRef}
                        type='text'
                        value={editingText}
                        onChange={(e) => onEditTextChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (isComposing(e)) return
                            if (e.key === 'Enter') {
                                onSaveEdit()
                            } else if (e.key === 'Escape') {
                                onCancelEdit()
                            }
                        }}
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
    const { updateCard, addCard, trashCard, cards } = useKanbanStore()
    const { boards, currentBoardId, getColumns } = useBoardStore()
    const { isDarkMode } = useThemeStore()

    const theme = getTheme(isDarkMode)
    const currentBoard = boards.find((b) => b.id === currentBoardId)
    const boardLabels = currentBoard?.labels || []
    const boardColumns = getColumns(card.boardId)

    const [title, setTitle] = useState(card.title || card.text)
    const [description, setDescription] = useState(card.description || '')
    const [selectedLabels, setSelectedLabels] = useState<Label[]>(card.labels || [])
    const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist || [])
    const [newChecklistItem, setNewChecklistItem] = useState('')
    const [editingChecklistItem, setEditingChecklistItem] = useState<string | null>(null)
    const [editingChecklistText, setEditingChecklistText] = useState('')
    const [convertingItemId, setConvertingItemId] = useState<string | null>(null)
    // 期限: 日付と時刻を分離して保持(時刻は任意)。ローカルタイムゾーン基準で表示する
    const initialDue = card.dueDate ? new Date(card.dueDate) : null
    const toLocalDateString = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const toLocalTimeString = (d: Date) =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const [dueDate, setDueDate] = useState(initialDue ? toLocalDateString(initialDue) : '')
    const [dueTime, setDueTime] = useState(
        initialDue && (initialDue.getHours() !== 0 || initialDue.getMinutes() !== 0)
            ? toLocalTimeString(initialDue)
            : ''
    )
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

    // 画像ペースト処理。
    // 画像は base64 でカード文書に直書きされるため、Firestore の 1MiB 制限を超えると
    // updateDoc 全体が失敗し、同じ保存に含まれる説明・チェックリストの編集ごと失われる。
    // 保存できない画像は入口で断る(恒久対応は Firebase Storage への退避: #97)。
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items
            if (!items) return

            for (let i = 0; i < items.length; i++) {
                const item = items[i]
                if (item.type.startsWith('image/')) {
                    e.preventDefault()
                    const file = item.getAsFile()
                    if (!file) continue

                    const fileCheck = checkImageFileSize(file.size)
                    if (!fileCheck.ok) {
                        showToast(fileCheck.reason, 'error')
                        return
                    }

                    const reader = new FileReader()
                    reader.onload = (event) => {
                        const dataUrl = event.target?.result as string
                        if (!dataUrl) return
                        // base64 化で膨らんだ実サイズを、既存の添付と合算して再判定する。
                        // 判定(と失敗時のトースト)は更新関数の外で行う(アップデーターは純粋に保つ)
                        const totalCheck = checkImageTotalSize(images, dataUrl)
                        if (!totalCheck.ok) {
                            showToast(totalCheck.reason, 'error')
                            return
                        }
                        const newImage: ImageAttachment = {
                            id: uuidv4(),
                            dataUrl,
                            name: file.name || `image-${Date.now()}`,
                            createdAt: Date.now(),
                        }
                        setImages((prev) => [...prev, newImage])
                    }
                    reader.readAsDataURL(file)
                    break
                }
            }
        },
        [images]
    )

    const handleRemoveImage = useCallback((imageId: string) => {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
    }, [])

    // --- 自動保存 ---
    // 「保存ボタンを押し忘れて全変更が消える」事故を根絶するため、
    // 編集内容はデバウンスで自動保存し、閉じる操作(×/ESC/外側クリック)では
    // 未保存分をフラッシュしてから閉じる。
    const latestUpdatesRef = useRef<Partial<Card>>({})
    const savedSnapshotRef = useRef<string | null>(null)
    const skipSaveRef = useRef(false)

    // 毎レンダリング後に最新の編集内容を ref へ反映する(レンダリング中の ref 書き込みは不可)
    useEffect(() => {
        // タイトル空のまま保存すると表示名が消えるため、その場合は元の表示名を維持する
        const titleToSave = title.trim() || card.title || card.text
        latestUpdatesRef.current = {
            title: titleToSave,
            // title と text の二重管理をやめ、常に同期する(見えない text が検索にヒットする問題の解消)
            text: titleToSave,
            description,
            labels: selectedLabels,
            checklist,
            // 日付が空の場合はnullを設定して削除を明示。時刻未指定は 00:00 扱い
            dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).getTime() : null,
            progress,
            color: cardColor,
            // 全画像削除時は null を渡してフィールド削除を明示する。undefined だと
            // Firestore 更新ペイロードから除外され、古い画像が消えず復活する(監査)。
            images: images.length > 0 ? images : null,
        }
        if (savedSnapshotRef.current === null) {
            // 初回レンダリング時点の内容を「保存済み」とみなす(開いただけでは書き込まない)
            savedSnapshotRef.current = JSON.stringify(latestUpdatesRef.current)
        }
    })

    const saveNow = useCallback(() => {
        if (skipSaveRef.current) return
        const updates = latestUpdatesRef.current
        const serialized = JSON.stringify(updates)
        if (serialized === savedSnapshotRef.current) return
        savedSnapshotRef.current = serialized
        updateCard(card.id, updates)
    }, [updateCard, card.id])

    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        const timer = setTimeout(saveNow, 600)
        return () => clearTimeout(timer)
    }, [title, description, selectedLabels, checklist, dueDate, dueTime, cardColor, images, saveNow])

    // 閉じるときは未保存分を確実に書き込む
    const handleClose = useCallback(() => {
        saveNow()
        onClose()
    }, [saveNow, onClose])

    // レーン移動: モーダル内から直接カードを別レーンへ動かせるようにする
    const handleMoveToColumn = useCallback(
        (columnId: string) => {
            if (columnId === card.columnId) return
            saveNow()
            const cardsInColumn = cards.filter((c) => c.columnId === columnId && c.boardId === card.boardId)
            const maxOrder = cardsInColumn.length > 0 ? Math.max(...cardsInColumn.map((c) => c.order)) : -1
            const prev = { columnId: card.columnId, order: card.order }
            updateCard(card.id, { columnId, order: maxOrder + 1 })
            pushUndo({ label: 'レーン移動', undo: () => updateCard(card.id, prev) })
            const columnTitle = boardColumns.find((c) => c.id === columnId)?.title || columnId
            showToast(`「${columnTitle}」へ移動しました`, 'success')
        },
        [card.columnId, card.order, card.boardId, card.id, cards, updateCard, saveNow, boardColumns]
    )

    // ゴミ箱へ移動(Undo付き)。削除後に自動保存が走らないようフラグで抑止する
    const handleMoveToTrash = useCallback(async () => {
        skipSaveRef.current = true
        await trashCard(card.id)
        onClose()
    }, [card.id, trashCard, onClose])

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
                showToast('カードへの変換に失敗しました', 'error')
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

    const dueDateTimestamp = dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).getTime() : undefined
    const { isDueSoon, isOverdue } = getDueDateStatus(dueDateTimestamp)

    return (
        <BaseModal onClose={handleClose} maxWidth='600px'>
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
                    <CloseButton onClick={handleClose} $theme={theme} aria-label='閉じる'>
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
                        <DueDateRow>
                            <DueDateInput
                                type='date'
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                $isOverdue={isOverdue}
                                $isDueSoon={isDueSoon && !isOverdue}
                                $theme={theme}
                                $isDarkMode={isDarkMode}
                                aria-label='期限日'
                            />
                            <DueTimeInput
                                type='time'
                                value={dueTime}
                                onChange={(e) => setDueTime(e.target.value)}
                                disabled={!dueDate}
                                $theme={theme}
                                $isDarkMode={isDarkMode}
                                aria-label='期限時刻(任意)'
                                title='時刻(任意)'
                            />
                            {dueDate && (
                                <ClearDueDateButton
                                    onClick={() => {
                                        setDueDate('')
                                        setDueTime('')
                                    }}
                                    $theme={theme}
                                    aria-label='期限をクリア'
                                >
                                    クリア
                                </ClearDueDateButton>
                            )}
                        </DueDateRow>
                        {isOverdue && <WarningText $theme={theme}>期限切れです</WarningText>}
                        {isDueSoon && !isOverdue && (
                            <WarningText $theme={theme} $warning>
                                まもなく期限です
                            </WarningText>
                        )}
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setEditingDescription(true)
                                    }
                                }}
                                role='button'
                                tabIndex={0}
                                title='クリックまたはEnterで編集'
                                aria-label='説明を編集'
                            >
                                <MarkdownBody $theme={theme}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            a: ({ href, children }) => {
                                                // 生URLのオートリンクは、取得済みメタデータのページタイトルで表示する
                                                const childText = Array.isArray(children) ? children[0] : children
                                                const meta = metadata?.find((m) => m.url === href)
                                                const label = meta?.title && childText === href ? meta.title : children
                                                return (
                                                    <a
                                                        href={href}
                                                        target='_blank'
                                                        rel='noopener noreferrer'
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {label}
                                                    </a>
                                                )
                                            },
                                        }}
                                    >
                                        {description}
                                    </ReactMarkdown>
                                </MarkdownBody>
                            </DescriptionDisplay>
                        ) : (
                            <DescriptionTextArea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={() => setEditingDescription(false)}
                                onPaste={handlePaste}
                                placeholder='詳細な説明を入力... (Markdown対応 / 画像の貼り付けも可能)'
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
                        <PasteHint $theme={theme}>
                            Ctrl+V / Cmd+V で画像を貼り付けできます(1枚 {formatBytes(MAX_IMAGE_FILE_BYTES)} まで)
                        </PasteHint>
                    </Section>

                    {/* Checklist Section */}
                    <Section>
                        <SectionTitle $theme={theme}>
                            チェックリスト
                            {checklist.length > 0 && <ProgressText $theme={theme}> ({progress}% 完了)</ProgressText>}
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
                                onKeyDown={(e) => !isComposing(e) && e.key === 'Enter' && addChecklistItem()}
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
                    <MoveGroup>
                        <MoveLabel $theme={theme}>レーン:</MoveLabel>
                        <MoveSelect
                            value={card.columnId}
                            onChange={(e) => handleMoveToColumn(e.target.value)}
                            $theme={theme}
                            aria-label='レーンを移動'
                        >
                            {boardColumns.map((col) => (
                                <option key={col.id} value={col.id}>
                                    {col.title}
                                </option>
                            ))}
                        </MoveSelect>
                    </MoveGroup>
                    <AutoSaveHint $theme={theme}>変更は自動保存されます</AutoSaveHint>
                    <TrashActionButton onClick={handleMoveToTrash} aria-label='カードをゴミ箱へ移動'>
                        ゴミ箱へ
                    </TrashActionButton>
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
    min-width: 0;
    min-height: 32px;
    border: none;
    background: transparent;
    font-size: 22px;
    font-weight: 700;
    color: ${(props) => props.$theme.text};
    padding: 4px;

    @media (pointer: coarse) {
        min-height: 44px;
    }
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

    @media (pointer: coarse) {
        width: 44px;
        height: 44px;
    }
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

// #AAAAAA 直書きは白地で 2.32:1 と AA を大きく割る。テーマの二次テキスト色を使う(監査)
const ProgressText = styled.span<{ $theme: Theme }>`
    margin-left: 8px;
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};
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
    min-height: 28px;

    @media (pointer: coarse) {
        min-height: 44px;
        border-radius: 8px;
    }
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

const DueDateRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`

// iOSの日付ピッカーの「リセット」は React が拾えない change イベントのみ発火し
// 値が戻ってしまうため、期限の解除はこのボタンで行う(実機フィードバック対応)
const ClearDueDateButton = styled.button.attrs({ type: 'button' })<{ $theme: Theme }>`
    padding: 8px 12px;
    min-height: 36px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    background: transparent;
    color: ${(props) => props.$theme.textSecondary};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        background: ${(props) => props.$theme.surfaceHover};
        color: ${(props) => props.$theme.text};
    }

    @media (pointer: coarse) {
        min-height: 44px;
    }
`

const DueTimeInput = styled.input<{ $theme: Theme; $isDarkMode?: boolean }>`
    width: 120px;
    padding: 10px 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    font-size: 14px;
    color: ${(props) => props.$theme.text};
    background-color: ${(props) => props.$theme.inputBackground};
    color-scheme: ${(props) => (props.$isDarkMode ? 'dark' : 'light')};

    &:disabled {
        opacity: 0.5;
    }

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 2px;
    }
`

const DueDateInput = styled.input<{ $isOverdue?: boolean; $isDueSoon?: boolean; $theme: Theme; $isDarkMode?: boolean }>`
    flex: 1;
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

const WarningText = styled.div<{ $theme: Theme; $warning?: boolean }>`
    margin-top: 4px;
    font-size: 12px;
    color: ${(props) => (props.$warning ? props.$theme.warning : props.$theme.danger)};
    font-weight: 600;
`

const ColorPicker = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $theme: Theme }>`
    width: 40px;
    height: 32px;

    @media (pointer: coarse) {
        width: 48px;
        height: 40px;
    }
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

// Markdown表示の最小スタイル(見出し/リスト/コード/引用/リンク)
const MarkdownBody = styled.div<{ $theme: Theme }>`
    font-size: 14px;
    line-height: 1.6;
    color: ${(props) => props.$theme.text};
    word-break: break-word;

    > :first-child {
        margin-top: 0;
    }
    > :last-child {
        margin-bottom: 0;
    }

    h1,
    h2,
    h3,
    h4 {
        margin: 0.8em 0 0.4em;
        line-height: 1.3;
    }
    h1 {
        font-size: 1.3em;
    }
    h2 {
        font-size: 1.15em;
    }
    h3,
    h4 {
        font-size: 1em;
    }

    p {
        margin: 0.4em 0;
    }

    ul,
    ol {
        margin: 0.4em 0;
        padding-left: 1.4em;
    }

    li {
        margin: 0.15em 0;
    }

    /* GFMタスクリストのチェックボックス */
    li:has(> input[type='checkbox']) {
        list-style: none;
        margin-left: -1.2em;
    }

    code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.88em;
        background: ${(props) => props.$theme.surfaceHover};
        border: 1px solid ${(props) => props.$theme.border};
        border-radius: 4px;
        padding: 0.1em 0.35em;
    }

    pre {
        background: ${(props) => props.$theme.surfaceHover};
        border: 1px solid ${(props) => props.$theme.border};
        border-radius: 8px;
        padding: 10px 12px;
        overflow-x: auto;
        margin: 0.5em 0;

        code {
            background: transparent;
            border: none;
            padding: 0;
        }
    }

    blockquote {
        margin: 0.5em 0;
        padding: 0.2em 0.9em;
        border-left: 3px solid ${(props) => props.$theme.border};
        color: ${(props) => props.$theme.textSecondary};
    }

    a {
        color: ${(props) => props.$theme.linkColor};

        &:hover {
            color: ${(props) => props.$theme.linkColorHover};
        }
    }

    table {
        border-collapse: collapse;
        margin: 0.5em 0;
    }

    th,
    td {
        border: 1px solid ${(props) => props.$theme.border};
        padding: 4px 8px;
        font-size: 0.9em;
    }

    hr {
        border: none;
        border-top: 1px solid ${(props) => props.$theme.border};
        margin: 0.8em 0;
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
    width: 28px;
    height: 28px;
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

    /* タッチデバイスは hover が無いので常時表示+44px確保 */
    @media (hover: none) {
        opacity: 1;
    }

    @media (pointer: coarse) {
        width: 36px;
        height: 36px;
        font-size: 16px;
    }
`

const PasteHint = styled.div<{ $theme: Theme }>`
    margin-top: 6px;
    font-size: 12px;
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

    /* 幅の狭い画面ではテキスト領域を優先して余白を詰める */
    @media (max-width: 480px) {
        gap: 4px;
        padding: 8px 6px;
    }
    border-radius: 8px;
    background-color: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
    transition: background-color 0.15s;

    &:hover {
        background-color: ${(props) => props.$theme?.border || '#E0E0E0'};
    }
`

const Checkbox = styled.input`
    width: 20px;
    height: 20px;
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
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    cursor: grab;
    color: ${(props) => props.$theme?.textSecondary || color.Gray};
    font-size: 16px;
    padding: 0 4px;
    flex-shrink: 0;
    user-select: none;

    @media (pointer: coarse) {
        min-width: 36px;
        min-height: 40px;
    }

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
// チェックリスト行のアイコンボタン共通スタイル。
// 実機で「編集=枠付き44px/変換=28px/削除=40px」と大きさも見た目もバラバラだったため、
// 同一サイズ・同一スタイル・18pxグリフに統一する(iPhoneフィードバック対応)
const RowIconButton = styled.button.attrs({ type: 'button' })<{ $theme?: Theme; $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    min-height: 32px;
    padding: 4px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${(props) => props.$theme?.textSecondary || color.Gray};
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    transition:
        background-color 0.15s,
        color 0.15s;

    /* タッチデバイスでは :hover が「押した後も残る」(sticky hover)ため、hover対応環境に限定 */
    @media (hover: hover) {
        &:hover:not(:disabled) {
            background: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
            color: ${(props) => (props.$danger ? color.Red : props.$theme?.text || color.Black)};
        }
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (pointer: coarse) {
        min-width: 40px;
        min-height: 40px;
    }
`

const SmallButton = styled(RowIconButton)``

const DeleteItemButton = styled(RowIconButton).attrs({ $danger: true })``

const ConvertToCardButton = styled(RowIconButton)``

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
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.$theme.textSecondary};
`

const DateValue = styled.span<{ $theme: Theme }>`
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};
`

const Footer = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid ${(props) => props.$theme.border};
    background-color: ${(props) => props.$theme.surface};
    flex-shrink: 0;
`

const MoveGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`

const MoveLabel = styled.span<{ $theme: Theme }>`
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.$theme.textSecondary};
`

const MoveSelect = styled.select<{ $theme: Theme }>`
    padding: 8px 10px;
    min-height: 36px;

    @media (pointer: coarse) {
        min-height: 44px;
    }
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px;
    background: ${(props) => props.$theme.inputBackground};
    color: ${(props) => props.$theme.text};
    font-size: 13px;
    cursor: pointer;

    &:focus {
        outline: 2px solid ${color.Blue};
        outline-offset: 1px;
    }
`

const AutoSaveHint = styled.span<{ $theme: Theme }>`
    flex: 1;
    text-align: center;
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};
    opacity: 0.7;

    /* 幅の狭い画面では操作ボタンを優先する */
    @media (max-width: 480px) {
        display: none;
    }
`

const TrashActionButton = styled.button`
    padding: 8px 14px;
    min-height: 36px;

    @media (pointer: coarse) {
        min-height: 44px;
    }
    border: 1px solid ${color.Red}40;
    border-radius: 8px;
    background: ${color.Red}14;
    color: ${color.Red};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
        background: ${color.Red}26;
    }
`
