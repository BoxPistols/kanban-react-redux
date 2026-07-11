import { useRef, useEffect, memo, useCallback } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { PrimaryButton, SecondaryButton } from './Button'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { isComposing, isModifierKey } from './utils/keyboard'

export const InputForm = memo(function InputForm({
    value,
    onChange,
    onConfirm,
    onCancel,
    className,
}: {
    value?: string
    onChange?(value: string): void
    onConfirm?(): void
    onCancel?(): void
    className?: string
}) {
    const { isDarkMode } = useThemeStore()
    const theme = getTheme(isDarkMode)
    const disabled = !value?.trim()
    const handleConfirm = useCallback(() => {
        if (disabled) return
        onConfirm?.()
    }, [disabled, onConfirm])

    const ref = useAutoFitToContentHeight(value)

    // フォーカス管理: フォーム表示時に入力欄にフォーカス
    useEffect(() => {
        ref.current?.focus()
    }, [])

    return (
        <Container className={className}>
            <Input
                ref={ref}
                placeholder='カードのタイトルを入力…'
                value={value}
                onChange={(ev) => onChange?.(ev.currentTarget.value)}
                onKeyDown={(ev) => {
                    // IME入力中はEnterキーを無視
                    if (isComposing(ev)) return

                    // Enter で追加(Trello同等)。Shift+Enter は改行、Cmd/Ctrl+Enter も追加として維持
                    if (ev.key === 'Enter' && (!ev.shiftKey || isModifierKey(ev))) {
                        ev.preventDefault()
                        handleConfirm()
                    }
                    if (ev.key === 'Escape') {
                        ev.preventDefault()
                        onCancel?.()
                    }
                }}
                $theme={theme}
                aria-label='カード内容を入力'
            />

            <ButtonRow>
                <AddButton disabled={disabled} onClick={handleConfirm} aria-label='カードを追加' />
                <CancelButton onClick={onCancel} aria-label='入力をキャンセル' />
                <SubmitHint $theme={theme}>Enterで追加</SubmitHint>
            </ButtonRow>
        </Container>
    )
})

/**
 * テキストエリアの高さを内容に合わせて自動調整する
 *
 * @param content テキストエリアの内容
 */
function useAutoFitToContentHeight(content: string | undefined) {
    const ref = useRef<HTMLTextAreaElement>(null)

    useEffect(
        () => {
            const el = ref.current
            if (!el) return

            const { borderTopWidth, borderBottomWidth } = getComputedStyle(el)
            el.style.height = 'auto' // 一度 auto にしないと高さが縮まなくなる
            el.style.height = `calc(${borderTopWidth} + ${el.scrollHeight}px + ${borderBottomWidth})`
        },
        // 内容が変わるたびに高さを再計算
        [content]
    )

    return ref
}

const Container = styled.div``

const Input = styled.textarea<{ $theme: Theme }>`
    display: block;
    width: 100%;
    margin-bottom: 8px;
    border: solid 1px ${(props) => props.$theme.border};
    border-radius: 3px;
    padding: 6px 8px;
    background-color: ${(props) => props.$theme.inputBackground};
    color: ${(props) => props.$theme.text};
    font-size: 14px;
    line-height: 1.7;

    :focus {
        outline: none;
        border-color: ${color.Blue};
    }
`

const ButtonRow = styled.div`
    display: flex;

    > :not(:first-child) {
        margin-left: 8px;
    }
`

const AddButton = styled(PrimaryButton).attrs({
    children: 'カードを追加',
})``

const CancelButton = styled(SecondaryButton).attrs({
    children: 'キャンセル',
})``

const SubmitHint = styled.span<{ $theme: Theme }>`
    margin-left: auto;
    align-self: center;
    font-size: 12px;
    color: ${(props) => props.$theme.textSecondary};
    opacity: 0.7;
`
