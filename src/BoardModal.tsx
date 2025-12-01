import { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { BOARD_COLORS, LABEL_COLORS } from './constants'
import type { Label } from './types'

interface BoardModalProps {
  boardId?: string | null
  onClose: () => void
}

type TabType = 'basic' | 'labels'

export function BoardModal({ boardId, onClose }: BoardModalProps) {
  const { boards, addBoard, updateBoard, deleteBoard, addLabelToBoard, removeLabelFromBoard, updateLabel } = useBoardStore()
  const { isDarkMode } = useThemeStore()
  const theme = getTheme(isDarkMode)
  const board = boardId ? boards.find(b => b.id === boardId) : null

  const [activeTab, setActiveTab] = useState<TabType>('basic')
  const [name, setName] = useState(board?.name || '')
  const [description, setDescription] = useState(board?.description || '')
  const [selectedColor, setSelectedColor] = useState(board?.color || BOARD_COLORS[0])

  // Label management state
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0])
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false)
  const [showEditingCustomColorPicker, setShowEditingCustomColorPicker] = useState(false)
  const customColorInputRef = useRef<HTMLInputElement>(null)
  const editingCustomColorInputRef = useRef<HTMLInputElement>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (board) {
      setName(board.name)
      setDescription(board.description || '')
      setSelectedColor(board.color || BOARD_COLORS[0])
    }
  }, [board])

  const handleAddLabel = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!boardId || !newLabelName.trim()) return
    await addLabelToBoard(boardId, {
      name: newLabelName,
      color: newLabelColor
    })
    setNewLabelName('')
    setNewLabelColor(LABEL_COLORS[0])
  }

  const handleLabelKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddLabel()
    }
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

  const handleExportLabels = () => {
    if (!board?.labels || board.labels.length === 0) {
      alert('エクスポートするラベルがありません')
      return
    }
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      boardName: board.name,
      labels: board.labels.map(l => ({
        name: l.name,
        color: l.color
      }))
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `labels-${board.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportLabels = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !boardId) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!data.labels || !Array.isArray(data.labels)) {
        alert('無効なファイル形式です')
        return
      }

      const validLabels = data.labels.filter(
        (l: any) => typeof l.name === 'string' && typeof l.color === 'string'
      )

      if (validLabels.length === 0) {
        alert('有効なラベルが見つかりませんでした')
        return
      }

      const existingNames = new Set(board?.labels?.map(l => l.name.toLowerCase()) || [])
      let importedCount = 0
      let skippedCount = 0

      for (const label of validLabels) {
        if (existingNames.has(label.name.toLowerCase())) {
          skippedCount++
          continue
        }
        await addLabelToBoard(boardId, { name: label.name, color: label.color })
        existingNames.add(label.name.toLowerCase())
        importedCount++
      }

      alert(`${importedCount}個のラベルをインポートしました${skippedCount > 0 ? `\n（${skippedCount}個は既に存在するためスキップしました）` : ''}`)
    } catch (error) {
      console.error('Import error:', error)
      alert('ファイルの読み込みに失敗しました')
    }

    // Reset file input
    if (importFileInputRef.current) {
      importFileInputRef.current.value = ''
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
      <Modal onClick={(e) => e.stopPropagation()} $theme={theme}>
        <Header $theme={theme}>
          <Title $theme={theme}>{boardId ? 'ボードを編集' : '新しいボード'}</Title>
          <CloseButton onClick={onClose} $theme={theme}>×</CloseButton>
        </Header>

        {boardId && (
          <TabBar $theme={theme}>
            <Tab $active={activeTab === 'basic'} $theme={theme} onClick={() => setActiveTab('basic')}>
              基本情報
            </Tab>
            <Tab $active={activeTab === 'labels'} $theme={theme} onClick={() => setActiveTab('labels')}>
              ラベル管理
            </Tab>
          </TabBar>
        )}

        {activeTab === 'basic' ? (
          <Form onSubmit={handleSubmit} $theme={theme}>
          <FormGroup>
            <FormLabel $theme={theme}>ボード名</FormLabel>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: プロジェクト管理"
              autoFocus
              required
              $theme={theme}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel $theme={theme}>説明（任意）</FormLabel>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このボードの説明を入力..."
              rows={3}
              $theme={theme}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel $theme={theme}>色</FormLabel>
            <ColorGrid>
              {BOARD_COLORS.map(boardColor => (
                <ColorOption
                  key={boardColor}
                  $color={boardColor}
                  $selected={selectedColor === boardColor}
                  $isDarkMode={isDarkMode}
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
            <CancelButton type="button" onClick={onClose} $theme={theme}>
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
          <LabelsContent $theme={theme}>
            <LabelsSection>
              <SectionTitle $theme={theme}>新しいラベルを追加</SectionTitle>
              <LabelForm>
                <LabelInputRow>
                  <LabelInput
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyPress={handleLabelKeyPress}
                    placeholder="ラベル名"
                    $theme={theme}
                  />
                  <LabelColorPicker>
                    {LABEL_COLORS.map(c => (
                      <LabelColorOption
                        key={c}
                        type="button"
                        $color={c}
                        $selected={newLabelColor === c}
                        $isDarkMode={isDarkMode}
                        onClick={() => {
                          setNewLabelColor(c)
                          setShowCustomColorPicker(false)
                        }}
                      />
                    ))}
                    <CustomColorButton
                      type="button"
                      $selected={showCustomColorPicker || !LABEL_COLORS.includes(newLabelColor)}
                      $isDarkMode={isDarkMode}
                      $currentColor={!LABEL_COLORS.includes(newLabelColor) ? newLabelColor : undefined}
                      onClick={() => {
                        setShowCustomColorPicker(!showCustomColorPicker)
                        setTimeout(() => customColorInputRef.current?.click(), 100)
                      }}
                      title="カスタムカラー"
                    >
                      +
                    </CustomColorButton>
                    <HiddenColorInput
                      ref={customColorInputRef}
                      type="color"
                      value={newLabelColor}
                      onChange={(e) => {
                        setNewLabelColor(e.target.value)
                        setShowCustomColorPicker(true)
                      }}
                    />
                  </LabelColorPicker>
                  <AddLabelButton type="button" onClick={handleAddLabel}>
                    追加
                  </AddLabelButton>
                </LabelInputRow>
              </LabelForm>
            </LabelsSection>

            <LabelsSection>
              <ExportImportRow>
                <ExportButton type="button" onClick={handleExportLabels} $theme={theme}>
                  ラベルをエクスポート
                </ExportButton>
                <ImportButton type="button" onClick={() => importFileInputRef.current?.click()} $theme={theme}>
                  ラベルをインポート
                </ImportButton>
                <HiddenFileInput
                  ref={importFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportLabels}
                />
              </ExportImportRow>
            </LabelsSection>

            <LabelsSection>
              <SectionTitle $theme={theme}>既存のラベル</SectionTitle>
              <LabelsList $theme={theme}>
                {board?.labels && board.labels.length > 0 ? (
                  board.labels.map(label => (
                    <LabelItem key={label.id} $theme={theme}>
                      {editingLabel?.id === label.id ? (
                        <>
                          <LabelInput
                            type="text"
                            value={editingLabel.name}
                            onChange={(e) => setEditingLabel({ ...editingLabel, name: e.target.value })}
                            $theme={theme}
                          />
                          <LabelColorPicker>
                            {LABEL_COLORS.map(c => (
                              <LabelColorOption
                                key={c}
                                type="button"
                                $color={c}
                                $selected={editingLabel.color === c}
                                $isDarkMode={isDarkMode}
                                onClick={() => {
                                  setEditingLabel({ ...editingLabel, color: c })
                                  setShowEditingCustomColorPicker(false)
                                }}
                              />
                            ))}
                            <CustomColorButton
                              type="button"
                              $selected={showEditingCustomColorPicker || !LABEL_COLORS.includes(editingLabel.color)}
                              $isDarkMode={isDarkMode}
                              $currentColor={!LABEL_COLORS.includes(editingLabel.color) ? editingLabel.color : undefined}
                              onClick={() => {
                                setShowEditingCustomColorPicker(!showEditingCustomColorPicker)
                                setTimeout(() => editingCustomColorInputRef.current?.click(), 100)
                              }}
                              title="カスタムカラー"
                            >
                              +
                            </CustomColorButton>
                            <HiddenColorInput
                              ref={editingCustomColorInputRef}
                              type="color"
                              value={editingLabel.color}
                              onChange={(e) => {
                                setEditingLabel({ ...editingLabel, color: e.target.value })
                                setShowEditingCustomColorPicker(true)
                              }}
                            />
                          </LabelColorPicker>
                          <SaveLabelButton type="button" onClick={handleUpdateLabel}>
                            保存
                          </SaveLabelButton>
                          <CancelLabelButton type="button" onClick={() => {
                            setEditingLabel(null)
                            setShowEditingCustomColorPicker(false)
                          }} $theme={theme}>
                            キャンセル
                          </CancelLabelButton>
                        </>
                      ) : (
                        <>
                          <LabelPreview $color={label.color}>
                            {label.name}
                          </LabelPreview>
                          <EditLabelButton type="button" onClick={() => setEditingLabel(label)} $theme={theme}>
                            編集
                          </EditLabelButton>
                          <DeleteLabelButton type="button" onClick={() => handleDeleteLabel(label.id)}>
                            削除
                          </DeleteLabelButton>
                        </>
                      )}
                    </LabelItem>
                  ))
                ) : (
                  <EmptyLabels $theme={theme}>ラベルがありません</EmptyLabels>
                )}
              </LabelsList>
            </LabelsSection>

            <LabelsFooter>
              <CancelButton type="button" onClick={onClose} $theme={theme}>
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

const Modal = styled.div<{ $theme: Theme }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`

const Header = styled.div<{ $theme: Theme }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.$theme.border};
`

const Title = styled.h2<{ $theme: Theme }>`
  margin: 0;
  font-size: 18px;
  color: ${props => props.$theme.text};
`

const CloseButton = styled.button<{ $theme: Theme }>`
  border: none;
  background: none;
  font-size: 28px;
  color: ${props => props.$theme.textSecondary};
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
    color: ${props => props.$theme.text};
  }
`

const Form = styled.form<{ $theme: Theme }>`
  padding: 20px;
  background-color: ${props => props.$theme.surface};
`

const FormGroup = styled.div`
  margin-bottom: 20px;
`

const FormLabel = styled.label<{ $theme: Theme }>`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$theme.text};
`

const Input = styled.input<{ $theme: Theme }>`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }

  &::placeholder {
    color: ${props => props.$theme.textSecondary};
  }
`

const TextArea = styled.textarea<{ $theme: Theme }>`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
    border-color: ${color.Blue};
  }

  &::placeholder {
    color: ${props => props.$theme.textSecondary};
  }
`

const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
`

const ColorOption = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 3px solid ${props => {
    if (!props.$selected) return 'transparent'
    return props.$isDarkMode ? color.White : color.Black
  }};
  background-color: ${props => props.$color};
  cursor: pointer;
  transition: transform 0.1s, border-color 0.2s;

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

const CancelButton = styled.button<{ $theme: Theme }>`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
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

const TabBar = styled.div<{ $theme: Theme }>`
  display: flex;
  border-bottom: 1px solid ${props => props.$theme.border};
`

const Tab = styled.button<{ $active: boolean; $theme: Theme }>`
  flex: 1;
  padding: 12px;
  border: none;
  background-color: ${props => props.$active ? props.$theme.surface : props.$theme.surfaceHover};
  color: ${props => props.$active ? color.Blue : props.$theme.textSecondary};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? color.Blue : 'transparent'};
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surface};
  }
`

const LabelsContent = styled.div<{ $theme: Theme }>`
  padding: 20px;
  background-color: ${props => props.$theme.surface};
`

const LabelsSection = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h3<{ $theme: Theme }>`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$theme.text};
`

const LabelForm = styled.div``

const LabelInputRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const LabelInput = styled.input<{ $theme: Theme }>`
  padding: 8px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  font-size: 14px;
  color: ${props => props.$theme.text};
  background-color: ${props => props.$theme.inputBackground};

  &:focus {
    outline: 2px solid ${color.Blue};
    outline-offset: 2px;
  }

  &::placeholder {
    color: ${props => props.$theme.textSecondary};
  }
`

const LabelColorPicker = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
`

const LabelColorOption = styled.button<{ $color: string; $selected: boolean; $isDarkMode?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid ${props => {
    if (!props.$selected) return 'transparent'
    return props.$isDarkMode ? color.White : color.Black
  }};
  background-color: ${props => props.$color};
  cursor: pointer;
  transition: transform 0.1s, border-color 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`

const CustomColorButton = styled.button<{ $selected: boolean; $isDarkMode?: boolean; $currentColor?: string }>`
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid ${props => {
    if (!props.$selected) return props.$isDarkMode ? '#555' : color.Silver
    return props.$isDarkMode ? color.White : color.Black
  }};
  background: ${props => props.$currentColor || 'linear-gradient(135deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'};
  cursor: pointer;
  transition: transform 0.1s, border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: ${props => props.$currentColor ? color.White : (props.$isDarkMode ? color.White : color.Black)};
  text-shadow: ${props => props.$currentColor ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'};

  &:hover {
    transform: scale(1.1);
  }
`

const HiddenColorInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
`

const ExportImportRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const ExportButton = styled.button<{ $theme: Theme }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }
`

const ImportButton = styled.button<{ $theme: Theme }>`
  padding: 8px 16px;
  border: 1px solid ${color.Blue};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${color.Blue};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${color.Blue};
    color: ${color.White};
  }
`

const HiddenFileInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
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

const LabelsList = styled.div<{ $theme: Theme }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const LabelItem = styled.div<{ $theme: Theme }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surfaceHover};
  flex-wrap: wrap;
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

const EditLabelButton = styled.button<{ $theme: Theme }>`
  padding: 6px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
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

const CancelLabelButton = styled.button<{ $theme: Theme }>`
  padding: 6px 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }
`

const EmptyLabels = styled.div<{ $theme: Theme }>`
  padding: 20px;
  text-align: center;
  color: ${props => props.$theme.textSecondary};
  font-size: 14px;
  font-style: italic;
`

const LabelsFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
`
