import { memo } from 'react'
import styled, { keyframes } from 'styled-components'
import * as color from '../color'
import { useToastStore, type Toast } from '../store/toastStore'
import { useThemeStore } from '../store/themeStore'
import { getTheme, type Theme } from '../theme'

// 画面下部に操作フィードバック(成功/失敗/Undo)を表示するトースト。
export const ToastContainer = memo(function ToastContainer() {
    const { toasts, dismissToast } = useToastStore()
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)

    if (toasts.length === 0) return null

    return (
        <Container role='status' aria-live='polite'>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} $theme={theme} $type={toast.type}>
                    <ToastMessage>{toast.message}</ToastMessage>
                    {toast.action && (
                        <ActionButton
                            onClick={() => {
                                toast.action?.onAction()
                                dismissToast(toast.id)
                            }}
                        >
                            {toast.action.label}
                        </ActionButton>
                    )}
                    <CloseButton onClick={() => dismissToast(toast.id)} aria-label='通知を閉じる'>
                        ×
                    </CloseButton>
                </ToastItem>
            ))}
        </Container>
    )
})

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(12px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`

const Container = styled.div`
    position: fixed;
    bottom: max(16px, env(safe-area-inset-bottom, 0));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 10000;
    pointer-events: none;
    max-width: min(480px, calc(100vw - 32px));
    width: max-content;
`

const typeAccent = (type: Toast['type']) => {
    switch (type) {
        case 'success':
            return color.Green
        case 'error':
            return color.Red
        default:
            return color.Blue
    }
}

const ToastItem = styled.div<{ $theme: Theme; $type: Toast['type'] }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px 10px 14px;
    border-radius: 10px;
    background: ${(props) => props.$theme.surface};
    color: ${(props) => props.$theme.text};
    border: 1px solid ${(props) => props.$theme.border};
    border-left: 3px solid ${(props) => typeAccent(props.$type)};
    box-shadow: 0 8px 24px ${(props) => props.$theme.shadowHover};
    font-size: 13px;
    pointer-events: auto;
    animation: ${slideUp} 0.2s ease-out;
`

const ToastMessage = styled.span`
    flex: 1;
    line-height: 1.4;
`

const ActionButton = styled.button`
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: ${color.Blue};
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    white-space: nowrap;

    &:hover {
        background: rgba(33, 150, 243, 0.12);
    }
`

const CloseButton = styled.button`
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: inherit;
    opacity: 0.5;
    font-size: 16px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 6px;
    line-height: 1;

    &:hover {
        opacity: 1;
    }
`
