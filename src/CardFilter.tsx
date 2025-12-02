import styled from 'styled-components'
import * as color from './color'
import { SearchIcon as _SearchIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useBoardStore } from './store/boardStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'

export function CardFilter() {
  const { searchQuery, selectedLabelIds, setSearchQuery, toggleLabelFilter } = useKanbanStore()
  const { boards, currentBoardId } = useBoardStore()
  const { isDarkMode } = useThemeStore()
  const theme = getTheme(isDarkMode)

  const currentBoard = boards.find(b => b.id === currentBoardId)
  const labels = currentBoard?.labels || []

  return (
    <FilterContainer>
      <SearchContainer $theme={theme}>
        <SearchIcon />
        <Input
          placeholder="Filter"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      {labels.length > 0 && (
        <LabelsContainer>
          {labels.map(label => (
            <LabelChip
              key={label.id}
              $color={label.color}
              $isSelected={selectedLabelIds.includes(label.id)}
              onClick={() => toggleLabelFilter(label.id)}
              title={`Filter by ${label.name}`}
            >
              {label.name}
            </LabelChip>
          ))}
        </LabelsContainer>
      )}
    </FilterContainer>
  )
}

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`

const SearchContainer = styled.label<{ $theme: any }>`
  display: flex;
  align-items: center;
  min-width: 100px;
  max-width: 140px;
  border: solid 1px rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`

const SearchIcon = styled(_SearchIcon)`
  margin: 0 4px 0 6px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
`

const Input = styled.input.attrs({ type: 'search' })`
  width: 100%;
  padding: 5px 6px 5px 0;
  color: ${color.White};
  background: transparent;
  font-size: 12px;

  :focus {
    outline: none;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`

const LabelsContainer = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
`

const LabelChip = styled.button<{ $color: string; $isSelected: boolean }>`
  padding: 3px 8px;
  border-radius: 10px;
  border: 2px solid ${props => props.$isSelected ? props.$color : 'transparent'};
  background-color: ${props => props.$isSelected ? props.$color : 'rgba(255, 255, 255, 0.15)'};
  color: ${color.White};
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  opacity: ${props => props.$isSelected ? 1 : 0.7};
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }

  &:active {
    transform: scale(0.95);
  }
`
