import { Component, ReactNode } from 'react'
import styled from 'styled-components'
import { getTheme } from './theme'

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // エラーログをコンソールに出力（本番環境ではエラー追跡サービスに送信することを推奨）
        console.error('Error caught by ErrorBoundary:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.reload()
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            const theme = getTheme(false) // デフォルトはライトモード

            return (
                <ErrorContainer $theme={theme}>
                    <ErrorCard $theme={theme}>
                        <ErrorTitle $theme={theme}>エラーが発生しました</ErrorTitle>
                        <ErrorMessage $theme={theme}>
                            申し訳ございません。予期しないエラーが発生しました。
                            <br />
                            ページをリロードして再度お試しください。
                        </ErrorMessage>
                        {this.state.error && (
                            <ErrorDetails $theme={theme}>
                                <strong>エラー詳細:</strong>
                                <pre>{this.state.error.message}</pre>
                            </ErrorDetails>
                        )}
                        <ReloadButton onClick={this.handleReset} $theme={theme}>
                            ページをリロード
                        </ReloadButton>
                    </ErrorCard>
                </ErrorContainer>
            )
        }

        return this.props.children
    }
}

const ErrorContainer = styled.div<{ $theme: ReturnType<typeof getTheme> }>`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: ${(props) => props.$theme.background};
    padding: 20px;
`

const ErrorCard = styled.div<{ $theme: ReturnType<typeof getTheme> }>`
    background: ${(props) => props.$theme.surface};
    border: 1px solid ${(props) => props.$theme.border};
    border-radius: 12px;
    padding: 40px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 4px 12px ${(props) => props.$theme.shadow};
`

const ErrorTitle = styled.h1<{ $theme: ReturnType<typeof getTheme> }>`
    margin: 0 0 16px 0;
    font-size: 24px;
    color: ${(props) => props.$theme.text};
    font-weight: 600;
`

const ErrorMessage = styled.p<{ $theme: ReturnType<typeof getTheme> }>`
    margin: 0 0 20px 0;
    font-size: 14px;
    color: ${(props) => props.$theme.textSecondary};
    line-height: 1.6;
`

const ErrorDetails = styled.div<{ $theme: ReturnType<typeof getTheme> }>`
    margin: 0 0 20px 0;
    padding: 12px;
    background: ${(props) => props.$theme.surfaceHover};
    border-radius: 6px;
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};

    strong {
        display: block;
        margin-bottom: 8px;
        color: ${(props) => props.$theme.text};
    }

    pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
`

const ReloadButton = styled.button<{ $theme: ReturnType<typeof getTheme> }>`
    width: 100%;
    padding: 12px 24px;
    background: #0079bf;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
        background: #026aa7;
    }

    &:active {
        transform: translateY(1px);
    }
`
