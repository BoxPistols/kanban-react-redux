import styled from 'styled-components'
import * as color from './color'
import { CardFilter } from './CardFilter'
import { BoardSelector } from './BoardSelector'

export function Header({ className }: { className?: string }) {
    return (
        <Container className={className}>
            <Logo>Kanban board</Logo>

            <BoardSelector />

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