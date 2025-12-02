import { useEffect, ReactNode } from 'react'
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
			<Modal onClick={(e) => e.stopPropagation()} $theme={theme} $maxWidth={maxWidth}>
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1000;
  touch-action: manipulation;
  overscroll-behavior: contain;
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  pointer-events: auto;
  isolation: isolate;

  @media (min-width: 769px) {
    align-items: center;
    padding-top: 0;
    padding-bottom: 0;
  }
`

const Modal = styled.div<{ $theme: Theme; $maxWidth: string }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  width: 100%;
  max-width: ${props => props.$maxWidth};
  min-height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin: 0;
  position: relative;
  z-index: 1001;
  pointer-events: auto;
  isolation: isolate;

  @media (max-width: 768px) {
    border-radius: 0;
    max-width: 100%;
    min-height: calc(100vh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
    min-height: calc(100dvh - env(safe-area-inset-top, 0) - env(safe-area-inset-bottom, 0));
  }

  @media (min-width: 769px) {
    min-height: auto;
    max-height: 90vh;
    max-height: 90dvh;
    margin: auto;
  }
`

