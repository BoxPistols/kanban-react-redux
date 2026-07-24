import { useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { useDroppable } from '@dnd-kit/core'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import type { Board } from './types'

// カードのドラッグ中だけ画面下部に現れる「別ボードへ移動」のドロップ先ドック。
// カードをここのボードチップへドロップすると、そのボードへ移動する。
export function BoardDropZone({ visible }: { visible: boolean }) {
    const boards = useBoardStore((s) => s.boards)
    const currentBoardId = useBoardStore((s) => s.currentBoardId)
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)

    const others = boards.filter((b) => b.id !== currentBoardId)
    if (!visible || others.length === 0) return null

    return (
        <Dock $theme={theme} role='region' aria-label='別のボードへ移動'>
            <Hint $theme={theme}>別のボードへドロップで移動</Hint>
            <Chips>
                {others.map((b) => (
                    <BoardChip key={b.id} board={b} theme={theme} />
                ))}
            </Chips>
        </Dock>
    )
}

function BoardChip({ board, theme }: { board: Board; theme: Theme }) {
    // dnd-kit の data は毎レンダー新規生成しない(再計測ループ防止)
    const data = useMemo(() => ({ type: 'board', boardId: board.id }), [board.id])
    const { setNodeRef, isOver } = useDroppable({ id: `board-drop-${board.id}`, data })

    return (
        <Chip ref={setNodeRef} $over={isOver} $theme={theme}>
            <Dot $color={board.color || '#0079BF'} />
            <ChipName>{board.name}</ChipName>
        </Chip>
    )
}

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translate(-50%, 12px);
    }
    to {
        opacity: 1;
        transform: translate(-50%, 0);
    }
`

const Dock = styled.div<{ $theme: Theme }>`
    position: fixed;
    left: 50%;
    bottom: max(16px, env(safe-area-inset-bottom, 0));
    transform: translateX(-50%);
    z-index: 2500;
    display: flex;
    align-items: center;
    gap: 12px;
    max-width: calc(100vw - 24px);
    padding: 10px 14px;
    border-radius: 14px;
    background: ${(props) => props.$theme.surface};
    border: 1px solid ${(props) => props.$theme.border};
    box-shadow: 0 12px 40px ${(props) => props.$theme.shadowHover};
    animation: ${slideUp} 0.16s cubic-bezier(0.2, 0.8, 0.2, 1);

    @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
`

const Hint = styled.span<{ $theme: Theme }>`
    font-size: 12px;
    font-weight: 600;
    color: ${(props) => props.$theme.textSecondary};
    white-space: nowrap;
`

const Chips = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    max-width: 100%;
`

const Chip = styled.div<{ $over: boolean; $theme: Theme }>`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
    background: ${(props) => (props.$over ? props.$theme.surfaceHover : 'transparent')};
    border: 1.5px dashed ${(props) => (props.$over ? '#2196f3' : props.$theme.border)};
    transform: ${(props) => (props.$over ? 'scale(1.04)' : 'scale(1)')};
    transition:
        background 0.12s,
        border-color 0.12s,
        transform 0.12s;
`

const Dot = styled.span<{ $color: string }>`
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: ${(props) => props.$color};
    flex-shrink: 0;
`

const ChipName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
`
