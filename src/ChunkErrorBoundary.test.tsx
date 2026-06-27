import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChunkErrorBoundary, clearChunkReloadFlag } from './ChunkErrorBoundary'

const RELOAD_FLAG = 'kanban-chunk-reload-attempted'

// 描画時に投げるだけのコンポーネント
function Bomb({ error }: { error: Error }): never {
    throw error
}

describe('ChunkErrorBoundary', () => {
    let reloadMock: ReturnType<typeof vi.fn>
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    const originalLocation = window.location

    beforeEach(() => {
        sessionStorage.clear()
        reloadMock = vi.fn()
        // jsdom では location.reload が non-configurable なので、location ごと差し替える。
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { href: originalLocation.href, reload: reloadMock },
        })
        // エラーバウンダリが捕捉した例外の console.error ノイズを抑止
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        })
        consoleErrorSpy.mockRestore()
    })

    it('エラーが無ければ子要素をそのまま描画する', () => {
        render(
            <ChunkErrorBoundary>
                <div>正常な子要素</div>
            </ChunkErrorBoundary>
        )
        expect(screen.getByText('正常な子要素')).toBeInTheDocument()
    })

    it('ChunkLoadError を捕捉したら一度だけリロードしフラグを立てる', () => {
        render(
            <ChunkErrorBoundary>
                <Bomb error={new Error('Loading chunk 42 failed')} />
            </ChunkErrorBoundary>
        )
        expect(reloadMock).toHaveBeenCalledTimes(1)
        expect(sessionStorage.getItem(RELOAD_FLAG)).toBe('1')
    })

    it('既にリロード済みフラグがあれば再リロードしない（ループ防止）', () => {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        render(
            <ChunkErrorBoundary>
                <Bomb error={new Error('Failed to fetch dynamically imported module')} />
            </ChunkErrorBoundary>
        )
        expect(reloadMock).not.toHaveBeenCalled()
    })

    it('チャンク系でない通常エラーではリロードせず何も描画しない', () => {
        const { container } = render(
            <ChunkErrorBoundary>
                <Bomb error={new Error('ただのレンダリングエラー')} />
            </ChunkErrorBoundary>
        )
        expect(reloadMock).not.toHaveBeenCalled()
        expect(container).toBeEmptyDOMElement()
    })

    it('clearChunkReloadFlag はリロード済みフラグを消す', () => {
        sessionStorage.setItem(RELOAD_FLAG, '1')
        clearChunkReloadFlag()
        expect(sessionStorage.getItem(RELOAD_FLAG)).toBeNull()
    })
})
