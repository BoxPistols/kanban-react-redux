import { useState } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import { BoardModal } from './BoardModal'

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
      <Container>
        <Select value={currentBoardId || ''} onChange={(e) => handleBoardChange(e.target.value)}>
          {boards.length === 0 && <option value="">ボードを作成してください</option>}
          {boards.map(board => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>

        {currentBoard && (
          <EditButton onClick={(e) => handleEditBoard(e, currentBoard.id)} title="ボードを編集">
            ✏️
          </EditButton>
        )}

        <AddButton onClick={() => setIsModalOpen(true)} title="新しいボードを作成">
          + ボード
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
  gap: 8px;
  margin-left: 16px;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 6px;

  @media (max-width: 768px) {
    margin-left: 8px;
    gap: 4px;
    padding: 4px 6px;
  }
`

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.15);
  color: ${color.White};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  max-width: 200px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
  }

  &:focus {
    outline: none;
    background-color: rgba(255, 255, 255, 0.25);
    border-color: ${color.White};
  }

  option {
    background-color: ${color.Navy};
    color: ${color.White};
  }

  @media (max-width: 768px) {
    max-width: 120px;
    font-size: 13px;
    padding: 6px 8px;
  }
`

const EditButton = styled.button`
  padding: 6px 8px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;
  color: ${color.White};
  transition: all 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 4px 6px;
  }
`

const AddButton = styled.button`
  padding: 8px 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background-color: rgba(33, 150, 243, 0.8);
  color: ${color.White};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  &:hover {
    background-color: ${color.Blue};
    border-color: ${color.White};
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 10px;
  }
`
