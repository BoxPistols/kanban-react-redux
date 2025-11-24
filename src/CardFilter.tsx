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
          placeholder="Filter cards"
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
  gap: 12px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex: 1;
    justify-content: flex-end;
  }
`

const SearchContainer = styled.label<{ $theme: any }>`
  display: flex;
  align-items: center;
  min-width: 200px;
  border: solid 1px rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    min-width: 150px;
  }

  @media (max-width: 480px) {
    min-width: 120px;
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
  flex-wrap: wrap;
  align-items: center;

  @media (max-width: 768px) {
    display: none;
  }
`

const LabelChip = styled.button<{ $color: string; $isSelected: boolean }>`
  padding: 4px 10px;
  border-radius: 12px;
  border: 2px solid ${props => props.$isSelected ? props.$color : 'transparent'};
  background-color: ${props => props.$isSelected ? props.$color : 'rgba(255, 255, 255, 0.15)'};
  color: ${color.White};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  opacity: ${props => props.$isSelected ? 1 : 0.7};

  &:hover {
    opacity: 1;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`