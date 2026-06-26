import { useState, useEffect, memo, useRef, useImperativeHandle, forwardRef } from 'react'
import styled from 'styled-components'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as color from './color'
import { SearchIcon as _SearchIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme, Theme } from './theme'
import { useDebounce } from './hooks/useDebounce'
import type { Label } from './types'

// Sortable Label Chip Component
interface SortableLabelChipProps {
    label: Label
    isSelected: boolean
    toggleLabelFilter: (labelId: string) => void
}

function SortableLabelChip({ label, isSelected, toggleLabelFilter }: SortableLabelChipProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: label.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <LabelChip
            ref={setNodeRef}
            style={style}
            $color={label.color}
            $isSelected={isSelected}
            onClick={() => toggleLabelFilter(label.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleLabelFilter(label.id)
                }
            }}
            {...attributes}
            {...listeners}
            role='checkbox'
            aria-checked={isSelected}
            title={`${label.name} でフィルター`}
            aria-label={`${label.name} でフィルター`}
        >
            {label.name}
        </LabelChip>
    )
}

export interface CardFilterRef {
    focus: () => void
}

export const CardFilter = memo(
    forwardRef<CardFilterRef>(function CardFilter(_props, ref) {
        const { searchQuery, selectedLabelIds, setSearchQuery, toggleLabelFilter } = useKanbanStore()
        const { boards, currentBoardId, updateBoard } = useBoardStore()
        const { isDarkMode } = useThemeStore()
        const theme = getTheme(isDarkMode)
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

        const handleDragEnd = async (event: DragEndEvent) => {
            const { active, over } = event
            if (!over || !currentBoardId || !currentBoard?.labels || active.id === over.id) return

            const oldIndex = currentBoard.labels.findIndex((l) => l.id === active.id)
            const newIndex = currentBoard.labels.findIndex((l) => l.id === over.id)

            if (oldIndex === -1 || newIndex === -1) return

            // 配列を並び替える
            const reorderedLabels = [...currentBoard.labels]
            const [movedLabel] = reorderedLabels.splice(oldIndex, 1)
            reorderedLabels.splice(newIndex, 0, movedLabel)

            await updateBoard(currentBoardId, { labels: reorderedLabels })
        }

        const sensors = useSensors(
            useSensor(PointerSensor, {
                activationConstraint: {
                    distance: 5, // 5px移動するまでドラッグ開始しない
                },
            })
        )

        return (
            <FilterContainer>
                <SearchContainer $theme={theme}>
                    <SearchIcon />
                    <Input
                        ref={inputRef}
                        placeholder='Filter cards'
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        aria-label='カード検索'
                    />
                </SearchContainer>

                {labels.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={labels.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
                            <LabelsContainer>
                                {labels.map((label) => {
                                    const isSelected = selectedLabelIds.includes(label.id)
                                    return (
                                        <SortableLabelChip
                                            key={label.id}
                                            label={label}
                                            isSelected={isSelected}
                                            toggleLabelFilter={toggleLabelFilter}
                                        />
                                    )
                                })}
                            </LabelsContainer>
                        </SortableContext>
                    </DndContext>
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

const SearchContainer = styled.label<{ $theme: Theme }>`
    display: flex;
    align-items: center;
    min-width: 200px;
    height: 32px;
    border: solid 1px rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    background-color: rgba(255, 255, 255, 0.1);

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
    border-radius: 4px;
    border: none;
    background: ${(props) => (props.$isSelected ? props.$color : 'rgba(255, 255, 255, 0.12)')};
    color: ${color.White};
    font-size: 12px;
    font-weight: 500;
    cursor: move;
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

    &:active {
        cursor: grabbing;
    }
`
