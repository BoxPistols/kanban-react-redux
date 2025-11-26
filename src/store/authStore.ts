import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { app, isFirebaseEnabled } from '../lib/firebase'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Actions
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logOut: () => Promise<void>
  initAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  signUp: async (email: string, password: string) => {
    if (!isFirebaseEnabled || !app) {
      set({ error: 'Firebase is not configured. Authentication is not available.' })
      return
    }

    try {
      set({ isLoading: true, error: null })
      const auth = getAuth(app)
      await createUserWithEmailAndPassword(auth, email, password)
      // User will be set by onAuthStateChanged listener
      set({ isLoading: false })
    } catch (error: any) {
      console.error('Error signing up:', error)
      let errorMessage = 'アカウント作成に失敗しました'

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードは6文字以上である必要があります'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません'
      }

      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  signIn: async (email: string, password: string) => {
    if (!isFirebaseEnabled || !app) {
      set({ error: 'Firebase is not configured. Authentication is not available.' })
      return
    }

    try {
      set({ isLoading: true, error: null })
      const auth = getAuth(app)
      await signInWithEmailAndPassword(auth, email, password)
      // User will be set by onAuthStateChanged listener
      set({ isLoading: false })
    } catch (error: any) {
      console.error('Error signing in:', error)
      let errorMessage = 'ログインに失敗しました'

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません'
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'ログイン試行回数が多すぎます。しばらくしてからもう一度お試しください'
      }

      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  signInWithGoogle: async () => {
    if (!isFirebaseEnabled || !app) {
      set({ error: 'Firebase is not configured. Authentication is not available.' })
      return
    }

    try {
      set({ isLoading: true, error: null })
      const auth = getAuth(app)
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      // User will be set by onAuthStateChanged listener
      set({ isLoading: false })
    } catch (error: any) {
      console.error('Error signing in with Google:', error)
      let errorMessage = 'Googleログインに失敗しました'

      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'ログインがキャンセルされました'
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'ポップアップがブロックされました。ブラウザの設定を確認してください'
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignore - user opened multiple popups
        set({ isLoading: false })
        return
      }

      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  logOut: async () => {
    if (!isFirebaseEnabled || !app) {
      return
    }

    try {
      set({ isLoading: true, error: null })
      const auth = getAuth(app)
      await signOut(auth)
      set({ user: null, isLoading: false })
    } catch (error) {
      console.error('Error signing out:', error)
      set({ error: 'ログアウトに失敗しました', isLoading: false })
    }
  },

  initAuth: () => {
    if (!isFirebaseEnabled || !app) {
      console.log('🔓 Firebase not configured, skipping authentication')
      set({ isInitialized: true })
      return
    }

    const auth = getAuth(app)

    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      console.log('🔐 Auth state changed:', user ? `User: ${user.email}` : 'No user')
      set({ user, isInitialized: true, isLoading: false })
    })
  }
}))
