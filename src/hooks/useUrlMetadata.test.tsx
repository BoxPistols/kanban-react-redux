import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUrlMetadata } from './useUrlMetadata'

describe('useUrlMetadata', () => {
    it('existingMetadata 省略時に無限ループしない（複数回 re-render しても安定）', () => {
        // 既定引数 `= []` が不安定だと、再レンダリングのたびに setMetadata が走り
        // "Maximum update depth exceeded" を投げる。安定参照ならここで例外は出ない。
        const { result, rerender } = renderHook(({ text }) => useUrlMetadata(text), {
            initialProps: { text: 'リンクを含まないテキスト' },
        })
        expect(result.current.metadata).toEqual([])
        rerender({ text: 'リンクを含まないテキスト' })
        rerender({ text: 'まだリンクは無い' })
        expect(result.current.metadata).toEqual([])
    })

    it('existingMetadata 省略時は metadata の参照が再レンダリング間で安定する', () => {
        const { result, rerender } = renderHook(() => useUrlMetadata('plain text'))
        const first = result.current.metadata
        rerender()
        // 参照が据え置かれていること（不安定だと毎回新しい配列になる）
        expect(result.current.metadata).toBe(first)
    })
})
