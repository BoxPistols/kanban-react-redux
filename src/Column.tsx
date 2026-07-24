import { useState, memo, useMemo, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { Card } from './Card'
import { PlusIcon, EditIcon } from './icon'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import { InputForm as _InputForm } from './InputForm'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import { isComposing } from './utils/keyboard'
import { touchTargetExpand, visibleWithoutHover } from './a11yStyles'
import type { Card as CardType, ColumnType } from './types'

export const Column = memo(function Column({
    id,
    title,
    cards,
    boardId,
    columnColor,
    isCollapsed,
    onToggleCollapse,
}: {
    id: ColumnType
    title: string
    cards: CardType[]
    boardId: string
    columnColor?: string
    isCollapsed?: boolean
    onToggleCollapse?: () => void
}) {
    // 必要なアクションだけ購読する(全ストア購読だと cardCounts 等の無関係な変化でも
    // レーンごと再描画され、ドラッグ中の dnd-kit 再計測を増やしてしまう)。
    const addCard = useKanbanStore((s) => s.addCard)
    const updateColumn = useBoardStore((s) => s.updateColumn)
    const { isDarkMode } = useThemeStore()

    // dnd-kit の data は毎レンダー新規生成しない(再登録・再計測でドラッグがループするため)
    const columnData = useMemo(() => ({ type: 'column' as const }), [])

    // レーン自体もボード上で直接ドラッグして並べ替えられるようにする(Trello同等)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isColumnDragging,
    } = useSortable({
        id,
        data: columnData,
    })

    const sortableStyle = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    const theme = getTheme(isDarkMode)
    const [text, setText] = useState('')
    const [inputMode, setInputMode] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editTitle, setEditTitle] = useState(title)
    const scrollRef = useRef<HTMLDivElement>(null)
    const titleInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditingTitle) {
            titleInputRef.current?.focus()
            titleInputRef.current?.select()
        }
    }, [isEditingTitle])

    const openInput = useCallback(() => setInputMode(true), [])

    // 追加後もコンポーザーを開いたままにして連続入力できるようにする。
    // カードは末尾に追加されるため、追加後は末尾へスクロールして見失わないようにする。
    const confirmInput = useCallback(async () => {
        if (text.trim() && boardId) {
            setText('')
            await addCard(text.trim(), id, boardId)
            requestAnimationFrame(() => {
                const el = scrollRef.current
                if (el) el.scrollTop = el.scrollHeight
            })
        }
    }, [text, boardId, addCard, id])

    const cancelInput = useCallback(() => {
        setText('')
        setInputMode(false)
    }, [])

    const saveTitle = useCallback(() => {
        const next = editTitle.trim()
        if (next && next !== title) {
            updateColumn(boardId, id, { title: next })
        } else {
            setEditTitle(title)
        }
        setIsEditingTitle(false)
    }, [editTitle, title, updateColumn, boardId, id])

    const cardIds = useMemo(() => cards.map((card) => card.id), [cards])

    // レーンヘッダの右クリック(コンテキストメニュー)
    const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

    const beginEditTitle = useCallback(() => {
        setEditTitle(title)
        setIsEditingTitle(true)
    }, [title])

    const openColumnMenu = useCallback(
        (e: React.MouseEvent) => {
            if (isEditingTitle) return
            e.preventDefault()
            e.stopPropagation()
            setMenuPos({ x: e.clientX, y: e.clientY })
        },
        [isEditingTitle]
    )

    const buildColumnMenu = (): ContextMenuItem[] => {
        const items: ContextMenuItem[] = [
            { id: 'add', label: 'カードを追加', icon: <PlusIcon />, onClick: openInput },
            { id: 'rename', label: 'レーン名を編集', icon: <EditIcon />, onClick: beginEditTitle },
        ]
        if (onToggleCollapse) {
            items.push({ id: 'collapse', label: 'レーンを畳む', onClick: onToggleCollapse })
        }
        return items
    }

    if (isCollapsed) {
        return (
            <CollapsedColumn
                ref={setNodeRef}
                style={sortableStyle}
                onClick={onToggleCollapse}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggleCollapse?.()
                    }
                }}
                role='button'
                tabIndex={0}
                $theme={theme}
                $columnColor={columnColor}
                $isDragging={isColumnDragging}
                title={`${title} (${cards.length}) - クリックまたはEnterキーで展開`}
                aria-label={`${title} (${cards.length}) - クリックまたはEnterキーで展開`}
            >
                <CollapsedCount $theme={theme} $columnColor={columnColor}>
                    {cards.length}
                </CollapsedCount>
                <CollapsedDivider $theme={theme} $columnColor={columnColor} />
                <CollapsedTitle $theme={theme}>{title}</CollapsedTitle>
            </CollapsedColumn>
        )
    }

    return (
        <Container
            ref={setNodeRef}
            style={sortableStyle}
            $theme={theme}
            $columnColor={columnColor}
            $isDragging={isColumnDragging}
            data-column-container
        >
            {/* ヘッダーがレーンのドラッグハンドル。タイトルのダブルクリックでその場改名 */}
            <HeaderBar
                $columnColor={columnColor}
                $theme={theme}
                {...attributes}
                {...listeners}
                onContextMenu={openColumnMenu}
            >
                <CountBadge $theme={theme} $columnColor={columnColor}>
                    {cards.length}
                </CountBadge>
                {isEditingTitle ? (
                    <TitleEditInput
                        ref={titleInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(e) => {
                            // HeaderBar の KeyboardSensor(Enter/Spaceでドラッグ開始)に
                            // バブルさせない。伝播するとレーンのキーボードドラッグが誤起動する
                            e.stopPropagation()
                            if (isComposing(e)) return
                            if (e.key === 'Enter') saveTitle()
                            if (e.key === 'Escape') {
                                setEditTitle(title)
                                setIsEditingTitle(false)
                            }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        $theme={theme}
                        $columnColor={columnColor}
                        aria-label='レーン名を編集'
                    />
                ) : (
                    <ColumnName
                        $theme={theme}
                        $columnColor={columnColor}
                        onDoubleClick={() => {
                            setEditTitle(title)
                            setIsEditingTitle(true)
                        }}
                        title='ダブルクリックで名前を変更'
                    >
                        {title}
                    </ColumnName>
                )}
                {onToggleCollapse && (
                    <CollapseButton
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleCollapse()
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        $theme={theme}
                        $columnColor={columnColor}
                        title='レーンを畳む'
                        aria-label='レーンを畳む'
                    >
                        ‹
                    </CollapseButton>
                )}
                <AddButton
                    onClick={openInput}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    $theme={theme}
                    $columnColor={columnColor}
                    aria-label='カードを追加'
                />
            </HeaderBar>

            {menuPos && (
                <ContextMenu x={menuPos.x} y={menuPos.y} items={buildColumnMenu()} onClose={() => setMenuPos(null)} />
            )}

            <VerticalScroll ref={scrollRef}>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {cards.map((card) => (
                        <Card key={card.id} card={card} />
                    ))}
                </SortableContext>
            </VerticalScroll>

            {/* 追加導線はリスト末尾に常設(追加位置と入力位置を一致させる) */}
            <ComposerArea>
                {inputMode ? (
                    <InputForm value={text} onChange={setText} onConfirm={confirmInput} onCancel={cancelInput} />
                ) : (
                    <AddCardButton onClick={openInput} $theme={theme} data-add-card-button>
                        <PlusIcon />
                        カードを追加
                    </AddCardButton>
                )}
            </ComposerArea>
        </Container>
    )
})

const Container = styled.div<{ $theme: Theme; $columnColor?: string; $isDragging?: boolean }>`
    display: flex;
    flex-flow: column;
    width: 340px;
    height: 100%;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 12px;
    background: ${(props) => props.$theme.surfaceGlass};
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    position: relative;
    z-index: 0;
    box-shadow: 0 1px 3px ${(props) => props.$theme.shadow};
    transition: box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: ${(props) => (props.$isDragging ? 0.4 : 1)};

    &:hover {
        box-shadow:
            0 2px 4px ${(props) => props.$theme.shadow},
            0 8px 24px ${(props) => props.$theme.shadowHover};
    }

    @media (max-width: 768px) {
        width: 280px;
        min-width: 280px;
    }

    @media (max-width: 480px) {
        width: 260px;
        min-width: 260px;
    }
`

const HeaderBar = styled.div<{ $columnColor?: string; $theme: Theme }>`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-shrink: 0;
    padding: 10px 12px;
    border-radius: 12px 12px 0 0;
    cursor: grab;
    touch-action: none;
    ${(props) => (props.$columnColor ? `background: ${props.$columnColor};` : '')}

    &:active {
        cursor: grabbing;
    }
`

const CountBadge = styled.div<{ $theme: Theme; $columnColor?: string }>`
    margin-right: 6px;
    border-radius: 4px;
    padding: 1px 6px;
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.9)' : props.$theme.textSecondary)};
    background: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.18)' : props.$theme.surface)};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
`

const ColumnName = styled.div<{ $theme: Theme; $columnColor?: string }>`
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.95)' : props.$theme.text)};
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
`

const TitleEditInput = styled.input<{ $theme: Theme; $columnColor?: string }>`
    flex: 1;
    min-width: 0;
    border: none;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 14px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
    background: ${(props) => props.$theme.inputBackground};
    outline: 2px solid ${color.Blue};
`

const AddButton = styled.button.attrs({
    type: 'button',
    children: <PlusIcon />,
})<{ $theme: Theme; $columnColor?: string }>`
    ${touchTargetExpand}
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    min-height: 26px;
    margin-left: auto;
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.7)' : props.$theme.textSecondary)};
    padding: 4px;
    border-radius: 6px;
    transition: all 0.15s;

    :hover {
        color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 1)' : color.Blue)};
        background: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.15)' : props.$theme.surfaceHover)};
    }
`

const InputForm = styled(_InputForm)`
    padding: 0;
`

const VerticalScroll = styled.div`
    /* コンポーザーを末尾に置いても収まるよう、リスト部分だけが伸縮してスクロールする */
    flex: 1 1 auto;
    min-height: 0;
    padding: 8px;
    overflow-y: auto;

    > :not(:first-child) {
        margin-top: 8px;
    }
`

const ComposerArea = styled.div`
    flex-shrink: 0;
    padding: 8px;
    border-radius: 0 0 12px 12px;
`

const AddCardButton = styled.button<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 9px 10px;
    min-height: 36px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${(props) => props.$theme.textSecondary};
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;

    @media (pointer: coarse) {
        min-height: 44px;
    }

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover {
        background: ${(props) => props.$theme.surfaceHover};
        color: ${(props) => props.$theme.text};
    }
`

// --- 折りたたみ状態 ---
const CollapsedColumn = styled.div<{ $theme: Theme; $columnColor?: string; $isDragging?: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 44px;
    min-width: 44px;
    height: 100%;
    border-radius: 12px;
    background: ${(props) =>
        props.$columnColor
            ? `linear-gradient(180deg, ${props.$columnColor}20 0%, transparent 40%), ${props.$theme.surfaceGlass}`
            : props.$theme.surfaceGlass};
    backdrop-filter: blur(16px) saturate(1.2);
    -webkit-backdrop-filter: blur(16px) saturate(1.2);
    border: 1px solid ${(props) => props.$theme.border};
    box-shadow: 0 1px 3px ${(props) => props.$theme.shadow};
    cursor: pointer;
    padding: 14px 0;
    gap: 8px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 0;
    opacity: ${(props) => (props.$isDragging ? 0.4 : 1)};

    &:hover {
        background: ${(props) => props.$theme.surfaceHover};
        box-shadow: 0 4px 16px ${(props) => props.$theme.shadowHover};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    /* 折りたたみレーン全体がタップターゲットなので44px幅を維持する(HIG) */
`

const CollapsedCount = styled.div<{ $theme: Theme; $columnColor?: string }>`
    font-size: 12px;
    font-weight: 700;
    color: ${(props) => (props.$columnColor ? '#fff' : props.$theme.text)};
    background: ${(props) => props.$columnColor || props.$theme.surface};
    border-radius: 20px;
    padding: 3px 7px;
    line-height: 1.2;
    flex-shrink: 0;
    box-shadow: ${(props) => (props.$columnColor ? `0 2px 6px ${props.$columnColor}40` : 'none')};
`

const CollapsedDivider = styled.div<{ $theme: Theme; $columnColor?: string }>`
    width: 18px;
    height: 1px;
    background: ${(props) =>
        props.$columnColor
            ? `linear-gradient(90deg, transparent, ${props.$columnColor}, transparent)`
            : `linear-gradient(90deg, transparent, ${props.$theme.border}, transparent)`};
    flex-shrink: 0;
`

const CollapsedTitle = styled.div<{ $theme: Theme }>`
    writing-mode: vertical-rl;
    text-orientation: mixed;
    color: ${(props) => props.$theme.text};
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: calc(100% - 60px);
    user-select: none;
    opacity: 0.85;
`

const CollapseButton = styled.button<{ $theme: Theme; $columnColor?: string }>`
    ${touchTargetExpand}
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    min-height: 26px;
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.5)' : props.$theme.textSecondary)};
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
    opacity: 0;
    transition: all 0.15s ease;

    [data-column-container]:hover & {
        opacity: 0.5;
    }

    /* タッチデバイスは hover が無いので常時表示する */
    ${visibleWithoutHover(0.45)}

    &:hover {
        opacity: 1 !important;
        color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 1)' : props.$theme.text)};
        background: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.15)' : props.$theme.surfaceHover)};
    }

    /* キーボードフォーカス時も表示（opacity:0 だと focus-visible の輪郭が見えない: 監査） */
    &:focus-visible {
        opacity: 1 !important;
        color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 1)' : props.$theme.text)};
    }
`
