import { useEffect, useState } from 'react'
import styled from 'styled-components'
import * as color from '../color'
import { useThemeStore } from '../store/themeStore'
import { getTheme, Theme } from '../theme'
import { useKanbanStore } from '../store/kanbanStore'

// 表示バリアント:
//   'blocked' … 広告ブロッカー/プライバシー保護による遮断が濃厚(赤い警告)
//   'offline' … 単なる通信断。ローカルデータで継続中(穏当な情報表示)
type Variant = 'blocked' | 'offline' | null

export function BlockerWarning() {
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const isDark = isDarkMode
    const error = useKanbanStore((state) => state.error)

    // 10秒後の通信ログ検査で遮断を検出したフラグ
    const [timerBlocked, setTimerBlocked] = useState(false)
    // ユーザーが閉じたシグナル。同じシグナルが続く間は再表示しない
    const [dismissed, setDismissed] = useState<string | null>(null)

    useEffect(() => {
        // 10秒後に自動チェック（初期読み込み完了を待つ）
        const timer = setTimeout(() => {
            // エラーがなく、かつカードが0件の場合は接続問題の可能性
            const cards = useKanbanStore.getState().cards
            const isLoading = useKanbanStore.getState().isLoading
            const hasError = useKanbanStore.getState().error

            // Firebase接続に失敗している兆候を検出
            if (!isLoading && cards.length === 0 && !hasError) {
                // firestore.googleapis.com へのリクエストが即時終了(転送量0/所要0)なら
                // 拡張機能による遮断の可能性が高い
                const performanceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
                const blockedRequests = performanceEntries.filter(
                    (entry) =>
                        entry.name.includes('firestore.googleapis.com') &&
                        (entry.transferSize === 0 || entry.duration === 0)
                )

                if (blockedRequests.length > 0) {
                    setTimerBlocked(true)
                }
            }
        }, 10000)

        return () => clearTimeout(timer)
    }, [])

    // 表示バリアントはレンダリング中に導出する(setState を effect 内で呼ばない)。
    // 明示的な分類プレフィックスで切り替え、遮断(赤)はブロッカー由来が濃厚な
    // ときだけに限定する。一時的な通信断は穏当なオフライン表示にする。
    const variant: Variant = timerBlocked
        ? 'blocked'
        : error?.includes('ERR_BLOCKED')
          ? 'blocked'
          : error?.includes('ERR_OFFLINE')
            ? 'offline'
            : null

    // 現在の表示要因を表すトークン。閉じたら同じトークンの間は非表示にする
    const signal = timerBlocked ? 'timer-blocked' : error
    if (!variant || (signal !== null && signal === dismissed)) return null

    const dismiss = () => setDismissed(signal)

    // オフライン: 遮断とは断定せず、ローカルで継続していることを穏当に知らせる
    if (variant === 'offline') {
        return (
            <Info $theme={theme} $isDark={isDark} role='status'>
                <WarningIcon>📴</WarningIcon>
                <WarningContent>
                    <InfoTitle>オフラインのためローカルデータを表示しています</InfoTitle>
                    <WarningText>
                        現在 <code>firestore.googleapis.com</code>{' '}
                        へ接続できないため、この端末に保存された内容を表示しています。接続が回復すると自動的に同期を再開します。
                    </WarningText>
                </WarningContent>
                <CloseButton onClick={dismiss} $theme={theme} aria-label='閉じる'>
                    ×
                </CloseButton>
            </Info>
        )
    }

    // 遮断が濃厚(赤い警告)。ただし断定はせず「可能性」として案内する
    return (
        <Warning $theme={theme} $isDark={isDark} role='alert'>
            <WarningIcon>⚠️</WarningIcon>
            <WarningContent>
                <WarningTitle>Firestoreへの接続がブロックされている可能性があります</WarningTitle>
                <WarningText>
                    広告ブロッカーまたはブラウザのプライバシー保護機能が <code>firestore.googleapis.com</code>{' '}
                    への接続を遮断している可能性があります。ローカルデータでの表示は継続しています。
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
                <WarningFooter>設定変更後、ページをリロードすると同期を再開します。</WarningFooter>
            </WarningContent>
            <CloseButton onClick={dismiss} $theme={theme} aria-label='閉じる'>
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

// オフライン用の穏当な情報バナー(青系・非警告)。Warning とレイアウトは共通。
const Info = styled(Warning)`
    background-color: ${(props) => (props.$isDark ? '#1f2d3d' : '#e7f3ff')};
    border-color: ${color.Blue};
`

const InfoTitle = styled.h3`
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 700;
    color: ${color.Blue};
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
