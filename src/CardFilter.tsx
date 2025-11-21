import styled from 'styled-components'
import * as color from './color'
import { SearchIcon as _SearchIcon } from './icon'
import { useKanbanStore } from './store/kanbanStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'

export function CardFilter() {
  const { searchQuery, setSearchQuery } = useKanbanStore()
  const { isDarkMode } = useThemeStore()
  const theme = getTheme(isDarkMode)

  return (
    <Container $theme={theme}>
      <SearchIcon />
      <Input
        placeholder="Filter cards"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </Container>
  )
}

const Container = styled.label<{ $theme: any }>`
  display: flex;
  align-items: center;
  min-width: 300px;
  border: solid 1px rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background-color: rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    min-width: 200px;
    max-width: 200px;
  }

  @media (max-width: 480px) {
    min-width: 150px;
    max-width: 150px;
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