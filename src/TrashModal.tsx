import { useEffect } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { useTrashStore, TrashedCard } from './store/trashStore'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import type { ColumnType } from './types'

interface TrashModalProps {
  onClose: () => void
}

export function TrashModal({ onClose }: TrashModalProps) {
  const { trashedCards, restoreFromTrash, permanentlyDelete, emptyTrash, loadTrash, getDaysUntilPermanentDeletion } = useTrashStore()
  const { restoreCard } = useKanbanStore()
  const { boards, currentBoardId } = useBoardStore()
  const { isDarkMode } = useThemeStore()
  const theme = getTheme(isDarkMode)

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRestore = async (card: TrashedCard) => {
    // 元のボードが存在するか確認
    const originalBoard = boards.find(b => b.id === card.originalBoardId)
    const targetBoardId = originalBoard ? card.originalBoardId : currentBoardId
    const targetColumnId = card.originalColumnId as ColumnType

    if (!targetBoardId) {
      alert('復元先のボードを選択してください')
      return
    }

    // ゴミ箱から削除
    const restoredCard = restoreFromTrash(card.id)
    if (restoredCard) {
      // カードを復元
      await restoreCard(restoredCard, targetBoardId, targetColumnId)
      alert(`カードを${originalBoard ? '元の位置に' : '現在のボードに'}復元しました`)
    }
  }

  const handlePermanentDelete = (cardId: string) => {
    if (window.confirm('このカードを完全に削除しますか？この操作は取り消せません。')) {
      permanentlyDelete(cardId)
    }
  }

  const handleEmptyTrash = () => {
    if (trashedCards.length === 0) return
    if (window.confirm(`ゴミ箱を空にしますか？${trashedCards.length}件のカードが完全に削除されます。`)) {
      emptyTrash()
    }
  }

  const formatDeletedDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()} $theme={theme}>
        <Header $theme={theme}>
          <Title $theme={theme}>ゴミ箱</Title>
          <CloseButton onClick={onClose} $theme={theme}>×</CloseButton>
        </Header>

        <Content $theme={theme}>
          {trashedCards.length === 0 ? (
            <EmptyState $theme={theme}>
              ゴミ箱は空です
            </EmptyState>
          ) : (
            <>
              <InfoText $theme={theme}>
                削除されたカードは30日間保存されます。
              </InfoText>
              <CardList>
                {trashedCards.map(card => {
                  const daysLeft = getDaysUntilPermanentDeletion(card.deletedAt)
                  const originalBoard = boards.find(b => b.id === card.originalBoardId)
                  return (
                    <TrashCard key={card.id} $theme={theme}>
                      <CardHeader>
                        <CardTitle $theme={theme}>{card.title || card.text}</CardTitle>
                        <DaysLeft $urgent={daysLeft <= 7}>
                          あと{daysLeft}日
                        </DaysLeft>
                      </CardHeader>
                      {card.description && (
                        <CardDescription $theme={theme}>
                          {card.description.substring(0, 100)}{card.description.length > 100 ? '...' : ''}
                        </CardDescription>
                      )}
                      <CardMeta $theme={theme}>
                        <span>元のボード: {originalBoard?.name || '(削除済み)'}</span>
                        <span>削除日: {formatDeletedDate(card.deletedAt)}</span>
                      </CardMeta>
                      <CardActions>
                        <RestoreButton onClick={() => handleRestore(card)}>
                          復元
                        </RestoreButton>
                        <DeleteButton onClick={() => handlePermanentDelete(card.id)}>
                          完全に削除
                        </DeleteButton>
                      </CardActions>
                    </TrashCard>
                  )
                })}
              </CardList>
            </>
          )}
        </Content>

        <Footer $theme={theme}>
          {trashedCards.length > 0 && (
            <EmptyTrashButton onClick={handleEmptyTrash}>
              ゴミ箱を空にする
            </EmptyTrashButton>
          )}
          <CloseModalButton onClick={onClose} $theme={theme}>
            閉じる
          </CloseModalButton>
        </Footer>
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
  padding-top: env(safe-area-inset-top, 16px);
  padding-bottom: env(safe-area-inset-bottom, 16px);
  overflow-y: auto;
  touch-action: manipulation;

  @media (max-width: 768px) {
    align-items: flex-start;
    padding: 8px;
    padding-top: max(8px, env(safe-area-inset-top));
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
`

const Modal = styled.div<{ $theme: Theme }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  @media (max-width: 768px) {
    max-height: calc(100dvh - 16px);
    max-height: calc(100vh - 16px);
    border-radius: 8px 8px 0 0;
  }

  @supports (height: 100dvh) {
    @media (max-width: 768px) {
      max-height: calc(100dvh - 16px);
    }
  }
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

const Content = styled.div<{ $theme: Theme }>`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`

const EmptyState = styled.div<{ $theme: Theme }>`
  text-align: center;
  padding: 40px 20px;
  color: ${props => props.$theme.textSecondary};
  font-size: 14px;
`

const InfoText = styled.p<{ $theme: Theme }>`
  margin: 0 0 16px 0;
  font-size: 13px;
  color: ${props => props.$theme.textSecondary};
`

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TrashCard = styled.div<{ $theme: Theme }>`
  padding: 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 6px;
  background-color: ${props => props.$theme.surfaceHover};
`

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
`

const CardTitle = styled.h3<{ $theme: Theme }>`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$theme.text};
  word-break: break-word;
`

const DaysLeft = styled.span<{ $urgent: boolean }>`
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: ${props => props.$urgent ? color.Red : color.Gray};
  color: ${color.White};
  font-weight: 600;
`

const CardDescription = styled.p<{ $theme: Theme }>`
  margin: 0 0 8px 0;
  font-size: 13px;
  color: ${props => props.$theme.textSecondary};
  word-break: break-word;
`

const CardMeta = styled.div<{ $theme: Theme }>`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: ${props => props.$theme.textSecondary};
  margin-bottom: 12px;
`

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`

const RestoreButton = styled.button`
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: ${color.Blue};
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #026AA7;
  }
`

const DeleteButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${color.Red};
  border-radius: 4px;
  background-color: transparent;
  color: ${color.Red};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: ${color.Red};
    color: ${color.White};
  }
`

const Footer = styled.div<{ $theme: Theme }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid ${props => props.$theme.border};
  gap: 8px;
`

const EmptyTrashButton = styled.button`
  padding: 8px 16px;
  border: 1px solid ${color.Red};
  border-radius: 4px;
  background-color: transparent;
  color: ${color.Red};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: ${color.Red};
    color: ${color.White};
  }
`

const CloseModalButton = styled.button<{ $theme: Theme }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.$theme.surfaceHover};
  }
`
