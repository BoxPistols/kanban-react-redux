import { useState, useEffect } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { TrashModal } from './TrashModal'
import { MoonIcon, SunIcon, MenuIcon, CloseIcon, TrashIcon } from './icon'
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
    const [isMenuOpen, setIsMenuOpen] = useState(false)
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
            setIsMenuOpen(false)
        }
    }

    // メニューを閉じるための副作用（クリック外・ESCキー）
    useEffect(() => {
        if (!isMenuOpen) {
            return
        }

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('[data-menu-container]')) {
                setIsMenuOpen(false)
            }
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isMenuOpen])

    return (
        <Container className={className} $isDarkMode={isDarkMode}>
            {/* ロゴ - 常に表示 */}
            <Logo>Kanban board</Logo>

            {/* ボードセレクター - PC表示 */}
            <DesktopOnly>
                <BoardSelector />
            </DesktopOnly>

            {/* テーマ切り替え - PC表示 */}
            <DesktopOnly>
                <ThemeToggle onClick={toggleDarkMode} title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </ThemeToggle>
            </DesktopOnly>

            {/* ゴミ箱ボタン - PC表示 */}
            <DesktopOnly>
                <TrashButton onClick={() => setIsTrashModalOpen(true)} title="ゴミ箱">
                    <TrashIcon />
                    {trashedCards.length > 0 && (
                        <TrashBadge>{trashedCards.length}</TrashBadge>
                    )}
                </TrashButton>
            </DesktopOnly>

            {/* ユーザー情報 - PC表示 */}
            {isFirebaseEnabled && user && (
                <DesktopOnly>
                    <UserInfo>
                        <UserInitial title={user.email || undefined}>
                            {user.email ? getFirstChar(user.email) : ''}
                        </UserInitial>
                        <LogoutButton onClick={handleLogout}>ログアウト</LogoutButton>
                    </UserInfo>
                </DesktopOnly>
            )}

            <Spacer />

            {/* フィルター - PC表示 */}
            <DesktopOnly>
                <CardFilter />
            </DesktopOnly>

            {/* ハンバーガーメニューボタン - モバイル表示 */}
            <MobileMenuButton
                onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(!isMenuOpen)
                }}
                title="メニュー"
                data-menu-container
            >
                {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>

            {/* モバイルメニュードロワー */}
            {isMenuOpen && (
                <MobileMenuOverlay onClick={() => setIsMenuOpen(false)}>
                    <MobileMenu
                        onClick={(e) => e.stopPropagation()}
                        data-menu-container
                        $isDarkMode={isDarkMode}
                    >
                        <MenuSection>
                            <MenuSectionTitle>ボード</MenuSectionTitle>
                            <BoardSelector />
                        </MenuSection>

                        <MenuDivider />

                        <MenuSection>
                            <MenuSectionTitle>フィルター</MenuSectionTitle>
                            <CardFilter />
                        </MenuSection>

                        <MenuDivider />

                        <MenuSection>
                            <MenuSectionTitle>設定</MenuSectionTitle>
                            <MenuThemeToggle onClick={toggleDarkMode}>
                                {isDarkMode ? <SunIcon /> : <MoonIcon />}
                                <span>{isDarkMode ? 'ライトモード' : 'ダークモード'}</span>
                            </MenuThemeToggle>
                            <MenuTrashButton onClick={() => {
                                setIsTrashModalOpen(true)
                                setIsMenuOpen(false)
                            }}>
                                <TrashIcon />
                                <span>ゴミ箱</span>
                                {trashedCards.length > 0 && (
                                    <MenuTrashBadge>{trashedCards.length}</MenuTrashBadge>
                                )}
                            </MenuTrashButton>
                        </MenuSection>

                        {isFirebaseEnabled && user && (
                            <>
                                <MenuDivider />
                                <MenuSection>
                                    <MenuSectionTitle>アカウント</MenuSectionTitle>
                                    <UserInfoMobile>
                                        <UserInitial title={user.email || undefined}>
                                            {user.email ? getFirstChar(user.email) : ''}
                                        </UserInitial>
                                        <UserEmail>{user.email}</UserEmail>
                                    </UserInfoMobile>
                                    <MenuLogoutButton onClick={handleLogout}>
                                        ログアウト
                                    </MenuLogoutButton>
                                </MenuSection>
                            </>
                        )}
                    </MobileMenu>
                </MobileMenuOverlay>
            )}

            {/* ゴミ箱モーダル */}
            {isTrashModalOpen && (
                <TrashModal onClose={() => setIsTrashModalOpen(false)} />
            )}
        </Container>
    )
}

const Container = styled.div<{ $isDarkMode?: boolean }>`
  display: flex;
  align-items: center;
  /* iPhoneのノッチ/ダイナミックアイランド対応 */
  padding-top: max(10px, env(safe-area-inset-top, 0));
  padding-right: max(16px, env(safe-area-inset-right, 0));
  padding-bottom: 10px;
  padding-left: max(16px, env(safe-area-inset-left, 0));
  background: ${props => props.$isDarkMode
    ? 'linear-gradient(180deg, #010409 0%, #0D1117 100%)'
    : 'linear-gradient(180deg, #1B2638 0%, #243447 100%)'
  };
  position: relative;
  z-index: 100;
  backdrop-filter: blur(8px);

  @media (max-width: 768px) {
    padding-top: max(8px, env(safe-area-inset-top, 0));
    padding-right: max(12px, env(safe-area-inset-right, 0));
    padding-bottom: 8px;
    padding-left: max(12px, env(safe-area-inset-left, 0));
  }
`

const Logo = styled.div`
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`

const DesktopOnly = styled.div`
  display: flex;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const Spacer = styled.div`
  flex: 1;
`

const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 18px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
`

const UserInitial = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: ${color.White};
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: default;
  flex-shrink: 0;
`

const UserEmail = styled.div`
  color: ${color.White};
  font-size: 14px;
  word-break: break-all;
`

const LogoutButton = styled.button`
  padding: 6px 12px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 13px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`

// モバイルメニュー関連
const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  border-radius: 8px;
  color: ${color.White};
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`

const MobileMenuOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`

const MobileMenu = styled.div<{ $isDarkMode?: boolean }>`
  position: absolute;
  top: 0;
  right: 0;
  width: 85%;
  max-width: 320px;
  height: 100%;
  background: ${props => props.$isDarkMode
    ? 'linear-gradient(180deg, #010409 0%, #0D1117 100%)'
    : 'linear-gradient(180deg, #1B2638 0%, #243447 100%)'
  };
  /* iPhoneのノッチ/ダイナミックアイランド対応 */
  padding-top: max(16px, calc(env(safe-area-inset-top, 0) + 8px));
  padding-right: max(16px, env(safe-area-inset-right, 0));
  padding-bottom: max(16px, env(safe-area-inset-bottom, 0));
  padding-left: max(16px, env(safe-area-inset-left, 0));
  overflow-y: auto;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
  z-index: 1;

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`

const MenuSection = styled.div`
  padding: 12px 0;
`

const MenuSectionTitle = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
`

const MenuDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
`

const MenuThemeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  border-radius: 8px;
  color: ${color.White};
  font-size: 14px;
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`

const UserInfoMobile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
`

const MenuLogoutButton = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  border: none;
  background: rgba(239, 83, 80, 0.15);
  cursor: pointer;
  border-radius: 8px;
  color: #ef5350;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 83, 80, 0.25);
  }
`

const TrashButton = styled.button`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 18px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const TrashBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: ${color.Red};
  color: ${color.White};
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const MenuTrashButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  margin-top: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  border-radius: 8px;
  color: ${color.White};
  font-size: 14px;
  transition: all 0.2s;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`

const MenuTrashBadge = styled.span`
  background-color: ${color.Red};
  color: ${color.White};
  font-size: 11px;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: auto;
`
