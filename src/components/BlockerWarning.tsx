import { useEffect, useState } from 'react'
import styled from 'styled-components'
import * as color from '../color'
import { useThemeStore } from '../store/themeStore'
import { getTheme, Theme } from '../theme'

export function BlockerWarning() {
    const [isBlocked, setIsBlocked] = useState(false)
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const isDark = isDarkMode

    useEffect(() => {
        // Firestoreへの接続テスト
        const testFirestoreAccess = async () => {
            try {
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 3000)

                await fetch('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen', {
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)
            } catch (error) {
                // ネットワークエラーまたはブロックされた場合
                if (error instanceof Error && error.name !== 'AbortError') {
                    setIsBlocked(true)
                }
            }
        }

        // 2秒後にテスト（初期ロード後）
        const timer = setTimeout(testFirestoreAccess, 2000)
        return () => clearTimeout(timer)
    }, [])

    if (!isBlocked) return null

    return (
        <Warning $theme={theme} $isDark={isDark}>
            <WarningIcon>⚠️</WarningIcon>
            <WarningContent>
                <WarningTitle>Firestoreへの接続がブロックされています</WarningTitle>
                <WarningText>
                    広告ブロッカーまたはブラウザのプライバシー保護機能が <code>firestore.googleapis.com</code>{' '}
                    へのアクセスをブロックしています。
                </WarningText>
                <WarningList>
                    <li>
                        <strong>uBlock Origin / Adblock等:</strong> 拡張機能アイコンをクリックして、このサイトで無効化
                    </li>
                    <li>
                        <strong>Firefoxトラッキング防止:</strong> アドレスバーの盾アイコンから「保護を無効化」
                    </li>
                    <li>
                        <strong>その他:</strong> ブラウザのプライバシー設定を確認
                    </li>
                </WarningList>
                <WarningFooter>設定変更後、ページをリロードしてください。</WarningFooter>
            </WarningContent>
            <CloseButton onClick={() => setIsBlocked(false)} $theme={theme} aria-label='閉じる'>
                ×
            </CloseButton>
        </Warning>
    )
}

const Warning = styled.div<{ $theme: Theme; $isDark: boolean }>`
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 600px;
    width: calc(100% - 32px);
    background-color: ${(props) => (props.$isDark ? '#3d2a1f' : '#fff3cd')};
    border: 2px solid ${color.Red};
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    display: flex;
    gap: 16px;
    animation: slideDown 0.3s ease-out;

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @media (max-width: 768px) {
        top: 60px;
        font-size: 14px;
    }
`

const WarningIcon = styled.div`
    font-size: 32px;
    flex-shrink: 0;
`

const WarningContent = styled.div`
    flex: 1;
    min-width: 0;
`

const WarningTitle = styled.h3`
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 700;
    color: ${color.Red};
`

const WarningText = styled.p`
    margin: 0 0 12px 0;
    font-size: 14px;
    line-height: 1.5;
    color: ${color.Black};

    code {
        background-color: rgba(0, 0, 0, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Monaco', 'Courier New', monospace;
        font-size: 13px;
    }
`

const WarningList = styled.ul`
    margin: 0 0 12px 0;
    padding-left: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: ${color.Black};

    li {
        margin-bottom: 6px;
    }

    strong {
        font-weight: 600;
    }
`

const WarningFooter = styled.p`
    margin: 0;
    font-size: 13px;
    font-style: italic;
    color: ${color.Black};
    opacity: 0.8;
`

const CloseButton = styled.button<{ $theme: Theme }>`
    border: none;
    background: none;
    font-size: 24px;
    color: ${color.Red};
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;

    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
`
