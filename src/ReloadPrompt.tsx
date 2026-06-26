import { useEffect, useState, memo } from 'react'
import styled from 'styled-components'
import { getTheme, type Theme } from './theme'
import { useThemeStore } from './store/themeStore'
import { isMac } from './utils/keyboard'

interface ReloadPromptProps {
    isVisible: boolean
    onReload: () => void
}

export const ReloadPrompt = memo(function ReloadPrompt({ isVisible, onReload }: ReloadPromptProps) {
    const isDarkMode = useThemeStore((state) => state.isDarkMode)
    const theme = getTheme(isDarkMode)
    const [isAnimating, setIsAnimating] = useState(false)

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true)
        }
    }, [isVisible])

    if (!isVisible && !isAnimating) return null

    const shortcut = isMac() ? 'Cmd + Shift + R' : 'Ctrl + Shift + R'

    return (
        <Overlay $theme={theme} $isVisible={isVisible}>
            <Modal $theme={theme} $isVisible={isVisible}>
                <Icon>⚠️</Icon>
                <Title $theme={theme}>データの読み込みに問題があります</Title>
                <Message $theme={theme}>
                    データが正しく読み込まれていない可能性があります。
                    <br />
                    ハードリロードをお試しください。
                </Message>
                <ShortcutHint $theme={theme}>ショートカット: {shortcut}</ShortcutHint>
                <ButtonGroup>
                    <ReloadButton onClick={onReload} $theme={theme}>
                        今すぐリロード
                    </ReloadButton>
                </ButtonGroup>
            </Modal>
        </Overlay>
    )
})

const Overlay = styled.div<{ $theme: Theme; $isVisible: boolean }>`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: ${(props) => (props.$isVisible ? 1 : 0)};
    transition: opacity 0.3s ease;
    pointer-events: ${(props) => (props.$isVisible ? 'auto' : 'none')};
`

const Modal = styled.div<{ $theme: Theme; $isVisible: boolean }>`
    background: ${(props) => props.$theme.surface};
    border-radius: 12px;
    padding: 32px;
    max-width: 440px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    text-align: center;
    transform: ${(props) => (props.$isVisible ? 'scale(1)' : 'scale(0.9)')};
    opacity: ${(props) => (props.$isVisible ? 1 : 0)};
    transition:
        transform 0.3s ease,
        opacity 0.3s ease;
`

const Icon = styled.div`
    font-size: 48px;
    margin-bottom: 16px;
`

const Title = styled.h2<{ $theme: Theme }>`
    color: ${(props) => props.$theme.text};
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 12px 0;
`

const Message = styled.p<{ $theme: Theme }>`
    color: ${(props) => props.$theme.textSecondary};
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 16px 0;
`

const ShortcutHint = styled.div<{ $theme: Theme }>`
    background: ${(props) => props.$theme.background};
    color: ${(props) => props.$theme.textSecondary};
    font-size: 12px;
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 24px;
    display: inline-block;
`

const ButtonGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`

const ReloadButton = styled.button<{ $theme: Theme }>`
    background: #0079bf;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #026aa7;
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
`
