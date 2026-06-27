import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LinkedText } from './LinkedText'
import { getTheme } from './theme'
import type { UrlMetadata } from './types'

const theme = getTheme(false)

describe('LinkedText', () => {
    it('URL を含まないテキストはリンク化せずそのまま表示する', () => {
        const { container } = render(<LinkedText text='ただのテキスト' theme={theme} />)
        expect(container.querySelectorAll('a')).toHaveLength(0)
        expect(container.textContent).toBe('ただのテキスト')
    })

    it('単一の URL をアンカーに変換し href とテキストに URL を使う', () => {
        render(<LinkedText text='see https://example.com now' theme={theme} />)
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', 'https://example.com')
        expect(link).toHaveTextContent('https://example.com')
    })

    it('リンクは新しいタブで開き安全な rel を付与する', () => {
        render(<LinkedText text='https://example.com' theme={theme} />)
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('メタデータの title を表示文言に使いつつ href には URL を保つ', () => {
        const metadata: UrlMetadata[] = [{ url: 'https://example.com', title: 'Example Site', fetchedAt: 0 }]
        render(<LinkedText text='https://example.com' metadata={metadata} theme={theme} />)
        const link = screen.getByRole('link')
        expect(link).toHaveTextContent('Example Site')
        expect(link).toHaveAttribute('href', 'https://example.com')
        // title 属性は常に生 URL（ホバーで実体を確認できる）
        expect(link).toHaveAttribute('title', 'https://example.com')
    })

    it('リンク前後のプレーンテキストを保持する', () => {
        const { container } = render(<LinkedText text='before https://example.com after' theme={theme} />)
        expect(container.textContent).toBe('before https://example.com after')
        expect(screen.getAllByRole('link')).toHaveLength(1)
    })

    it('複数の URL を出現順にリンク化する', () => {
        render(<LinkedText text='https://a.example.com and https://b.example.com' theme={theme} />)
        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(2)
        expect(links[0]).toHaveAttribute('href', 'https://a.example.com')
        expect(links[1]).toHaveAttribute('href', 'https://b.example.com')
    })

    it('末尾の ASCII 句読点はリンクに含めない', () => {
        render(<LinkedText text='詳細は https://example.com. 続きを読む' theme={theme} />)
        const link = screen.getByRole('link')
        expect(link).toHaveAttribute('href', 'https://example.com')
    })

    it('新しいタブで開くことを示すアクセシブルなラベルを付与する', () => {
        render(<LinkedText text='https://example.com' theme={theme} />)
        const link = screen.getByRole('link')
        expect(link.getAttribute('aria-label')).toContain('新しいタブで開く')
    })
})
