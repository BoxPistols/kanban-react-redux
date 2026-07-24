import { useState, useEffect, useCallback, memo, lazy, Suspense } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { MoonIcon, SunIcon, MenuIcon, CloseIcon, TrashIcon, SelectIcon } from './icon'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { useTrashStore } from './store/trashStore'
import { useKanbanStore } from './store/kanbanStore'
import { isFirebaseEnabled } from './lib/firebase'
import { ChunkErrorBoundary } from './ChunkErrorBoundary'
import { touchTargetExpand } from './a11yStyles'

// 遅延ロード: TrashModal
const TrashModal = lazy(() => import('./TrashModal').then((m) => ({ default: m.TrashModal })))

// メールアドレスの頭文字のみ表示（例: i）
function getFirstChar(email: string): string {
    return email[0]?.toLowerCase() || ''
}

export const Header = memo(function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()
    const { user, logOut } = useAuthStore()
    const { trashedCards, loadTrash } = useTrashStore()
    // カードの一括移動: 選択モードのトグル
    const isSelectMode = useKanbanStore((s) => s.isSelectMode)
    const setSelectMode = useKanbanStore((s) => s.setSelectMode)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)

    // ゴミ箱を読み込む
    useEffect(() => {
        loadTrash()
    }, [loadTrash])

    const handleLogout = useCallback(async () => {
        if (window.confirm('ログアウトしますか？')) {
            await logOut()
            setIsMenuOpen(false)
            setIsAccountMenuOpen(false)
        }
    }, [logOut])

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

    // アカウントメニューを閉じるための副作用（クリック外・ESCキー）
    useEffect(() => {
        if (!isAccountMenuOpen) {
            return
        }

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('[data-account-menu]')) {
                setIsAccountMenuOpen(false)
            }
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsAccountMenuOpen(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isAccountMenuOpen])

    return (
        <Container className={className} $isDarkMode={isDarkMode}>
            {/* 左グループ: ロゴ + ボード */}
            <LeftGroup>
                <Logo>Kanban board</Logo>
                <DesktopOnly>
                    <BoardSelector />
                </DesktopOnly>
            </LeftGroup>

            <Spacer />

            {/* 右グループ: フィルター + アクション */}
            <DesktopOnly>
                <CardFilter />
            </DesktopOnly>

            <DesktopOnly>
                <HeaderDivider />
            </DesktopOnly>

            {/* アクションボタン群 */}
            <DesktopOnly>
                <ThemeToggle
                    onClick={toggleDarkMode}
                    title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                    aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                >
                    {isDarkMode ? <SunIcon /> : <MoonIcon />}
                </ThemeToggle>
            </DesktopOnly>

            <DesktopOnly>
                <ActionToggle
                    onClick={() => setSelectMode(!isSelectMode)}
                    $active={isSelectMode}
                    title={isSelectMode ? 'カード選択を終了' : 'カードを選択して一括移動'}
                    aria-label={isSelectMode ? 'カード選択を終了' : 'カードを選択して一括移動'}
                    aria-pressed={isSelectMode}
                >
                    <SelectIcon />
                </ActionToggle>
            </DesktopOnly>

            <DesktopOnly>
                <TrashButton onClick={() => setIsTrashModalOpen(true)} title='ゴミ箱' aria-label='ゴミ箱'>
                    <TrashIcon />
                    {trashedCards.length > 0 && <TrashBadge>{trashedCards.length}</TrashBadge>}
                </TrashButton>
            </DesktopOnly>

            {isFirebaseEnabled && user && (
                <DesktopOnly>
                    <AccountMenu data-account-menu>
                        <AccountButton
                            type='button'
                            onClick={() => setIsAccountMenuOpen((v) => !v)}
                            aria-haspopup='menu'
                            aria-expanded={isAccountMenuOpen}
                            aria-label='アカウントメニュー'
                            title={user.email || undefined}
                        >
                            {user.email ? getFirstChar(user.email) : ''}
                        </AccountButton>
                        {isAccountMenuOpen && (
                            <AccountDropdown role='menu' aria-label='アカウント' $isDarkMode={isDarkMode}>
                                <AccountDropdownHeader>
                                    <UserInitial title={user.email || undefined}>
                                        {user.email ? getFirstChar(user.email) : ''}
                                    </UserInitial>
                                    <UserEmail>{user.email}</UserEmail>
                                </AccountDropdownHeader>
                                <AccountMenuDivider />
                                <AccountLogoutButton type='button' role='menuitem' onClick={handleLogout}>
                                    ログアウト
                                </AccountLogoutButton>
                            </AccountDropdown>
                        )}
                    </AccountMenu>
                </DesktopOnly>
            )}

            {/* ハンバーガーメニューボタン - モバイル表示 */}
            <MobileMenuButton
                onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(!isMenuOpen)
                }}
                title='メニュー'
                aria-label='メニュー'
                aria-expanded={isMenuOpen}
                aria-controls='mobile-menu-drawer'
                aria-haspopup='menu'
                data-menu-container
            >
                {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>

            {/* モバイルメニュードロワー */}
            {isMenuOpen && (
                <MobileMenuOverlay onClick={() => setIsMenuOpen(false)}>
                    <MobileMenu
                        id='mobile-menu-drawer'
                        role='menu'
                        aria-label='メニュー'
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
                            <MenuThemeToggle
                                onClick={toggleDarkMode}
                                aria-label={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
                            >
                                {isDarkMode ? <SunIcon /> : <MoonIcon />}
                                <span>{isDarkMode ? 'ライトモード' : 'ダークモード'}</span>
                            </MenuThemeToggle>
                            <MenuTrashButton
                                onClick={() => {
                                    setIsTrashModalOpen(true)
                                    setIsMenuOpen(false)
                                }}
                                aria-label={`ゴミ箱${trashedCards.length > 0 ? ` (${trashedCards.length}件)` : ''}`}
                            >
                                <TrashIcon />
                                <span>ゴミ箱</span>
                                {trashedCards.length > 0 && <MenuTrashBadge>{trashedCards.length}</MenuTrashBadge>}
                            </MenuTrashButton>
                            <MenuSelectButton
                                onClick={() => {
                                    setSelectMode(!isSelectMode)
                                    setIsMenuOpen(false)
                                }}
                                aria-pressed={isSelectMode}
                                aria-label={isSelectMode ? 'カード選択を終了' : 'カードを選択して一括移動'}
                            >
                                <SelectIcon />
                                <span>{isSelectMode ? 'カード選択を終了' : 'カードを選択'}</span>
                            </MenuSelectButton>
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
                                    <MenuLogoutButton onClick={handleLogout} aria-label='ログアウト'>
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
                <ChunkErrorBoundary>
                    <Suspense fallback={null}>
                        <TrashModal onClose={() => setIsTrashModalOpen(false)} />
                    </Suspense>
                </ChunkErrorBoundary>
            )}
        </Container>
    )
})

const Container = styled.div<{ $isDarkMode?: boolean }>`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    /* iPhoneのノッチ/ダイナミックアイランド対応 */
    padding-top: max(10px, env(safe-area-inset-top, 0));
    padding-right: max(16px, env(safe-area-inset-right, 0));
    padding-bottom: 10px;
    padding-left: max(16px, env(safe-area-inset-left, 0));
    background: ${(props) => (props.$isDarkMode ? '#010409' : '#1B2638')};
    border-bottom: 1px solid
        ${(props) => (props.$isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.08)')};
    position: relative;
    z-index: 10;

    @media (max-width: 1200px) {
        padding-right: max(12px, env(safe-area-inset-right, 0));
        padding-left: max(12px, env(safe-area-inset-left, 0));
        gap: 6px;
    }

    @media (max-width: 900px) {
        gap: 4px;
    }

    @media (max-width: 768px) {
        padding-top: max(8px, env(safe-area-inset-top, 0));
        padding-right: max(8px, env(safe-area-inset-right, 0));
        padding-bottom: 8px;
        padding-left: max(8px, env(safe-area-inset-left, 0));
        gap: 6px;
    }
`

const Logo = styled.div`
    color: rgba(255, 255, 255, 0.85);
    font-size: 15px;
    font-weight: 600;
    flex-shrink: 0;
    letter-spacing: -0.01em;

    @media (max-width: 1024px) {
        font-size: 14px;
    }

    @media (max-width: 768px) {
        font-size: 13px;
        &::after {
            content: 'KB';
        }
        & {
            font-size: 0;
        }
    }
`

const LeftGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;

    @media (max-width: 1024px) {
        gap: 2px;
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
    min-width: 8px;

    @media (max-width: 900px) {
        min-width: 4px;
        flex: 0 0 auto;
        width: 100%;
        height: 0;
    }
`

const HeaderDivider = styled.div`
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 8px;
    flex-shrink: 0;

    @media (max-width: 1024px) {
        margin: 0 4px;
    }

    @media (max-width: 900px) {
        display: none;
    }
`

const ThemeToggle = styled.button`
    ${touchTargetExpand}
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.75);
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.16);
        color: rgba(255, 255, 255, 1);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`

// 選択モードのトグル。オン時は青系でアクティブを示す
const ActionToggle = styled.button<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: ${(props) => (props.$active ? color.Blue : 'rgba(255, 255, 255, 0.08)')};
    cursor: pointer;
    border-radius: 8px;
    color: ${(props) => (props.$active ? color.White : 'rgba(255, 255, 255, 0.75)')};
    transition: all 0.2s;

    &:hover {
        background: ${(props) => (props.$active ? color.Blue : 'rgba(255, 255, 255, 0.16)')};
        color: rgba(255, 255, 255, 1);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`

const AccountMenu = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`

const AccountButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: ${color.White};
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.28);
    }

    &:focus-visible {
        outline: 2px solid rgba(255, 255, 255, 0.6);
        outline-offset: 2px;
    }
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

const AccountDropdown = styled.div<{ $isDarkMode?: boolean }>`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    max-width: 280px;
    padding: 12px;
    border-radius: 8px;
    background: ${(props) => (props.$isDarkMode ? '#0D1117' : '#243447')};
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    z-index: 30;
    animation: fadeIn 0.15s ease-out;

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`

const AccountDropdownHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 10px;
`

const AccountMenuDivider = styled.div`
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 0 0 10px;
`

const AccountLogoutButton = styled.button`
    width: 100%;
    padding: 10px;
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

    &:focus-visible {
        outline: 2px solid #ef5350;
        outline-offset: 2px;
    }
`

// モバイルメニュー関連
const MobileMenuButton = styled.button`
    display: none;
    align-items: center;
    justify-content: center;
    /* タッチデバイスの主要導線なので44px(Apple HIG)を確保 */
    min-width: 44px;
    min-height: 44px;
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
    z-index: 20;
    animation: fadeIn 0.2s ease-out;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`

const MobileMenu = styled.div<{ $isDarkMode?: boolean }>`
    position: absolute;
    top: 0;
    right: 0;
    width: 85%;
    max-width: 320px;
    height: 100%;
    background: ${(props) =>
        props.$isDarkMode
            ? 'linear-gradient(180deg, #010409 0%, #0D1117 100%)'
            : 'linear-gradient(180deg, #1B2638 0%, #243447 100%)'};
    /* iPhoneのノッチ/ダイナミックアイランド対応 */
    padding-top: max(16px, calc(env(safe-area-inset-top, 0) + 8px));
    padding-right: max(16px, env(safe-area-inset-right, 0));
    padding-bottom: max(16px, env(safe-area-inset-bottom, 0));
    padding-left: max(16px, env(safe-area-inset-left, 0));
    overflow-y: auto;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.25s ease-out;
    z-index: 1;

    @keyframes slideIn {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }
`

const MenuSection = styled.div`
    padding: 12px 0;
`

const MenuSectionTitle = styled.div`
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
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

const MenuButton = styled.button`
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

const MenuThemeToggle = styled(MenuButton)`
    /* 継承 */
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
    ${touchTargetExpand}
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.75);
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.16);
        color: rgba(255, 255, 255, 1);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`

const TrashBadge = styled.span`
    position: absolute;
    top: -6px;
    right: -6px;
    background-color: ${color.Red};
    color: ${color.White};
    font-size: 12px;
    font-weight: bold;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
`

const MenuTrashButton = styled(MenuButton)`
    margin-top: 8px;
`

const MenuSelectButton = styled(MenuButton)`
    margin-top: 8px;
`

const MenuTrashBadge = styled.span`
    background-color: ${color.Red};
    color: ${color.White};
    font-size: 12px;
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
