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
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 16px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: manipulation;

  @media (max-width: 768px) {
    align-items: ${props => props.$mobileAlignTop ? 'flex-start' : 'center'};
    padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
  }
`

const Modal = styled.div<{ $theme: Theme; $maxWidth: string }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  width: 100%;
  max-width: ${props => props.$maxWidth};
  max-height: 90vh;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  margin: auto;
  position: relative;
  z-index: 10000;

  @media (max-width: 768px) {
    max-height: calc(100dvh - max(8px, env(safe-area-inset-top)) - max(8px, env(safe-area-inset-bottom)));
    margin: 0 auto;
    border-radius: 8px 8px 0 0;
  }
`

