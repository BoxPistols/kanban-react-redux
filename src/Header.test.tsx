import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Header は isFirebaseEnabled && user のときだけアカウント導線を描画する。
// firebase/各ストア/子コンポーネントをモックしてログイン済み状態を再現する。
const logOutMock = vi.fn()

vi.mock('./lib/firebase', () => ({ isFirebaseEnabled: true }))
vi.mock('./store/authStore', () => ({
    useAuthStore: () => ({ user: { email: 'ito@example.com' }, logOut: logOutMock }),
}))
vi.mock('./store/themeStore', () => ({
    useThemeStore: () => ({ isDarkMode: true, toggleDarkMode: vi.fn() }),
}))
vi.mock('./store/trashStore', () => ({
    useTrashStore: () => ({ trashedCards: [], loadTrash: vi.fn() }),
}))
vi.mock('./CardFilter', () => ({ CardFilter: () => null }))
vi.mock('./BoardSelector', () => ({ BoardSelector: () => null }))
vi.mock('./icon', () => ({
    MoonIcon: () => null,
    SunIcon: () => null,
    MenuIcon: () => null,
    CloseIcon: () => null,
    TrashIcon: () => null,
    SelectIcon: () => null,
}))
// Header は選択モードのトグルで kanbanStore を参照する(ログアウト導線には無関係）
vi.mock('./store/kanbanStore', () => ({
    useKanbanStore: (selector: (s: { isSelectMode: boolean; setSelectMode: () => void }) => unknown) =>
        selector({ isSelectMode: false, setSelectMode: () => {} }),
}))

import { Header } from './Header'

describe('Header アカウントメニュー', () => {
    beforeEach(() => {
        logOutMock.mockClear()
    })

    it('アバターはボタンで、クリックでアカウントメニュー(メール+ログアウト)が開く', () => {
        render(<Header />)
        const avatar = screen.getByRole('button', { name: 'アカウントメニュー' })
        expect(avatar).toHaveAttribute('aria-expanded', 'false')
        // 開く前はログアウトもメニューも存在しない(死角の再発防止)
        expect(screen.queryByRole('menu', { name: 'アカウント' })).toBeNull()

        fireEvent.click(avatar)

        expect(avatar).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('menu', { name: 'アカウント' })).toBeInTheDocument()
        expect(screen.getByText('ito@example.com')).toBeInTheDocument()
        expect(screen.getByRole('menuitem', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('Escキーでメニューが閉じる', () => {
        render(<Header />)
        fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }))
        expect(screen.getByRole('menu', { name: 'アカウント' })).toBeInTheDocument()

        fireEvent.keyDown(document, { key: 'Escape' })

        expect(screen.queryByRole('menu', { name: 'アカウント' })).toBeNull()
    })

    it('ログアウト押下で確認ダイアログ後に logOut を呼ぶ', () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
        render(<Header />)
        fireEvent.click(screen.getByRole('button', { name: 'アカウントメニュー' }))
        fireEvent.click(screen.getByRole('menuitem', { name: 'ログアウト' }))

        expect(confirmSpy).toHaveBeenCalled()
        expect(logOutMock).toHaveBeenCalledTimes(1)
        confirmSpy.mockRestore()
    })
})
