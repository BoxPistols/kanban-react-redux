import { useState, useRef, useEffect, useMemo, memo, lazy, Suspense } from 'react'
import styled from 'styled-components'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { TrashIcon, CalendarIcon, ListIcon, DocumentIcon, EditIcon, BoardIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import { getDueDateStatus } from './utils/dateUtils'
import { isComposing } from './utils/keyboard'
import { LinkedText } from './LinkedText'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import type { Card as CardType } from './types'

// 遅延ロード: CardDetailModal
const CardDetailModal = lazy(() => import('./CardDetailModal').then((m) => ({ default: m.CardDetailModal })))

// カード面のプレビュー用に Markdown 記号を落とす簡易ストリップ
// (正確なパースは不要。見出し/強調/コード/リスト/引用/リンクの記号だけ除去する)
function stripMarkdownSyntax(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^>\s?/gm, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\n{2,}/g, '\n')
        .trim()
}

export const Card = memo(function Card({ card, isDragging = false }: { card: CardType; isDragging?: boolean }) {
    // Zustand は必要なスライスだけ購読する。セレクタ無しの全ストア購読にすると
    // 無関係な state 変化でも全カードが再描画され、そのたびに dnd-kit へ新しい
    // data オブジェクトが渡って再計測が走り、ドラッグ確定時に再計測ループ
    // (Maximum update depth)を誘発する(#98/#101)。
    const trashCard = useKanbanStore((s) => s.trashCard)
    const updateCard = useKanbanStore((s) => s.updateCard)
    const moveCardsToBoard = useKanbanStore((s) => s.moveCardsToBoard)
    const isDarkMode = useThemeStore((s) => s.isDarkMode)
    const [showModal, setShowModal] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    // 右クリックのコンテキストメニュー位置(null = 非表示)
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
    const editInputRef = useRef<HTMLTextAreaElement>(null)

    const theme = getTheme(isDarkMode)

    // useSortable の data は毎レンダー新規生成すると dnd-kit が登録し直して再計測するため、
    // card が変わった時だけ作り直す(無関係な再描画で drop がループしないように)。
    const sortableData = useMemo(() => ({ type: 'card' as const, card }), [card])

    // DragOverlay 内のクローン(isDragging prop 付き)が本物と同じ id で登録すると、
    // draggable/droppable の登録マップを奪い合い「ドロップ直後のドラッグが無反応」になる。
    // クローンはプレゼンテーション専用として別 id + disabled で登録を無害化する(#98)。
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging,
    } = useSortable({
        id: isDragging ? `overlay-${card.id}` : card.id,
        data: sortableData,
        disabled: isEditingTitle || isDragging,
    })

    useEffect(() => {
        if (isEditingTitle) {
            editInputRef.current?.focus()
            editInputRef.current?.select()
        }
    }, [isEditingTitle])

    // 削除は confirm を挟まず即ゴミ箱へ。トーストの「元に戻す」/Cmd+Z で復元できる
    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await trashCard(card.id)
    }

    const displayText = card.title || card.text

    const beginTitleEdit = () => {
        setEditTitle(displayText)
        setIsEditingTitle(true)
    }

    const startEditTitle = (e: React.MouseEvent) => {
        e.stopPropagation()
        beginTitleEdit()
    }

    // 右クリックでコンテキストメニューを開く
    const openContextMenu = (e: React.MouseEvent) => {
        if (isEditingTitle) return
        e.preventDefault()
        e.stopPropagation()
        setMenuPos({ x: e.clientX, y: e.clientY })
    }

    // メニュー項目を組み立てる(開いている時のみ呼ぶ)
    const buildMenuItems = (): ContextMenuItem[] => {
        // メニューを開いた瞬間の値を読む(常時購読しないことで無関係な再描画を避ける)
        const { boards, currentBoardId } = useBoardStore.getState()
        const otherBoards = boards.filter((b) => b.id !== currentBoardId)
        return [
            { id: 'open', label: '詳細を開く', icon: <DocumentIcon />, onClick: () => setShowModal(true) },
            { id: 'edit', label: 'タイトルを編集', icon: <EditIcon />, onClick: beginTitleEdit },
            {
                id: 'move',
                label: '別のボードへ移動',
                icon: <BoardIcon />,
                disabled: otherBoards.length === 0,
                submenu: otherBoards.map((b) => ({
                    id: `move-${b.id}`,
                    label: b.name,
                    colorDot: b.color || '#0079BF',
                    onClick: () => void moveCardsToBoard([card.id], b.id),
                })),
            },
            { id: 'sep', separator: true },
            {
                id: 'trash',
                label: 'ゴミ箱へ移動',
                icon: <TrashIcon />,
                danger: true,
                onClick: () => void trashCard(card.id),
            },
        ]
    }

    const saveTitle = async () => {
        const next = editTitle.trim()
        setIsEditingTitle(false)
        if (next && next !== displayText) {
            // title と text を同時に更新して二重管理による「見えないテキスト」を残さない
            await updateCard(card.id, { title: next, text: next })
        }
    }

    const handleCardClick = (e: React.MouseEvent) => {
        // Don't open modal if clicking delete button or dragging
        if ((e.target as HTMLElement).closest('button')) return
        if (isEditingTitle) return
        setShowModal(true)
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const hasLabels = card.labels && card.labels.length > 0
    const hasChecklist = card.checklist && card.checklist.length > 0
    const hasDueDate = card.dueDate
    const hasImages = card.images && card.images.length > 0
    const completedItems = card.checklist?.filter((item) => item.completed).length || 0
    const totalItems = card.checklist?.length || 0
    const { isDueSoon, isOverdue } = getDueDateStatus(card.dueDate)

    // Get description preview (first 80 characters)
    // プレビューでは Markdown 記号を除去してプレーンテキストで見せる
    const plainDescription = card.description ? stripMarkdownSyntax(card.description) : null
    const descriptionPreview = plainDescription
        ? plainDescription.length > 80
            ? plainDescription.slice(0, 80) + '...'
            : plainDescription
        : null

    return (
        <>
            <Container
                ref={setNodeRef}
                style={style}
                $isDragging={isDragging || isSortableDragging}
                $theme={theme}
                onClick={handleCardClick}
                onContextMenu={openContextMenu}
                data-card-container
                {...listeners}
                {...attributes}
            >
                {card.color && <CardCover $color={card.color} />}

                <CardBody>
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
                            {isEditingTitle ? (
                                <TitleEditArea
                                    ref={editInputRef}
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onBlur={saveTitle}
                                    onKeyDown={(e) => {
                                        // カード本体の KeyboardSensor にバブルさせない(ドラッグ誤起動防止)
                                        e.stopPropagation()
                                        if (isComposing(e)) return
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            saveTitle()
                                        }
                                        if (e.key === 'Escape') {
                                            setIsEditingTitle(false)
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    rows={2}
                                    $theme={theme}
                                    aria-label='カードタイトルを編集'
                                />
                            ) : (
                                <Title $theme={theme}>{displayText}</Title>
                            )}
                            {descriptionPreview && !isEditingTitle && (
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
                                <ImageThumb key={img.id} src={img.dataUrl} alt='' loading='lazy' />
                            ))}
                            {card.images!.length > 3 && (
                                <MoreImages $theme={theme}>+{card.images!.length - 3}</MoreImages>
                            )}
                        </ImageThumbnailRow>
                    )}

                    <MetadataRow>
                        {hasDueDate && (
                            <DueDateBadge $theme={theme} $isOverdue={isOverdue} $isDueSoon={isDueSoon && !isOverdue}>
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
                            <ChecklistBadge $theme={theme} $allCompleted={completedItems === totalItems}>
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
                </CardBody>

                <HoverActions>
                    <ActionIconButton
                        onClick={startEditTitle}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        $theme={theme}
                        title='タイトルを編集'
                        aria-label='カードタイトルを編集'
                    >
                        <EditIcon />
                    </ActionIconButton>
                    <ActionIconButton
                        onClick={handleDelete}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        $theme={theme}
                        $danger
                        title='ゴミ箱へ移動'
                        aria-label='カードをゴミ箱へ移動'
                    >
                        <TrashIcon />
                    </ActionIconButton>
                </HoverActions>
            </Container>

            {menuPos && (
                <ContextMenu x={menuPos.x} y={menuPos.y} items={buildMenuItems()} onClose={() => setMenuPos(null)} />
            )}

            {showModal && (
                <ChunkErrorBoundary>
                    <Suspense fallback={null}>
                        <CardDetailModal card={card} onClose={() => setShowModal(false)} />
                    </Suspense>
                </ChunkErrorBoundary>
            )}
        </>
    )
})

const Container = styled.div<{ $isDragging?: boolean; $theme: Theme }>`
    position: relative;
    z-index: 0;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: ${(props) => props.$theme.cardBorderRadius};
    box-shadow: 0 1px 3px ${(props) => props.$theme.shadow};
    background: ${(props) => props.$theme.cardBackground};
    color: ${(props) => props.$theme.text};
    cursor: pointer;
    opacity: ${(props) => (props.$isDragging ? 0.4 : 1)};
    /* manipulation にすることでタッチでも縦スクロールを妨げない。
       ドラッグ開始は TouchSensor の長押し判定(App側)に任せる */
    touch-action: manipulation;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition:
        box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        box-shadow: 0 4px 16px ${(props) => props.$theme.shadowHover};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
`

const CardCover = styled.div<{ $color: string }>`
    height: 8px;
    background: ${(props) => props.$color};
    flex-shrink: 0;
    opacity: 0.85;
`

const CardBody = styled.div`
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`

const LabelsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
`

// ラベルは名前が読める大きさで表示する(旧: 高さ6px/font-size:0 で判読不能だった)
const LabelBadge = styled.div<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    padding: 2px 8px;
    border-radius: 10px;
    background: ${(props) => props.$color};
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.6;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
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
    color: ${(props) => props.$theme.text};
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    word-break: break-word;
    letter-spacing: -0.01em;
`

const TitleEditArea = styled.textarea<{ $theme: Theme }>`
    width: 100%;
    border: 1px solid ${color.Blue};
    border-radius: 6px;
    padding: 4px 6px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    color: ${(props) => props.$theme.text};
    background: ${(props) => props.$theme.inputBackground};
    resize: none;
    font-family: inherit;

    &:focus {
        outline: none;
    }
`

// opacity で薄めると light で 3.88:1 / dark で 4.43:1 となり AA(4.5:1)を割るため、
// トークン色をそのまま使う(トークン自体が二次テキストとして十分に淡い)
const Description = styled.div<{ $theme: Theme }>`
    color: ${(props) => props.$theme.textSecondary};
    font-size: 12px;
    line-height: 1.4;
    word-break: break-word;
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
    font-size: 12px;
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
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.02em;

    svg {
        width: 12px;
        height: 12px;
    }
`

// バッジは opacity で薄めない。地色との実効コントラストが AA を割るため、
// 「控えめに見せる」のは opacity ではなく textSecondary トークンで表現する(監査)。
const DueDateBadge = styled.div<{ $theme: Theme; $isOverdue?: boolean; $isDueSoon?: boolean }>`
    ${MetaBadge}
    background: ${(props) =>
        props.$isOverdue
            ? `${props.$theme.danger}20`
            : props.$isDueSoon
              ? `${props.$theme.warning}20`
              : 'rgba(128, 128, 128, 0.12)'};
    color: ${(props) =>
        props.$isOverdue ? props.$theme.danger : props.$isDueSoon ? props.$theme.warning : props.$theme.textSecondary};
`

const ChecklistBadge = styled.div<{ $theme: Theme; $allCompleted: boolean }>`
    ${MetaBadge}
    background: ${(props) => (props.$allCompleted ? `${props.$theme.success}20` : 'rgba(128, 128, 128, 0.12)')};
    color: ${(props) => (props.$allCompleted ? props.$theme.success : props.$theme.textSecondary)};
`

const DescriptionBadge = styled.div<{ $theme: Theme }>`
    ${MetaBadge}
    background: rgba(128, 128, 128, 0.1);
    color: ${(props) => props.$theme.textSecondary};
`

const HoverActions = styled.div`
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 2px;

    /* タッチデバイスでは非表示にする。hover前提の透明ボタンを残すと
       「見えないのにタップで削除される」事故になるため。
       タイトル編集・削除は詳細モーダルから行える(Trelloモバイルと同様) */
    @media (hover: none) {
        display: none;
    }
`

const ActionIconButton = styled.button<{ $theme: Theme; $danger?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    min-height: 26px;
    color: ${(props) => props.$theme.textSecondary};
    background: ${(props) => props.$theme.cardBackground};
    border-radius: 6px;
    padding: 4px;
    opacity: 0;
    transition:
        opacity 0.15s,
        color 0.15s;

    svg {
        display: block;
        width: 14px;
        height: 14px;
    }

    ${Container}:hover & {
        opacity: 0.7;
    }

    :hover {
        color: ${(props) => (props.$danger ? color.Red : color.Blue)};
        opacity: 1 !important;
    }

    /* キーボードフォーカス時も表示。opacity:0 のままだと focus-visible の輪郭も隠れる(監査) */
    &:focus-visible {
        color: ${(props) => (props.$danger ? color.Red : color.Blue)};
        opacity: 1 !important;
    }
`
