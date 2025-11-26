import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { MoonIcon, SunIcon } from './icon'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { isFirebaseEnabled } from './lib/firebase'

// メールアドレスを省略形で表示（例: i***@gmail.com）
function abbreviateEmail(email: string): string {
    const [localPart, domain] = email.split('@')
    if (!localPart || !domain) return email

    const firstChar = localPart[0]
    return `${firstChar}***@${domain}`
}

export function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()
    const { user, logOut } = useAuthStore()

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
            <Logo>Kanban board</Logo>

            <BoardSelector />

            <ThemeToggle onClick={toggleDarkMode} title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </ThemeToggle>

            {isFirebaseEnabled && user && (
                <UserInfo>
                    <UserEmail title={user.email || undefined}>
                        {user.email ? abbreviateEmail(user.email) : ''}
                    </UserEmail>
                    <LogoutButton onClick={handleLogout}>ログアウト</LogoutButton>
                </UserInfo>
            )}

            <Spacer />

            <CardFilter />
        </Container>
    )
}

const Spacer = styled.div`
  flex: 1;
`

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: ${color.Navy};
`

const Logo = styled.div`
  color: ${color.Silver};
  font-size: 16px;
  font-weight: bold;
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

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 6px;
    margin-left: 8px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 16px;
`

const UserEmail = styled.span`
  color: ${color.Silver};
  font-size: 14px;

  @media (max-width: 768px) {
    display: none;
  }
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