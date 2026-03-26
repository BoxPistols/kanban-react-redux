import { useState } from 'react'
import styled from 'styled-components'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import * as color from './color'
import { Card } from './Card'
import { PlusIcon } from './icon'
import { InputForm as _InputForm } from './InputForm'
import { useKanbanStore } from './store/kanbanStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import type { Card as CardType, ColumnType } from './types'

export function Column({
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
    const { addCard } = useKanbanStore()
    const { isDarkMode } = useThemeStore()
    const { setNodeRef } = useDroppable({ id })

    const theme = getTheme(isDarkMode)
    const [text, setText] = useState('')
    const [inputMode, setInputMode] = useState(false)

    const toggleInput = () => setInputMode((v) => !v)

    const confirmInput = async () => {
        if (text.trim() && boardId) {
            await addCard(text.trim(), id, boardId)
            setText('')
            setInputMode(false)
        }
    }

    const cancelInput = () => {
        setText('')
        setInputMode(false)
    }

    const cardIds = cards.map((card) => card.id)

    if (isCollapsed) {
        return (
            <CollapsedColumn
                ref={setNodeRef}
                onClick={onToggleCollapse}
                $theme={theme}
                $columnColor={columnColor}
                title={`${title} (${cards.length}) - クリックで展開`}
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
        <Container ref={setNodeRef} $theme={theme} $columnColor={columnColor} data-column-container>
            <HeaderBar $columnColor={columnColor} $theme={theme}>
                <CountBadge $theme={theme} $columnColor={columnColor}>
                    {cards.length}
                </CountBadge>
                <ColumnName $theme={theme} $columnColor={columnColor}>
                    {title}
                </ColumnName>
                {onToggleCollapse && (
                    <CollapseButton
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggleCollapse()
                        }}
                        $theme={theme}
                        $columnColor={columnColor}
                        title='レーンを畳む'
                    >
                        ‹
                    </CollapseButton>
                )}
                <AddButton onClick={toggleInput} $theme={theme} $columnColor={columnColor} />
            </HeaderBar>

            {inputMode && <InputForm value={text} onChange={setText} onConfirm={confirmInput} onCancel={cancelInput} />}

            <VerticalScroll>
                <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
                    {cards.map((card) => (
                        <Card key={card.id} card={card} />
                    ))}
                </SortableContext>
            </VerticalScroll>
        </Container>
    )
}

const Container = styled.div<{ $theme: Theme; $columnColor?: string }>`
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

    &:hover {
        box-shadow:
            0 2px 4px ${(props) => props.$theme.shadow},
            0 8px 24px ${(props) => props.$theme.shadowHover};
    }

    > :not(:last-child) {
        flex-shrink: 0;
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
    padding: 10px 12px;
    border-radius: 12px 12px 0 0;
    ${(props) => (props.$columnColor ? `background: ${props.$columnColor};` : '')}
`

const CountBadge = styled.div<{ $theme: Theme; $columnColor?: string }>`
    margin-right: 6px;
    border-radius: 4px;
    padding: 1px 6px;
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.9)' : props.$theme.textSecondary)};
    background: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.18)' : props.$theme.surface)};
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    font-variant-numeric: tabular-nums;
`

const ColumnName = styled.div<{ $theme: Theme; $columnColor?: string }>`
    color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.95)' : props.$theme.text)};
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
`

const AddButton = styled.button.attrs({
    type: 'button',
    children: <PlusIcon />,
})<{ $theme: Theme; $columnColor?: string }>`
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
    padding: 8px;
`

const VerticalScroll = styled.div`
    height: 100%;
    padding: 8px;
    overflow-y: auto;
    flex: 1 1 auto;

    > :not(:first-child) {
        margin-top: 8px;
    }
`

// --- 折りたたみ状態 ---
const CollapsedColumn = styled.div<{ $theme: Theme; $columnColor?: string }>`
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

    &:hover {
        background: ${(props) => props.$theme.surfaceHover};
        box-shadow: 0 4px 16px ${(props) => props.$theme.shadowHover};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    @media (max-width: 768px) {
        width: 38px;
        min-width: 38px;
    }
`

const CollapsedCount = styled.div<{ $theme: Theme; $columnColor?: string }>`
    font-size: 11px;
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

    &:hover {
        opacity: 1 !important;
        color: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 1)' : props.$theme.text)};
        background: ${(props) => (props.$columnColor ? 'rgba(255, 255, 255, 0.15)' : props.$theme.surfaceHover)};
    }
`
