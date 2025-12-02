import { useState } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import { BoardModal } from './BoardModal'
import { EditIcon } from './icon'

export function BoardSelector() {
  const { boards, currentBoardId, setCurrentBoardId } = useBoardStore()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBoard, setEditingBoard] = useState<string | null>(null)

  const currentBoard = boards.find(b => b.id === currentBoardId)

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
      <Container className="board-selector">
        {currentBoard?.color && (
          <BoardColorIndicator
            className="board-selector__color-indicator"
            $color={currentBoard.color}
            title={`ボードカラー: ${currentBoard.color}`}
          />
        )}
        <Select
          className="board-selector__select"
          value={currentBoardId || ''}
          onChange={(e) => handleBoardChange(e.target.value)}
        >
          {boards.length === 0 && <option value="">ボードを作成</option>}
          {boards.map(board => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>

        {currentBoard && (
          <EditButton
            className="board-selector__edit-button"
            onClick={(e) => handleEditBoard(e, currentBoard.id)}
            title="ボードを編集"
          >
            <EditIcon />
          </EditButton>
        )}

        <AddButton
          className="board-selector__add-button"
          onClick={() => setIsModalOpen(true)}
          title="新しいボードを作成"
        >
          +
        </AddButton>
      </Container>

      {isModalOpen && (
        <BoardModal
          boardId={editingBoard}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  flex-shrink: 0;
`

const BoardColorIndicator = styled.div<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  border: 2px solid rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`

const Select = styled.select`
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.15);
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  max-width: 120px;
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
`

const EditButton = styled.button`
  padding: 4px 5px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 12px;
  border-radius: 4px;
  color: ${color.White};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const AddButton = styled.button`
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(33, 150, 243, 0.8);
  color: ${color.White};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background-color: ${color.Blue};
  }

  &:active {
    transform: scale(0.95);
  }
`
