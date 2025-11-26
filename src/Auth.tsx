import { useState } from 'react'
import styled from 'styled-components'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signUp, signIn, error, isLoading } = useAuthStore()
  const isDarkMode = useThemeStore(state => state.isDarkMode)
  const theme = getTheme(isDarkMode)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      return
    }

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      // Error handled by store
    }
  }

  return (
    <Container $theme={theme}>
      <FormCard $theme={theme}>
        <Title $theme={theme}>Kanban Board</Title>
        <Subtitle $theme={theme}>
          {isSignUp ? 'アカウントを作成' : 'ログイン'}
        </Subtitle>

        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label $theme={theme}>メールアドレス</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mail@example.com"
              required
              $theme={theme}
            />
          </InputGroup>

          <InputGroup>
            <Label $theme={theme}>パスワード</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              required
              minLength={6}
              $theme={theme}
            />
          </InputGroup>

          {error && <ErrorMessage $theme={theme}>{error}</ErrorMessage>}

          <SubmitButton type="submit" disabled={isLoading} $theme={theme}>
            {isLoading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
          </SubmitButton>
        </Form>

        <ToggleText $theme={theme}>
          {isSignUp ? 'アカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
          <ToggleButton onClick={() => setIsSignUp(!isSignUp)} $theme={theme}>
            {isSignUp ? 'ログイン' : 'アカウント作成'}
          </ToggleButton>
        </ToggleText>
      </FormCard>
    </Container>
  )
}

const Container = styled.div<{ $theme: any }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${props => props.$theme.background};
`

const FormCard = styled.div<{ $theme: any }>`
  background-color: ${props => props.$theme.surface};
  border-radius: 8px;
  box-shadow: 0 2px 8px ${props => props.$theme.shadow};
  padding: 40px;
  width: 100%;
  max-width: 400px;
  margin: 20px;
`

const Title = styled.h1<{ $theme: any }>`
  color: ${props => props.$theme.text};
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-align: center;
`

const Subtitle = styled.h2<{ $theme: any }>`
  color: ${props => props.$theme.textSecondary};
  font-size: 16px;
  font-weight: 400;
  margin: 0 0 32px 0;
  text-align: center;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Label = styled.label<{ $theme: any }>`
  color: ${props => props.$theme.text};
  font-size: 14px;
  font-weight: 500;
`

const Input = styled.input<{ $theme: any }>`
  background-color: ${props => props.$theme.inputBackground};
  border: 1px solid ${props => props.$theme.inputBorder};
  border-radius: 4px;
  color: ${props => props.$theme.text};
  font-size: 14px;
  padding: 10px 12px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #0079BF;
  }

  &::placeholder {
    color: ${props => props.$theme.textSecondary};
  }
`

const ErrorMessage = styled.div<{ $theme: any }>`
  background-color: #FFEBE9;
  border: 1px solid #FF5630;
  border-radius: 4px;
  color: #BF2600;
  padding: 12px;
  font-size: 14px;
`

const SubmitButton = styled.button<{ $theme: any }>`
  background-color: #0079BF;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  padding: 12px;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #026AA7;
  }

  &:disabled {
    background-color: ${props => props.$theme.border};
    cursor: not-allowed;
  }
`

const ToggleText = styled.p<{ $theme: any }>`
  color: ${props => props.$theme.textSecondary};
  font-size: 14px;
  margin: 24px 0 0 0;
  text-align: center;
`

const ToggleButton = styled.button<{ $theme: any }>`
  background: none;
  border: none;
  color: #0079BF;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  margin-left: 4px;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: #026AA7;
  }
`
