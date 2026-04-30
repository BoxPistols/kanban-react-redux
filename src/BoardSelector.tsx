import { useState, memo } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import { BoardModal } from './BoardModal'
import { EditIcon } from './icon'

export const BoardSelector = memo(function BoardSelector() {
    const { boards, currentBoardId, setCurrentBoardId } = useBoardStore()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBoard, setEditingBoard] = useState<string | null>(null)

    const currentBoard = boards.find((b) => b.id === currentBoardId)

    const handleBoardChange = (boardId: string) => {
        setCurrentBoardId(boardId)
    }

    const handleEditBoard = (e: React.MouseEvent, boardId: string) => {
        e.stopPropagation()
        setEditingBoard(boardId)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingBoard(null)
    }

    return (
        <>
            <Container>
                {currentBoard?.color && (
                    <BoardColorIndicator $color={currentBoard.color} title={`ボードカラー: ${currentBoard.color}`} />
                )}
                <Select
                    value={currentBoardId || ''}
                    onChange={(e) => handleBoardChange(e.target.value)}
                    aria-label='ボード選択'
                >
                    {boards.length === 0 && <option value=''>ボードを作成してください</option>}
                    {boards.map((board) => (
                        <option key={board.id} value={board.id}>
                            {board.name}
                        </option>
                    ))}
                </Select>

                {currentBoard && (
                    <EditButton
                        onClick={(e) => handleEditBoard(e, currentBoard.id)}
                        title='ボードを編集'
                        aria-label='ボードを編集'
                    >
                        <EditIcon />
                    </EditButton>
                )}

                <AddButton
                    onClick={() => setIsModalOpen(true)}
                    title='新しいボードを作成'
                    aria-label='新しいボードを作成'
                >
                    + ボード
                </AddButton>
            </Container>

            {isModalOpen && <BoardModal boardId={editingBoard} onClose={handleCloseModal} />}
        </>
    )
})

const Container = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 16px;
    padding: 6px 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 6px;

    @media (max-width: 768px) {
        margin-left: 0;
        gap: 8px;
        padding: 8px;
        flex-wrap: wrap;
        width: 100%;
        background-color: transparent;
    }
`

const BoardColorIndicator = styled.div<{ $color: string }>`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: ${(props) => props.$color};
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;

    @media (max-width: 768px) {
        width: 24px;
        height: 24px;
    }
`

const Select = styled.select`
    height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.15);
    color: ${color.White};
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    max-width: 200px;
    transition: all 0.2s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.25);
    }

    &:focus {
        outline: none;
        background-color: rgba(255, 255, 255, 0.25);
    }

    option {
        background-color: ${color.Navy};
        color: ${color.White};
    }

    @media (max-width: 768px) {
        flex: 1;
        max-width: none;
        padding: 0 12px;
    }
`

const EditButton = styled.button`
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    cursor: pointer;
    border-radius: 4px;
    color: ${color.White};
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
        background-color: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
    }

    svg {
        display: block;
        width: 16px;
        height: 16px;
    }

    @media (max-width: 768px) {
        width: 32px;
        height: 32px;
    }
`

const AddButton = styled.button`
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 4px;
    background-color: rgba(33, 150, 243, 0.9);
    color: ${color.White};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
        background-color: ${color.Blue};
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }

    @media (max-width: 768px) {
        width: 100%;
        padding: 0 16px;
        margin-top: 8px;
    }
`
