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

		// Modalが開いているときにbodyのスクロールを無効化
		const originalOverflow = document.body.style.overflow
		const originalPosition = document.body.style.position
		const originalWidth = document.body.style.width
		document.body.style.overflow = 'hidden'
		document.body.style.position = 'fixed'
		document.body.style.width = '100%'

		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.body.style.overflow = originalOverflow
			document.body.style.position = originalPosition
			document.body.style.width = originalWidth
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: manipulation;

  @media (max-width: 768px) {
    align-items: flex-start;
    padding-top: env(safe-area-inset-top, 0);
  }
`

const Modal = styled.div<{ $theme: Theme; $maxWidth: string }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  width: 100%;
  max-width: ${props => props.$maxWidth};
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin: auto;
  position: relative;
  z-index: 10001;

  @media (max-width: 768px) {
    min-height: calc(100dvh - env(safe-area-inset-top, 0));
    min-height: calc(100vh - env(safe-area-inset-top, 0));
    border-radius: 0;
    max-width: 100%;
    margin-top: env(safe-area-inset-top, 0);
  }
`

