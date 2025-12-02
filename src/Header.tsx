import { useState, useEffect } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { TrashModal } from './TrashModal'
import { MoonIcon, SunIcon, TrashIcon } from './icon'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { useTrashStore } from './store/trashStore'
import { isFirebaseEnabled } from './lib/firebase'

// メールアドレスの頭文字のみ表示（例: i）
function getFirstChar(email: string): string {
    return email[0]?.toLowerCase() || ''
}

export function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()
    const { user, logOut } = useAuthStore()
    const { trashedCards, loadTrash } = useTrashStore()
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)

    // ゴミ箱を読み込む
    useEffect(() => {
        loadTrash()
    }, [loadTrash])

    // 一時的: ユーザーIDをコンソールに出力（セキュリティルール設定用）
    if (user?.uid) {
        console.log('🔑 あなたのユーザーID (Firestoreルール用):', user.uid)
        console.log('📧 メールアドレス:', user.email)
    }

    const handleLogout = async () => {
        if (window.confirm('ログアウトしますか？')) {
            await logOut()
        }
    }

    return (
        <Container className={className}>
            <ScrollContent>
                {/* ロゴ */}
                <Logo>Kanban</Logo>

                {/* ボードセレクター */}
                <BoardSelector />

                {/* フィルター */}
                <CardFilter />

                {/* テーマ切り替え */}
                <IconButton onClick={toggleDarkMode} title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </IconButton>

                {/* ゴミ箱ボタン */}
                <IconButton onClick={() => setIsTrashModalOpen(true)} title="ゴミ箱">
                    <TrashIcon />
                    {trashedCards.length > 0 && (
                        <Badge>{trashedCards.length}</Badge>
                    )}
                </IconButton>

                {/* ユーザー情報 */}
                {isFirebaseEnabled && user && (
                    <UserSection>
                        <UserInitial title={user.email || undefined}>
                            {user.email ? getFirstChar(user.email) : ''}
                        </UserInitial>
                        <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
                    </UserSection>
                )}
            </ScrollContent>

            {/* ゴミ箱モーダル */}
            {isTrashModalOpen && (
                <TrashModal onClose={() => setIsTrashModalOpen(false)} />
            )}
        </Container>
    )
}

const Container = styled.div`
  background-color: ${color.Navy};
  position: relative;
  z-index: 0;
`

const ScrollContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  min-width: max-content;

  /* スマートフォンでなめらかな横スクロール */
  @media (max-width: 768px) {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */

    &::-webkit-scrollbar {
      display: none; /* Chrome, Safari */
    }
  }
`

const Logo = styled.div`
  color: ${color.Silver};
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
  padding-right: 4px;
`

const IconButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  border-radius: 6px;
  color: ${color.White};
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  &:active {
    transform: scale(0.95);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: ${color.Red};
  color: ${color.White};
  font-size: 9px;
  font-weight: bold;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 4px;
`

const UserInitial = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: ${color.White};
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: default;
  flex-shrink: 0;
`

const LogoutButton = styled.button`
  padding: 4px 8px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 11px;
  border-radius: 4px;
  color: ${color.White};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`
