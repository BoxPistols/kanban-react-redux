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

  @media (max-width: 768px) {
    margin-left: 8px;
    gap: 4px;
  }
`

const Select = styled.select`
  padding: 6px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Black};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  max-width: 200px;

  &:hover {
    background-color: ${color.LightSilver};
  }

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    max-width: 150px;
    font-size: 13px;
    padding: 4px 8px;
  }
`

const EditButton = styled.button`
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  border-radius: 4px;

  &:hover {
    background-color: ${color.LightSilver};
  }

  @media (max-width: 768px) {
    font-size: 14px;
    padding: 2px 6px;
  }
`

const AddButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Blue};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: ${color.Blue};
    color: ${color.White};
  }

  @media (max-width: 768px) {
    font-size: 12px;
    padding: 4px 8px;
  }
`
