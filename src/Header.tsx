import { useState } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { MoonIcon, SunIcon, MenuIcon, CloseIcon } from './icon'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { isFirebaseEnabled } from './lib/firebase'

// メールアドレスの頭文字のみ表示（例: i）
function getFirstChar(email: string): string {
    return email[0]?.toLowerCase() || ''
}

export function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()
    const { user, logOut } = useAuthStore()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

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

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen)
    }

    const closeMenu = () => {
        setIsMenuOpen(false)
    }

    return (
        <>
            <Container className={className}>
                <Logo>Kanban</Logo>

                {/* Desktop: show all items inline */}
                <DesktopNav>
                    <BoardSelector />

                    <ThemeToggle onClick={toggleDarkMode} title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                        {isDarkMode ? <SunIcon /> : <MoonIcon />}
                    </ThemeToggle>

                    {isFirebaseEnabled && user && (
                        <UserInfo>
                            <UserInitial title={user.email || undefined}>
                                {user.email ? getFirstChar(user.email) : ''}
                            </UserInitial>
                            <LogoutButton onClick={handleLogout}>ログアウト</LogoutButton>
                        </UserInfo>
                    )}

                    <Spacer />

                    <CardFilter />
                </DesktopNav>

                {/* Mobile: hamburger menu */}
                <MobileNav>
                    <HamburgerButton onClick={toggleMenu} aria-label="メニューを開く">
                        {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </HamburgerButton>
                </MobileNav>
            </Container>

            {/* Mobile menu overlay */}
            {isMenuOpen && (
                <>
                    <Overlay onClick={closeMenu} />
                    <MobileMenu>
                        <MobileMenuItem>
                            <MobileLabel>ボード</MobileLabel>
                            <BoardSelector />
                        </MobileMenuItem>

                        <MobileMenuItem>
                            <MobileLabel>検索・フィルター</MobileLabel>
                            <CardFilter />
                        </MobileMenuItem>

                        <MobileMenuItem>
                            <MobileLabel>テーマ</MobileLabel>
                            <ThemeToggleMobile onClick={() => { toggleDarkMode(); closeMenu(); }}>
                                {isDarkMode ? <SunIcon /> : <MoonIcon />}
                                <span>{isDarkMode ? 'ライトモード' : 'ダークモード'}</span>
                            </ThemeToggleMobile>
                        </MobileMenuItem>

                        {isFirebaseEnabled && user && (
                            <MobileMenuItem>
                                <MobileLabel>アカウント</MobileLabel>
                                <UserInfoMobile>
                                    <UserInitialMobile title={user.email || undefined}>
                                        {user.email ? getFirstChar(user.email) : ''}
                                    </UserInitialMobile>
                                    <UserEmail>{user.email}</UserEmail>
                                </UserInfoMobile>
                                <LogoutButtonMobile onClick={handleLogout}>ログアウト</LogoutButtonMobile>
                            </MobileMenuItem>
                        )}
                    </MobileMenu>
                </>
            )}
        </>
    )
}

const Container = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: ${color.Navy};
  gap: 8px;
`

const Logo = styled.div`
  color: ${color.Silver};
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
`

const DesktopNav = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;

  @media (max-width: 768px) {
    display: none;
  }
`

const MobileNav = styled.div`
  display: none;
  margin-left: auto;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
  }
`

const HamburgerButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  border-radius: 6px;
  color: ${color.White};
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
`

const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: 85%;
  max-width: 320px;
  height: 100vh;
  background: ${color.Navy};
  z-index: 999;
  padding: 16px;
  overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.2s ease-out;

  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
`

const MobileMenuItem = styled.div`
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
`

const MobileLabel = styled.div`
  color: ${color.Silver};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
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
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 18px;
  border-radius: 6px;
  color: ${color.White};
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const ThemeToggleMobile = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  border-radius: 8px;
  color: ${color.White};
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
`

const UserInfoMobile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
`

const UserInitial = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: ${color.White};
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  cursor: default;
`

const UserInitialMobile = styled(UserInitial)`
  width: 40px;
  height: 40px;
  font-size: 18px;
`

const UserEmail = styled.div`
  color: ${color.White};
  font-size: 14px;
  word-break: break-all;
`

const LogoutButton = styled.button`
  padding: 6px 12px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  color: ${color.White};
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`

const LogoutButtonMobile = styled.button`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  border-radius: 8px;
  color: ${color.White};
  transition: all 0.2s;
  margin-top: 12px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`
