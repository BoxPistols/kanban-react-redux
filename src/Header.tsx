import { useState, useEffect, lazy, Suspense } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { MoonIcon, SunIcon, MenuIcon, CloseIcon, TrashIcon, SettingsIcon } from './icon'
import { useThemeStore } from './store/themeStore'
import { useAuthStore } from './store/authStore'
import { useTrashStore } from './store/trashStore'
import { useBoardStore } from './store/boardStore'
import { useKanbanStore } from './store/kanbanStore'
import { isFirebaseEnabled } from './lib/firebase'
import { generateSeedData, filterSeedBoards, filterSeedCards } from './utils/seedData'

// 遅延ロード: TrashModal
const TrashModal = lazy(() => import('./TrashModal').then((m) => ({ default: m.TrashModal })))

// メールアドレスの頭文字のみ表示（例: i）
function getFirstChar(email: string): string {
    return email[0]?.toLowerCase() || ''
}

export function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()
    const { user, logOut } = useAuthStore()
    const { trashedCards, loadTrash } = useTrashStore()
    const { boards, addBoard, deleteBoard } = useBoardStore()
    const { cards, setCards } = useKanbanStore()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false)
    const [isDevMenuOpen, setIsDevMenuOpen] = useState(false)

    // ゴミ箱を読み込む
    useEffect(() => {
        loadTrash()
    }, [loadTrash])

    const handleLogout = async () => {
        if (window.confirm('ログアウトしますか？')) {
            await logOut()
            setIsMenuOpen(false)
        }
    }

    // サンプルデータ追加
    const handleAddSeedData = async () => {
        if (!window.confirm('サンプルデータを追加しますか？\n（ボード2個、カード9個が追加されます）')) {
            return
        }

        const seedData = generateSeedData()

        try {
            // ボードを追加
            for (const board of seedData.boards) {
                await addBoard(board.name, board.description, board.color, board.labels)
            }

            // カードを追加（localStorage用に直接setCards）
            const newCards = [...cards, ...seedData.cards]
            setCards(newCards)

            alert('✅ サンプルデータを追加しました！')
            setIsMenuOpen(false)
            setIsDevMenuOpen(false)
        } catch (error) {
            console.error('Seed data error:', error)
            alert('❌ サンプルデータの追加に失敗しました')
        }
    }

    // サンプルデータ削除
    const handleRemoveSeedData = async () => {
        const seedBoards = filterSeedBoards(boards)
        if (seedBoards.length === 0) {
            alert('削除するサンプルデータがありません')
            return
        }

        if (
            !window.confirm(
                `サンプルデータを削除しますか？\n（${seedBoards.length}個のボードと関連カードが削除されます）`
            )
        ) {
            return
        }

        try {
            const seedBoardIds = seedBoards.map((b) => b.id)

            // ボードを削除
            for (const boardId of seedBoardIds) {
                await deleteBoard(boardId)
            }

            // カードを削除
            const remainingCards = filterSeedCards(cards, seedBoardIds)
            const newCards = cards.filter((card) => !remainingCards.some((sc) => sc.id === card.id))
            setCards(newCards)

            alert('✅ サンプルデータを削除しました')
            setIsMenuOpen(false)
            setIsDevMenuOpen(false)
        } catch (error) {
            console.error('Remove seed data error:', error)
            alert('❌ サンプルデータの削除に失敗しました')
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

    // 開発者メニューを閉じるための副作用
    useEffect(() => {
        if (!isDevMenuOpen) {
            return
        }

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('[data-dev-menu-container]')) {
                setIsDevMenuOpen(false)
            }
        }

        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDevMenuOpen(false)
            }
        }

        document.addEventListener('click', handleClickOutside)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('click', handleClickOutside)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isDevMenuOpen])

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
                <TrashButton onClick={() => setIsTrashModalOpen(true)} title='ゴミ箱' aria-label='ゴミ箱'>
                    <TrashIcon />
                    {trashedCards.length > 0 && <TrashBadge>{trashedCards.length}</TrashBadge>}
                </TrashButton>
            </DesktopOnly>

            <DesktopOnly>
                <DevMenuContainer>
                    <DevMenuButton
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsDevMenuOpen(!isDevMenuOpen)
                        }}
                        title='開発者メニュー'
                        aria-label='開発者メニュー'
                        data-dev-menu-container
                    >
                        <SettingsIcon />
                    </DevMenuButton>
                    {isDevMenuOpen && (
                        <DevMenuDropdown
                            onClick={(e) => e.stopPropagation()}
                            data-dev-menu-container
                            $isDarkMode={isDarkMode}
                        >
                            <DevMenuItem onClick={handleAddSeedData}>サンプルデータを追加</DevMenuItem>
                            <DevMenuItem onClick={handleRemoveSeedData}>サンプルデータを削除</DevMenuItem>
                        </DevMenuDropdown>
                    )}
                </DevMenuContainer>
            </DesktopOnly>

            {isFirebaseEnabled && user && (
                <DesktopOnly>
                    <UserInfo>
                        <UserInitial title={user.email || undefined}>
                            {user.email ? getFirstChar(user.email) : ''}
                        </UserInitial>
                        <LogoutButton onClick={handleLogout} aria-label='ログアウト'>
                            ログアウト
                        </LogoutButton>
                    </UserInfo>
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
                data-menu-container
            >
                {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>

            {/* モバイルメニュードロワー */}
            {isMenuOpen && (
                <MobileMenuOverlay onClick={() => setIsMenuOpen(false)}>
                    <MobileMenu onClick={(e) => e.stopPropagation()} data-menu-container $isDarkMode={isDarkMode}>
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
                            <MenuTrashButton
                                onClick={() => {
                                    setIsTrashModalOpen(true)
                                    setIsMenuOpen(false)
                                }}
                            >
                                <TrashIcon />
                                <span>ゴミ箱</span>
                                {trashedCards.length > 0 && <MenuTrashBadge>{trashedCards.length}</MenuTrashBadge>}
                            </MenuTrashButton>
                        </MenuSection>

                        <MenuDivider />

                        <MenuSection>
                            <MenuSectionTitle>開発者向け</MenuSectionTitle>
                            <MenuButton onClick={handleAddSeedData}>サンプルデータを追加</MenuButton>
                            <MenuButton onClick={handleRemoveSeedData}>サンプルデータを削除</MenuButton>
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
                                    <MenuLogoutButton onClick={handleLogout}>ログアウト</MenuLogoutButton>
                                </MenuSection>
                            </>
                        )}
                    </MobileMenu>
                </MobileMenuOverlay>
            )}

            {/* ゴミ箱モーダル */}
            {isTrashModalOpen && (
                <Suspense fallback={null}>
                    <TrashModal onClose={() => setIsTrashModalOpen(false)} />
                </Suspense>
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
    background: ${(props) => (props.$isDarkMode ? '#010409' : '#1B2638')};
    border-bottom: 1px solid
        ${(props) => (props.$isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.08)')};
    position: relative;
    z-index: 10;

    @media (max-width: 768px) {
        padding-top: max(8px, env(safe-area-inset-top, 0));
        padding-right: max(12px, env(safe-area-inset-right, 0));
        padding-bottom: 8px;
        padding-left: max(12px, env(safe-area-inset-left, 0));
    }
`

const Logo = styled.div`
    color: rgba(255, 255, 255, 0.85);
    font-size: 15px;
    font-weight: 600;
    flex-shrink: 0;
    letter-spacing: -0.01em;

    @media (max-width: 768px) {
        font-size: 14px;
    }
`

const LeftGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
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
`

const HeaderDivider = styled.div`
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0 8px;
    flex-shrink: 0;
`

const ThemeToggle = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-left: 4px;
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

const UserInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 8px;
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
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-left: 4px;
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

const MenuTrashButton = styled(MenuButton)`
    margin-top: 8px;
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

const DevMenuContainer = styled.div`
    position: relative;
`

const DevMenuButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    margin-left: 4px;
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

const DevMenuDropdown = styled.div<{ $isDarkMode?: boolean }>`
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 220px;
    background: ${(props) =>
        props.$isDarkMode
            ? 'linear-gradient(180deg, #0D1117 0%, #161B22 100%)'
            : 'linear-gradient(180deg, #1B2638 0%, #243447 100%)'};
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: 8px;
    z-index: 100;
    border: 1px solid rgba(255, 255, 255, 0.1);
`

const DevMenuItem = styled.button`
    display: block;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 6px;
    color: ${color.White};
    font-size: 13px;
    text-align: left;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.12);
    }

    & + & {
        margin-top: 4px;
    }
`
