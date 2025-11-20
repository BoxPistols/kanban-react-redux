import { useState, useEffect } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import type { Label } from './types'

const BOARD_COLORS = [
  '#0079BF', // Blue
  '#70B500', // Green
  '#FF9F1A', // Orange
  '#EB5A46', // Red
  '#C377E0', // Purple
  '#00C2E0', // Cyan
  '#51E898', // Light Green
  '#FF78CB', // Pink
  '#344563', // Dark Blue
  '#B3BAC5'  // Gray
]

const LABEL_COLORS = [
  '#61BD4F', '#F2D600', '#FF9F1A', '#EB5A46', '#C377E0',
  '#0079BF', '#00C2E0', '#51E898', '#FF78CB', '#344563'
]

interface BoardModalProps {
  boardId?: string | null
  onClose: () => void
}

type TabType = 'basic' | 'labels'

export function BoardModal({ boardId, onClose }: BoardModalProps) {
  const { boards, addBoard, updateBoard, deleteBoard, addLabelToBoard, removeLabelFromBoard, updateLabel } = useBoardStore()
  const board = boardId ? boards.find(b => b.id === boardId) : null

  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [name, setName] = useState(board?.name || '')
  const [description, setDescription] = useState(board?.description || '')
  const [selectedColor, setSelectedColor] = useState(board?.color || BOARD_COLORS[0])

  // Label management state
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)

  useEffect(() => {
    if (board) {
      setName(board.name)
      setDescription(board.description || '')
      setSelectedColor(board.color || BOARD_COLORS[0])
    }
  }, [board])

  const handleAddLabel = async () => {
    if (!boardId || !newLabelName.trim()) return
    await addLabelToBoard(boardId, {
      name: newLabelName,
      color: newLabelColor
    })
    setNewLabelName('')
    setNewLabelColor(LABEL_COLORS[0])
  }

  const handleUpdateLabel = async () => {
    if (!boardId || !editingLabel) return
    await updateLabel(boardId, editingLabel.id, {
      name: editingLabel.name,
      color: editingLabel.color
    })
    setEditingLabel(null)
  }

  const handleDeleteLabel = async (labelId: string) => {
    if (!boardId) return
    if (window.confirm('このラベルを削除しますか？')) {
      await removeLabelFromBoard(boardId, labelId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (boardId) {
      await updateBoard(boardId, { name, description, color: selectedColor })
    } else {
      await addBoard(name, description, selectedColor)
    }
    onClose()
  }

  const handleDelete = async () => {
    if (!boardId) return
    if (window.confirm('このボードを削除しますか？ボード内のカードも全て削除されます。')) {
      await deleteBoard(boardId)
      onClose()
    }
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>{boardId ? 'ボードを編集' : '新しいボード'}</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        {boardId && (
          <TabBar>
            <Tab $active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
              基本情報
            </Tab>
            <Tab $active={activeTab === 'labels'} onClick={() => setActiveTab('labels')}>
              ラベル管理
            </Tab>
          </TabBar>
        )}

        {activeTab === 'basic' ? (
          <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>ボード名</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: プロジェクト管理"
              autoFocus
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>説明（任意）</Label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このボードの説明を入力..."
              rows={3}
            />
          </FormGroup>

          <FormGroup>
            <Label>色</Label>
            <ColorGrid>
              {BOARD_COLORS.map(boardColor => (
                <ColorOption
                  key={boardColor}
                  $color={boardColor}
                  $selected={selectedColor === boardColor}
                  onClick={() => setSelectedColor(boardColor)}
                  type="button"
                />
              ))}
            </ColorGrid>
          </FormGroup>

          <ButtonGroup>
            <SubmitButton type="submit">
              {boardId ? '更新' : '作成'}
            </SubmitButton>
            <CancelButton type="button" onClick={onClose}>
              キャンセル
            </CancelButton>
            {boardId && (
              <DeleteButton type="button" onClick={handleDelete}>
                削除
              </DeleteButton>
            )}
          </ButtonGroup>
        </Form>
        ) : (
          <LabelsContent>
            <LabelsSection>
              <SectionTitle>新しいラベルを追加</SectionTitle>
              <LabelForm>
                <LabelInputRow>
                  <LabelInput
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="ラベル名"
                  />
                  <LabelColorPicker>
                    {LABEL_COLORS.map(c => (
                      <LabelColorOption
                        key={c}
                        $color={c}
                        $selected={newLabelColor === c}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </LabelColorPicker>
                  <AddLabelButton onClick={handleAddLabel}>
                    追加
                  </AddLabelButton>
                </LabelInputRow>
              </LabelForm>
            </LabelsSection>

            <LabelsSection>
              <SectionTitle>既存のラベル</SectionTitle>
              <LabelsList>
                {board?.labels && board.labels.length > 0 ? (
                  board.labels.map(label => (
                    <LabelItem key={label.id}>
                      {editingLabel?.id === label.id ? (
                        <>
                          <LabelInput
                            type="text"
                            value={editingLabel.name}
                            onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                          />
                          <LabelColorPicker>
                            {LABEL_COLORS.map(c => (
                              <LabelColorOption
                                key={c}
                                $color={c}
                                $selected={editingLabel.color === c}
                                onClick={() => setEditingLabel({ ...editingLabel, color: c })}
                              />
                            ))}
                          </LabelColorPicker>
                          <SaveLabelButton onClick={handleUpdateLabel}>
                            保存
                          </SaveLabelButton>
                          <CancelLabelButton onClick={() => setEditingLabel(null)}>
                            キャンセル
                          </CancelLabelButton>
                        </>
                      ) : (
                        <>
                          <LabelPreview $color={label.color}>
                            {label.name}
                          </LabelPreview>
                          <EditLabelButton onClick={() => setEditingLabel(label)}>
                            編集
                          </EditLabelButton>
                          <DeleteLabelButton onClick={() => handleDeleteLabel(label.id)}>
                            削除
                          </DeleteLabelButton>
                        </>
                      )}
                    </LabelItem>
                  ))
                ) : (
                  <EmptyLabels>ラベルがありません</EmptyLabels>
                )}
              </LabelsList>
            </LabelsSection>

            <LabelsFooter>
              <CancelButton type="button" onClick={onClose}>
                閉じる
              </CancelButton>
            </LabelsFooter>
          </LabelsContent>
        )}
      </Modal>
    </Overlay>
  )
}

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`

const Modal = styled.div`
  background-color: ${color.White};
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${color.Silver};
`

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  color: ${color.Black};
`

const CloseButton = styled.button`
  border: none;
  background: none;
  font-size: 28px;
  color: ${color.Gray};
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background-color: ${color.LightSilver};
    color: ${color.Black};
  }
`

const Form = styled.form`
  padding: 20px;
`

const FormGroup = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${color.Black};
`

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  font-size: 14px;
  color: ${color.Black};
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  font-size: 14px;
  color: ${color.Black};
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }
`

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean }>`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 3px solid ${props => props.$selected ? color.Black : 'transparent'};
  background-color: ${props => props.$color};
  cursor: pointer;
  transition: transform 0.1s;

  &:hover {
    transform: scale(1.1);
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 24px;
`

const SubmitButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #026AA7;
  }
`

const CancelButton = styled.button`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Black};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.LightSilver};
  }
`

const DeleteButton = styled.button`
  padding: 10px 16px;
  border: 1px solid ${color.Red};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Red};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.Red};
    color: ${color.White};
  }
`

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid ${color.Silver};
`

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px;
  border: none;
  background-color: ${props => props.$active ? color.White : color.LightSilver};
  color: ${props => props.$active ? color.Blue : color.Gray};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? color.Blue : 'transparent'};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${color.White};
  }
`

const LabelsContent = styled.div`
  padding: 20px;
`

const LabelsSection = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${color.Black};
`

const LabelForm = styled.div``

const LabelInputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LabelInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
  }
`

const LabelColorPicker = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`

const LabelColorOption = styled.button<{ $color: string; $selected: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid ${props => props.$selected ? color.Black : 'transparent'};
  background-color: ${props => props.$color};
  cursor: pointer;
  transition: transform 0.1s;

  &:hover {
    transform: scale(1.1);
  }
`

const AddLabelButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #026AA7;
  }
`

const LabelsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LabelItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.LightSilver};
`

const LabelPreview = styled.div<{ $color: string }>`
  flex: 1;
  padding: 6px 12px;
  border-radius: 4px;
  background-color: ${props => props.$color};
  color: ${color.White};
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
`

const EditLabelButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Black};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.LightSilver};
  }
`

const DeleteLabelButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${color.Red};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Red};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.Red};
    color: ${color.White};
  }
`

const SaveLabelButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: #026AA7;
  }
`

const CancelLabelButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${color.Silver};
  border-radius: 4px;
  background-color: ${color.White};
  color: ${color.Black};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${color.LightSilver};
  }
`

const EmptyLabels = styled.div`
  padding: 20px;
  text-align: center;
  color: ${color.Gray};
  font-size: 14px;
  font-style: italic;
`

const LabelsFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`
