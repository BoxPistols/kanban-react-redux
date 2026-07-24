import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import * as color from './color'
import { useThemeStore } from './store/themeStore'
import { getTheme, type Theme } from './theme'

// 右クリック(または長押し)で開く汎用コンテキストメニュー。
// - ビューポート内に収まるよう座標をクランプ
// - submenu はドリルダウン(戻る付き)でフライアウトの位置ずれを回避
// - Esc / 外側クリック / スクロール / リサイズで閉じる。矢印キーで行移動
export interface ContextMenuItem {
    id: string
    label?: string
    icon?: ReactNode
    colorDot?: string
    onClick?: () => void
    submenu?: ContextMenuItem[]
    danger?: boolean
    disabled?: boolean
    separator?: boolean
}

interface Frame {
    items: ContextMenuItem[]
    title?: string
}

export function ContextMenu({
    x,
    y,
    items,
    onClose,
}: {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}) {
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const menuRef = useRef<HTMLDivElement>(null)
    const [stack, setStack] = useState<Frame[]>([{ items }])
    const [pos, setPos] = useState({ x, y })
    const current = stack[stack.length - 1]

    // 描画後にサイズを測ってビューポート内へクランプ
    useLayoutEffect(() => {
        const el = menuRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const margin = 8
        let nx = x
        let ny = y
        if (x + rect.width > window.innerWidth - margin) nx = window.innerWidth - rect.width - margin
        if (y + rect.height > window.innerHeight - margin) ny = window.innerHeight - rect.height - margin
        setPos({ x: Math.max(margin, nx), y: Math.max(margin, ny) })
    }, [x, y, stack.length])

    // 開いたら最初の行へフォーカス(キーボード操作の起点)
    useEffect(() => {
        const first = menuRef.current?.querySelector<HTMLElement>('[data-menu-row]:not([aria-disabled="true"])')
        first?.focus()
    }, [stack.length])

    useEffect(() => {
        const rows = () =>
            Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>('[data-menu-row]:not([aria-disabled="true"])') ?? []
            )
        const onDown = (e: MouseEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) onClose()
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
                return
            }
            if (e.key === 'ArrowLeft' && stack.length > 1) {
                e.preventDefault()
                setStack((s) => s.slice(0, -1))
                return
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                const list = rows()
                if (list.length === 0) return
                const idx = list.indexOf(document.activeElement as HTMLElement)
                const next = e.key === 'ArrowDown' ? (idx + 1) % list.length : (idx - 1 + list.length) % list.length
                list[next]?.focus()
            }
        }
        const close = () => onClose()
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey, true)
        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey, true)
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
        }
    }, [onClose, stack.length])

    const activate = (item: ContextMenuItem) => {
        if (item.disabled) return
        if (item.submenu) {
            setStack((s) => [...s, { items: item.submenu!, title: item.label }])
            return
        }
        item.onClick?.()
        onClose()
    }

    return createPortal(
        <Root
            ref={menuRef}
            style={{ left: pos.x, top: pos.y }}
            $theme={theme}
            role='menu'
            aria-label={current.title ?? 'コンテキストメニュー'}
            onContextMenu={(e) => e.preventDefault()}
        >
            {current.title && (
                <BackRow
                    data-menu-row
                    role='menuitem'
                    tabIndex={0}
                    $theme={theme}
                    onClick={() => setStack((s) => s.slice(0, -1))}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setStack((s) => s.slice(0, -1))
                        }
                    }}
                >
                    <Chevron aria-hidden='true'>‹</Chevron>
                    <BackLabel>{current.title}</BackLabel>
                </BackRow>
            )}
            {current.items.map((item) =>
                item.separator ? (
                    <Separator key={item.id} $theme={theme} />
                ) : (
                    <Row
                        key={item.id}
                        data-menu-row
                        role='menuitem'
                        tabIndex={item.disabled ? -1 : 0}
                        aria-disabled={item.disabled || undefined}
                        aria-haspopup={item.submenu ? 'menu' : undefined}
                        $theme={theme}
                        $danger={item.danger}
                        $disabled={item.disabled}
                        onClick={() => activate(item)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ' || (item.submenu && e.key === 'ArrowRight')) {
                                e.preventDefault()
                                activate(item)
                            }
                        }}
                    >
                        {item.colorDot && <Dot $color={item.colorDot} />}
                        {item.icon && <IconWrap>{item.icon}</IconWrap>}
                        <Label>{item.label}</Label>
                        {item.submenu && <ChevronRight aria-hidden='true'>›</ChevronRight>}
                    </Row>
                )
            )}
        </Root>,
        document.body
    )
}

const appear = keyframes`
    from {
        opacity: 0;
        transform: scale(0.96) translateY(-4px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
`

const Root = styled.div<{ $theme: Theme }>`
    position: fixed;
    z-index: 3000;
    min-width: 220px;
    max-width: 280px;
    padding: 6px;
    border-radius: 12px;
    background: ${(props) => props.$theme.surface};
    border: 1px solid ${(props) => props.$theme.border};
    box-shadow: 0 16px 48px ${(props) => props.$theme.shadowHover};
    backdrop-filter: blur(8px);
    transform-origin: top left;
    animation: ${appear} 0.12s cubic-bezier(0.2, 0.8, 0.2, 1);

    @media (max-width: 480px) {
        min-width: min(220px, calc(100vw - 24px));
    }
`

const rowBase = (theme: Theme) => `
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.3;
    color: ${theme.text};
    cursor: pointer;
    user-select: none;
    outline: none;
    transition: background 0.12s;

    &:hover {
        background: ${theme.surfaceHover};
    }

    &:focus-visible {
        background: ${theme.surfaceHover};
        box-shadow: inset 0 0 0 2px ${color.Blue};
    }
`

const Row = styled.div<{ $theme: Theme; $danger?: boolean; $disabled?: boolean }>`
    ${(props) => rowBase(props.$theme)}
    color: ${(props) => (props.$danger ? color.Red : props.$theme.text)};
    opacity: ${(props) => (props.$disabled ? 0.4 : 1)};
    cursor: ${(props) => (props.$disabled ? 'not-allowed' : 'pointer')};

    &:hover {
        background: ${(props) => (props.$disabled ? 'transparent' : props.$danger ? `${color.Red}18` : props.$theme.surfaceHover)};
    }
`

const BackRow = styled.div<{ $theme: Theme }>`
    ${(props) => rowBase(props.$theme)}
    color: ${(props) => props.$theme.textSecondary};
    font-weight: 600;
    margin-bottom: 2px;
    border-bottom: 1px solid ${(props) => props.$theme.border};
    border-radius: 8px 8px 0 0;
`

const BackLabel = styled.span`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const IconWrap = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
        width: 15px;
        height: 15px;
    }
`

const Dot = styled.span<{ $color: string }>`
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: ${(props) => props.$color};
    flex-shrink: 0;
`

const Label = styled.span`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const Chevron = styled.span`
    font-size: 16px;
    line-height: 1;
`

const ChevronRight = styled.span`
    font-size: 16px;
    line-height: 1;
    opacity: 0.6;
    flex-shrink: 0;
`

const Separator = styled.div<{ $theme: Theme }>`
    height: 1px;
    margin: 4px 6px;
    background: ${(props) => props.$theme.border};
`
