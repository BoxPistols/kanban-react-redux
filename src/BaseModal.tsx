import { useEffect, ReactNode } from 'react'
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

	// Escapeキーでモーダルを閉じる & bodyのスクロールを無効化
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose()
			}
		}
		document.addEventListener('keydown', handleKeyDown)

		// Modalが開いているときにbodyのスクロールを無効化（iOS Safari対応）
		const scrollY = window.pageYOffset || window.scrollY || 0
		const rootElement = document.getElementById('root')
		const appContainer = rootElement?.querySelector('[data-app-container]') as HTMLElement
		const isIOSDevice = isIOS()
		
		// すべてのカンバンボード要素を取得
		const allCards = document.querySelectorAll('[data-card-container]')
		const allColumns = document.querySelectorAll('[data-column-container]')
		const horizontalScroll = document.querySelector('[data-horizontal-scroll]')
		
		const originalBodyOverflow = document.body.style.overflow
		const originalBodyPosition = document.body.style.position
		const originalBodyTop = document.body.style.top
		const originalBodyWidth = document.body.style.width
		const originalBodyHeight = document.body.style.height
		const originalBodyPointerEvents = document.body.style.pointerEvents
		const originalBodyZIndex = document.body.style.zIndex
		const originalRootWidth = rootElement?.style.width || ''
		const originalRootHeight = rootElement?.style.height || ''
		const originalRootPointerEvents = rootElement?.style.pointerEvents || ''
		const originalRootZIndex = rootElement?.style.zIndex || ''
		const originalAppPointerEvents = appContainer?.style.pointerEvents || ''
		const originalAppZIndex = appContainer?.style.zIndex || ''
		
		// カンバンボード要素のz-indexを保存
		const originalCardZIndexes: string[] = []
		const originalColumnZIndexes: string[] = []
		allCards.forEach((card) => {
			const htmlCard = card as HTMLElement
			originalCardZIndexes.push(htmlCard.style.zIndex || '')
			htmlCard.style.zIndex = '-1'
		})
		allColumns.forEach((column) => {
			const htmlColumn = column as HTMLElement
			originalColumnZIndexes.push(htmlColumn.style.zIndex || '')
			htmlColumn.style.zIndex = '-1'
		})
		
		// 背景要素のpointer-eventsとz-indexを無効化
		document.body.style.pointerEvents = 'none'
		document.body.style.zIndex = '-1'
		if (rootElement) {
			rootElement.style.pointerEvents = 'none'
			rootElement.style.zIndex = '-1'
		}
		if (appContainer) {
			appContainer.style.pointerEvents = 'none'
			appContainer.style.zIndex = '-1'
		}
		if (horizontalScroll) {
			(horizontalScroll as HTMLElement).style.zIndex = '-1'
		}
		
		if (isIOSDevice) {
			// iOSの場合: position: fixed を使用
			document.body.style.position = 'fixed'
			document.body.style.top = `-${scrollY}px`
			document.body.style.width = '100%'
			document.body.style.height = '100%'
			if (rootElement) {
				rootElement.style.width = '100%'
				rootElement.style.height = '100%'
			}
		} else {
			// それ以外: overflow: hidden を使用
			document.body.style.overflow = 'hidden'
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			
			// カンバンボード要素のz-indexを復元
			allCards.forEach((card, index) => {
				const htmlCard = card as HTMLElement
				htmlCard.style.zIndex = originalCardZIndexes[index] || ''
			})
			allColumns.forEach((column, index) => {
				const htmlColumn = column as HTMLElement
				htmlColumn.style.zIndex = originalColumnZIndexes[index] || ''
			})
			if (horizontalScroll) {
				(horizontalScroll as HTMLElement).style.zIndex = ''
			}
			
			// pointer-eventsとz-indexを復元
			document.body.style.pointerEvents = originalBodyPointerEvents || ''
			document.body.style.zIndex = originalBodyZIndex || ''
			if (rootElement) {
				rootElement.style.pointerEvents = originalRootPointerEvents
				rootElement.style.zIndex = originalRootZIndex
			}
			if (appContainer) {
				appContainer.style.pointerEvents = originalAppPointerEvents
				appContainer.style.zIndex = originalAppZIndex
			}
			
			if (isIOSDevice) {
				document.body.style.position = originalBodyPosition || ''
				document.body.style.top = originalBodyTop || ''
				document.body.style.width = originalBodyWidth || ''
				document.body.style.height = originalBodyHeight || ''
				if (rootElement) {
					rootElement.style.width = originalRootWidth
					rootElement.style.height = originalRootHeight
				}
				window.scrollTo(0, scrollY)
			} else {
				document.body.style.overflow = originalBodyOverflow || ''
			}
		}
	}, [onClose])

	return (
		<Overlay onClick={onClose} $mobileAlignTop={mobileAlignTop}>
			<Modal onClick={(e) => e.stopPropagation()} $theme={theme} $maxWidth={maxWidth}>
				{children}
			</Modal>
		</Overlay>
	)
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
  z-index: 99999;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: manipulation;
  overscroll-behavior: contain;
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  pointer-events: auto;

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
  z-index: 100000;
  pointer-events: auto;

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

