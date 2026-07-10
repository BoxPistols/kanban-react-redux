import { useState, useEffect, memo, useRef, useImperativeHandle, forwardRef } from 'react'
import styled from 'styled-components'
import * as color from './color'
import { SearchIcon as _SearchIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useDebounce } from './hooks/useDebounce'

export interface CardFilterRef {
    focus: () => void
}

// ラベルチップはフィルタ(トグル)専用にする。
// 以前はチップのドラッグでボードのラベル順を書き換えており、クリックとの誤爆で
// 意図せずデータ変更が起きていた。並べ替えは BoardModal のラベル管理で行う。
export const CardFilter = memo(
    forwardRef<CardFilterRef>(function CardFilter(_props, ref) {
        const { searchQuery, selectedLabelIds, setSearchQuery, toggleLabelFilter } = useKanbanStore()
        const { boards, currentBoardId } = useBoardStore()
        const inputRef = useRef<HTMLInputElement>(null)

        // 外部からフォーカスできるようにする
        useImperativeHandle(ref, () => ({
            focus: () => {
                inputRef.current?.focus()
            },
        }))

        // ローカル入力値（即座に更新）
        const [inputValue, setInputValue] = useState(searchQuery)
        // デバウンス後の値（300ms遅延）
        const debouncedValue = useDebounce(inputValue, 300)

        // デバウンス後の値をストアに反映
        useEffect(() => {
            setSearchQuery(debouncedValue)
        }, [debouncedValue, setSearchQuery])

        // ストアの値が外部から変更された場合に同期
        useEffect(() => {
            setInputValue(searchQuery)
        }, [searchQuery])

        const currentBoard = boards.find((b) => b.id === currentBoardId)
        const labels = currentBoard?.labels || []

        return (
            <FilterContainer>
                <SearchContainer>
                    <SearchIcon />
                    <Input
                        ref={inputRef}
                        placeholder='カードを検索'
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        aria-label='カード検索'
                    />
                </SearchContainer>

                {labels.length > 0 && (
                    <LabelsContainer>
                        {labels.map((label) => {
                            const isSelected = selectedLabelIds.includes(label.id)
                            return (
                                <LabelChip
                                    key={label.id}
                                    $color={label.color}
                                    $isSelected={isSelected}
                                    onClick={() => toggleLabelFilter(label.id)}
                                    role='checkbox'
                                    aria-checked={isSelected}
                                    title={`${label.name} でフィルター`}
                                    aria-label={`${label.name} でフィルター`}
                                >
                                    {label.name}
                                </LabelChip>
                            )
                        })}
                    </LabelsContainer>
                )}
            </FilterContainer>
        )
    })
)

const FilterContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
    }
`

const SearchContainer = styled.label`
    display: flex;
    align-items: center;
    min-width: 200px;
    height: 32px;
    border: solid 1px rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    background-color: rgba(255, 255, 255, 0.1);

    /* タッチデバイスでは44px(Apple HIG)を確保 */
    @media (pointer: coarse) {
        height: 44px;
        border-radius: 6px;
    }

    @media (max-width: 768px) {
        min-width: unset;
        width: 100%;
    }
`

const SearchIcon = styled(_SearchIcon)`
    margin: 0 4px 0 8px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
`

const Input = styled.input.attrs({ type: 'search' })`
    width: 100%;
    height: 100%;
    padding: 6px 8px 6px 0;
    color: ${color.White};
    background: transparent;
    font-size: 14px;

    :focus {
        outline: none;
    }
`

const LabelsContainer = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
    align-items: center;
    overflow-x: auto;
    max-width: 400px;
    padding-bottom: 4px;

    /* スクロールバーを細くする */
    &::-webkit-scrollbar {
        height: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }

    @media (max-width: 768px) {
        width: 100%;
        max-width: 100%;
        margin-top: 8px;
        flex-wrap: wrap;
        overflow-x: visible;
        padding-bottom: 0;
    }
`

const LabelChip = styled.button<{ $color: string; $isSelected: boolean }>`
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;

    /* タッチデバイスでは44px(Apple HIG)を確保。隣接チップなので実サイズで担保する */
    @media (pointer: coarse) {
        height: 44px;
        border-radius: 8px;
    }
    border-radius: 4px;
    border: none;
    background: ${(props) => (props.$isSelected ? props.$color : 'rgba(255, 255, 255, 0.12)')};
    color: ${color.White};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    opacity: ${(props) => (props.$isSelected ? 1 : 0.6)};
    white-space: nowrap;
    flex-shrink: 0;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;

    &:hover {
        opacity: 1;
    }
`
