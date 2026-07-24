import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'
import { BoardModal } from './BoardModal'
import { EditIcon } from './icon'

// お気に入りボードの localStorage キー
const FAVORITES_KEY = 'kanban-favorite-boards'

function loadFavorites(): Set<string> {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY)
        return new Set(stored ? (JSON.parse(stored) as string[]) : [])
    } catch {
        return new Set()
    }
}

function saveFavorites(favorites: Set<string>): void {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
    } catch {
        /* 保存失敗時は無視 */
    }
}

// ボード切替: ネイティブ<select>ではボードの色や説明が見えないため、
// カラータイル+説明+スター付きのポップオーバーに刷新(Trelloのボードメニュー相当)
export const BoardSelector = memo(function BoardSelector() {
    const { boards, currentBoardId, setCurrentBoardId } = useBoardStore()
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const [isOpen, setIsOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBoard, setEditingBoard] = useState<string | null>(null)
    const [favorites, setFavorites] = useState<Set<string>>(loadFavorites)
    const containerRef = useRef<HTMLDivElement>(null)

    const currentBoard = useMemo(() => boards.find((b) => b.id === currentBoardId), [boards, currentBoardId])

    // お気に入りを先頭に、それ以外は作成順のまま並べる
    const sortedBoards = useMemo(() => {
        const fav = boards.filter((b) => favorites.has(b.id))
        const rest = boards.filter((b) => !favorites.has(b.id))
        return [...fav, ...rest]
    }, [boards, favorites])

    // 外側クリック・ESCで閉じる
    useEffect(() => {
        if (!isOpen) return
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('click', handleClick)
        document.addEventListener('keydown', handleEsc)
        return () => {
            document.removeEventListener('click', handleClick)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isOpen])

    const toggleFavorite = useCallback((e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        setFavorites((prev) => {
            const next = new Set(prev)
            if (next.has(boardId)) {
                next.delete(boardId)
            } else {
                next.add(boardId)
            }
            saveFavorites(next)
            return next
        })
    }, [])

    const handleSelect = useCallback(
        (boardId: string) => {
            setCurrentBoardId(boardId)
            setIsOpen(false)
        },
        [setCurrentBoardId]
    )

    const handleEditBoard = useCallback((e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        setEditingBoard(boardId)
        setIsModalOpen(true)
        setIsOpen(false)
    }, [])

    const handleCloseModal = useCallback(() => {
        setIsModalOpen(false)
        setEditingBoard(null)
    }, [])

    return (
        <>
            <Container ref={containerRef}>
                <TriggerButton
                    onClick={() => setIsOpen((v) => !v)}
                    aria-haspopup='listbox'
                    aria-expanded={isOpen}
                    aria-label='ボード選択'
                >
                    {currentBoard?.color && <ColorDot $color={currentBoard.color} />}
                    <TriggerName>{currentBoard?.name || 'ボードを作成してください'}</TriggerName>
                    <Chevron $open={isOpen}>▾</Chevron>
                </TriggerButton>

                {isOpen && (
                    <Popover $theme={theme} role='listbox' aria-label='ボード一覧'>
                        <PopoverTitle $theme={theme}>ボード</PopoverTitle>
                        <BoardList>
                            {sortedBoards.map((board) => {
                                const isCurrent = board.id === currentBoardId
                                const isFavorite = favorites.has(board.id)
                                return (
                                    <BoardRow
                                        key={board.id}
                                        $theme={theme}
                                        $isCurrent={isCurrent}
                                        onClick={() => handleSelect(board.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleSelect(board.id)
                                            }
                                        }}
                                        role='option'
                                        aria-selected={isCurrent}
                                        tabIndex={0}
                                    >
                                        <BoardColorBar $color={board.color || '#0079BF'} />
                                        <BoardInfo>
                                            <BoardName $theme={theme}>{board.name}</BoardName>
                                            {board.description && (
                                                <BoardDescription $theme={theme}>{board.description}</BoardDescription>
                                            )}
                                        </BoardInfo>
                                        <RowActions data-row-actions>
                                            <StarButton
                                                onClick={(e) => toggleFavorite(e, board.id)}
                                                $active={isFavorite}
                                                $theme={theme}
                                                title={isFavorite ? 'お気に入りから外す' : 'お気に入りに追加'}
                                                aria-label={
                                                    isFavorite
                                                        ? `「${board.name}」をお気に入りから外す`
                                                        : `「${board.name}」をお気に入りに追加`
                                                }
                                            >
                                                {isFavorite ? '★' : '☆'}
                                            </StarButton>
                                            <RowEditButton
                                                onClick={(e) => handleEditBoard(e, board.id)}
                                                $theme={theme}
                                                title='ボードを編集'
                                                aria-label={`「${board.name}」を編集`}
                                            >
                                                <EditIcon />
                                            </RowEditButton>
                                        </RowActions>
                                    </BoardRow>
                                )
                            })}
                        </BoardList>
                        <PopoverFooter $theme={theme}>
                            <CreateBoardButton
                                onClick={() => {
                                    setIsOpen(false)
                                    setIsModalOpen(true)
                                }}
                            >
                                + 新しいボードを作成
                            </CreateBoardButton>
                        </PopoverFooter>
                    </Popover>
                )}
            </Container>

            {isModalOpen && <BoardModal boardId={editingBoard} onClose={handleCloseModal} />}
        </>
    )
})

const Container = styled.div`
    position: relative;
    margin-left: 12px;

    @media (max-width: 768px) {
        margin-left: 0;
        width: 100%;
    }
`

const TriggerButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;

    /* タッチデバイスでは44px(Apple HIG)を確保 */
    @media (pointer: coarse) {
        height: 44px;
        border-radius: 8px;
    }
    border: none;
    border-radius: 6px;
    background-color: rgba(255, 255, 255, 0.12);
    color: ${color.White};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    max-width: 260px;
    transition: background-color 0.15s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.22);
    }

    @media (max-width: 768px) {
        width: 100%;
        max-width: none;
        justify-content: flex-start;
    }
`

const ColorDot = styled.span<{ $color: string }>`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    flex-shrink: 0;
`

const TriggerName = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const Chevron = styled.span<{ $open: boolean }>`
    font-size: 12px;
    opacity: 0.7;
    transition: transform 0.15s;
    transform: rotate(${(props) => (props.$open ? '180deg' : '0deg')});
    flex-shrink: 0;
`

const Popover = styled.div<{ $theme: Theme }>`
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    width: 320px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    background: ${(props) => props.$theme.surface};
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 12px;
    box-shadow: 0 12px 40px ${(props) => props.$theme.shadowHover};
    z-index: 100;
    overflow: hidden;

    @media (max-width: 768px) {
        width: 100%;
        min-width: 260px;
    }
`

const PopoverTitle = styled.div<{ $theme: Theme }>`
    padding: 12px 14px 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${(props) => props.$theme.textSecondary};
`

const BoardList = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 6px;
`

const BoardRow = styled.div<{ $theme: Theme; $isCurrent: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 8px;
    cursor: pointer;
    background: ${(props) => (props.$isCurrent ? props.$theme.surfaceHover : 'transparent')};
    outline: ${(props) => (props.$isCurrent ? `2px solid ${color.Blue}40` : 'none')};
    margin-bottom: 2px;

    &:hover {
        background: ${(props) => props.$theme.surfaceHover};
    }

    &:hover [data-row-actions] {
        opacity: 1;
    }
`

const BoardColorBar = styled.div<{ $color: string }>`
    width: 36px;
    height: 28px;
    border-radius: 6px;
    background: ${(props) => props.$color};
    flex-shrink: 0;
`

const BoardInfo = styled.div`
    flex: 1;
    min-width: 0;
`

const BoardName = styled.div<{ $theme: Theme }>`
    font-size: 13px;
    font-weight: 600;
    color: ${(props) => props.$theme.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const BoardDescription = styled.div<{ $theme: Theme }>`
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    opacity: 0.4;
    transition: opacity 0.15s;
`

const StarButton = styled.button<{ $active: boolean; $theme: Theme }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;
    border: none;
    background: transparent;
    font-size: 16px;
    line-height: 1;
    padding: 4px;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => (props.$active ? '#F2C744' : props.$theme.textSecondary)};

    /* 隣接ボタンと重ならないよう、タッチ時は実サイズで確保 */
    @media (pointer: coarse) {
        min-width: 40px;
        min-height: 40px;
    }

    &:hover {
        background: ${(props) => props.$theme.border};
        color: #f2c744;
    }
`

const RowEditButton = styled.button<{ $theme: Theme }>`
    border: none;
    background: transparent;
    padding: 4px;
    border-radius: 6px;
    cursor: pointer;
    color: ${(props) => props.$theme.textSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;

    @media (pointer: coarse) {
        min-width: 40px;
        min-height: 40px;
    }

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover {
        background: ${(props) => props.$theme.border};
        color: ${(props) => props.$theme.text};
    }
`

const PopoverFooter = styled.div<{ $theme: Theme }>`
    padding: 8px;
    border-top: 1px solid ${(props) => props.$theme.border};
`

const CreateBoardButton = styled.button`
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: 8px;
    background-color: rgba(33, 150, 243, 0.12);
    color: ${color.Blue};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s;

    &:hover {
        background-color: rgba(33, 150, 243, 0.22);
    }
`
