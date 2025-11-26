import { useState } from 'react'
import styled from 'styled-components'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { getTheme } from './theme'

interface AuthProps {
  onSkipAuth?: () => void
}

export function Auth({ onSkipAuth }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signUp, signIn, signInWithGoogle, error, isLoading } = useAuthStore()
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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
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

        <Divider $theme={theme}>
          <DividerLine $theme={theme} />
          <DividerText $theme={theme}>または</DividerText>
          <DividerLine $theme={theme} />
        </Divider>

        <GoogleButton onClick={handleGoogleSignIn} disabled={isLoading} $theme={theme}>
          <GoogleIcon>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </GoogleIcon>
          Googleでログイン
        </GoogleButton>

        <ToggleText $theme={theme}>
          {isSignUp ? 'アカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
          <ToggleButton onClick={() => setIsSignUp(!isSignUp)} $theme={theme}>
            {isSignUp ? 'ログイン' : 'アカウント作成'}
          </ToggleButton>
        </ToggleText>

        {onSkipAuth && (
          <OfflineButton onClick={onSkipAuth} $theme={theme}>
            ログインせずにオフラインで使用
          </OfflineButton>
        )}
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

const Divider = styled.div<{ $theme: any }>`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
`

const DividerLine = styled.div<{ $theme: any }>`
  flex: 1;
  height: 1px;
  background-color: ${props => props.$theme.border};
`

const DividerText = styled.span<{ $theme: any }>`
  color: ${props => props.$theme.textSecondary};
  font-size: 14px;
`

const GoogleButton = styled.button<{ $theme: any }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background-color: ${props => props.$theme.surface};
  color: ${props => props.$theme.text};
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: ${props => props.$theme.surfaceHover};
    border-color: ${props => props.$theme.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const GoogleIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
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

const OfflineButton = styled.button<{ $theme: any }>`
  margin-top: 16px;
  padding: 10px;
  border: 1px solid ${props => props.$theme.border};
  border-radius: 4px;
  background: transparent;
  color: ${props => props.$theme.textSecondary};
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background: ${props => props.$theme.surfaceHover};
    color: ${props => props.$theme.text};
  }
`
