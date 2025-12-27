import { useRef, useEffect } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { PrimaryButton, SecondaryButton } from './Button'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'

export function InputForm({
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
    const handleConfirm = () => {
        if (disabled) return
        onConfirm?.()
    }

    const ref = useAutoFitToContentHeight(value)

    return (
        <Container className={className}>
            <Input
                ref={ref}
                autoFocus
                placeholder="Enter a note"
                value={value}
                onChange={ev => onChange?.(ev.currentTarget.value)}
                onKeyDown={ev => {
                    if (!((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter')) return
                    handleConfirm()
                }}
                $theme={theme}
            />

            <ButtonRow>
                <AddButton disabled={disabled} onClick={handleConfirm} />
                <CancelButton onClick={onCancel} />
            </ButtonRow>
        </Container>
    )
}

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
        [content],
    )

    return ref
}

const Container = styled.div``

const Input = styled.textarea<{ $theme: any }>`
  display: block;
  width: 100%;
  margin-bottom: 8px;
  border: solid 1px ${props => props.$theme.border};
  border-radius: 3px;
  padding: 6px 8px;
  background-color: ${props => props.$theme.inputBackground};
  color: ${props => props.$theme.text};
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
    children: 'Add',
})``

const CancelButton = styled(SecondaryButton).attrs({
    children: 'Cancel',
})``