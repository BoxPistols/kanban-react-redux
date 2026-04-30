import { useEffect, ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'

interface BaseModalProps {
    onClose: () => void
    children: ReactNode
    maxWidth?: string
    mobileAlignTop?: boolean
}

// iOS判定（iPhone, iPad, macOS Safari）
function isIOS(): boolean {
    const ua = window.navigator.userAgent.toLowerCase()
    return (
        ua.indexOf('iphone') > -1 ||
        ua.indexOf('ipad') > -1 ||
        (ua.indexOf('macintosh') > -1 && 'ontouchend' in document)
    )
}

export function BaseModal({ onClose, children, maxWidth = '600px', mobileAlignTop = false }: BaseModalProps) {
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const modalRef = useRef<HTMLDivElement>(null)

    // フォーカス管理: モーダル内の最初のフォーカス可能要素にフォーカス
    useEffect(() => {
        const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements?.[0] as HTMLElement
        firstElement?.focus()
    }, [])

    // Escapeキーでモーダルを閉じる & bodyクラスでスクロールを無効化
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        document.addEventListener('keydown', handleKeyDown)

        // Modalが開いているときにbodyクラスを追加（CSSで制御）
        const isIOSDevice = isIOS()
        const scrollY = window.pageYOffset || window.scrollY || 0

        if (isIOSDevice) {
            // iOSの場合: modal-open-iosクラスを追加
            document.body.classList.add('modal-open-ios')
            document.body.style.top = `-${scrollY}px`
        } else {
            // それ以外: modal-openクラスを追加
            document.body.classList.add('modal-open')
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown)

            // bodyクラスを削除
            if (isIOSDevice) {
                document.body.classList.remove('modal-open-ios')
                document.body.style.top = ''
                window.scrollTo(0, scrollY)
            } else {
                document.body.classList.remove('modal-open')
            }
        }
    }, [onClose])

    // Portalを使ってbody直下にレンダリング（DOM階層を分離）
    const modalContent = (
        <Overlay onClick={onClose} $mobileAlignTop={mobileAlignTop}>
            <Modal
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                $theme={theme}
                $maxWidth={maxWidth}
                role='dialog'
                aria-modal='true'
                aria-labelledby='modal-title'
            >
                {children}
            </Modal>
        </Overlay>
    )

    return createPortal(modalContent, document.body)
}

const Overlay = styled.div<{ $mobileAlignTop: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 30;
    touch-action: manipulation;
    overscroll-behavior: contain;
    padding-top: env(safe-area-inset-top, 0);
    padding-bottom: env(safe-area-inset-bottom, 0);
    pointer-events: auto;
    isolation: isolate;
    animation: overlayIn 0.2s ease-out;

    @keyframes overlayIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    @media (min-width: 769px) {
        align-items: center;
        padding-top: 0;
        padding-bottom: 0;
    }
`

const Modal = styled.div<{ $theme: Theme; $maxWidth: string }>`
    background-color: ${(props) => props.$theme.surface};
    border-radius: 12px;
    width: 100%;
    max-width: ${(props) => props.$maxWidth};
    min-height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
    margin: 0;
    position: relative;
    z-index: 31;
    pointer-events: auto;
    isolation: isolate;
    overflow: hidden;
    animation: modalIn 0.25s ease-out;

    @keyframes modalIn {
        from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
        }
        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @media (max-width: 768px) {
        border-radius: 0;
        max-width: 100%;
        height: calc(100vh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
        height: calc(100dvh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
        min-height: unset;
        max-height: none;
        animation: none;
    }

    @media (min-width: 769px) {
        min-height: auto;
        max-height: 90vh;
        max-height: 90dvh;
        margin: auto;
    }
`
