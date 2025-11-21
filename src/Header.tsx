import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'
import { MoonIcon, SunIcon } from './icon'
import { useThemeStore } from './store/themeStore'

export function Header({ className }: { className?: string }) {
    const { isDarkMode, toggleDarkMode } = useThemeStore()

    return (
        <Container className={className}>
            <Logo>Kanban board</Logo>

            <BoardSelector />

            <ThemeToggle onClick={toggleDarkMode} title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
                {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </ThemeToggle>

            <Spacer />

            <CardFilter />
        </Container>
    )
}

const Spacer = styled.div`
  flex: 1;
`

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background-color: ${color.Navy};
`

const Logo = styled.div`
  color: ${color.Silver};
  font-size: 16px;
  font-weight: bold;
`

const ThemeToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12px;
  padding: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  font-size: 18px;
  border-radius: 6px;
  color: ${color.White};
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(1.1);
  }

  svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 768px) {
    font-size: 16px;
    padding: 6px;
    margin-left: 8px;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`