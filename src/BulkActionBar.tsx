import { useState } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'

// 選択モード中に表示する一括移動ツールバー。
// カードを複数選択 → 移動先ボードを選び「移動」で別ボードへまとめて移す。
export function BulkActionBar() {
    const isSelectMode = useKanbanStore((s) => s.isSelectMode)
    const selectedCardIds = useKanbanStore((s) => s.selectedCardIds)
    const clearSelection = useKanbanStore((s) => s.clearSelection)
    const moveCardsToBoard = useKanbanStore((s) => s.moveCardsToBoard)
    const boards = useBoardStore((s) => s.boards)
    const currentBoardId = useBoardStore((s) => s.currentBoardId)
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const [targetBoardId, setTargetBoardId] = useState('')

    if (!isSelectMode) return null

    const otherBoards = boards.filter((b) => b.id !== currentBoardId)
    const count = selectedCardIds.length
    const canMove = count > 0 && targetBoardId !== ''

    const handleMove = async () => {
        if (!canMove) return
        await moveCardsToBoard(selectedCardIds, targetBoardId)
        setTargetBoardId('')
    }

    return (
        <Bar $theme={theme} role='region' aria-label='カードの一括移動'>
            <Info $theme={theme}>{count > 0 ? `${count}件を選択中` : 'カードを選んでください'}</Info>
            <Right>
                <BoardSelect
                    $theme={theme}
                    value={targetBoardId}
                    onChange={(e) => setTargetBoardId(e.target.value)}
                    aria-label='移動先ボード'
                    disabled={otherBoards.length === 0}
                >
                    <option value=''>
                        {otherBoards.length === 0 ? '移動先ボードがありません' : '移動先ボードを選択'}
                    </option>
                    {otherBoards.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </BoardSelect>
                <MoveButton onClick={handleMove} disabled={!canMove}>
                    移動
                </MoveButton>
                <CancelButton $theme={theme} onClick={clearSelection}>
                    完了
                </CancelButton>
            </Right>
        </Bar>
    )
}

const Bar = styled.div<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 8px 16px;
    background: ${(props) => props.$theme.surfaceHover};
    border-bottom: 1px solid ${(props) => props.$theme.border};
    flex-shrink: 0;
`

const Info = styled.div<{ $theme: Theme }>`
    color: ${(props) => props.$theme.text};
    font-size: 13px;
    font-weight: 600;
`

const Right = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
`

const BoardSelect = styled.select<{ $theme: Theme }>`
    height: 32px;
    max-width: 200px;
    padding: 0 8px;
    border-radius: 6px;
    border: 1px solid ${(props) => props.$theme.border};
    background: ${(props) => props.$theme.inputBackground};
    color: ${(props) => props.$theme.text};
    font-size: 13px;
    cursor: pointer;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`

const MoveButton = styled.button`
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: ${color.Blue};
    color: ${color.White};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`

const CancelButton = styled.button<{ $theme: Theme }>`
    height: 32px;
    padding: 0 12px;
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 6px;
    background: transparent;
    color: ${(props) => props.$theme.textSecondary};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
        background: ${(props) => props.$theme.border};
    }
`
