import { create } from 'zustand'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    User,
} from 'firebase/auth'
import { getAuth } from 'firebase/auth'
import { app, isFirebaseEnabled } from '../lib/firebase'

// Firebase AuthError の型ガード
function getErrorCode(error: unknown): string | undefined {
    if (error instanceof Error && 'code' in error) {
        return (error as { code: string }).code
    }
    return undefined
}

interface AuthState {
    user: User | null
    isLoading: boolean
    error: string | null
    isInitialized: boolean

    // Actions
    signUp: (email: string, password: string) => Promise<void>
    signIn: (email: string, password: string) => Promise<void>
    signInWithGoogle: () => Promise<void>
    resetPassword: (email: string) => Promise<void>
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
        } catch (error: unknown) {
            let errorMessage = 'アカウント作成に失敗しました'
            const code = getErrorCode(error)

            if (code === 'auth/email-already-in-use') {
                errorMessage = 'このメールアドレスは既に使用されています'
            } else if (code === 'auth/weak-password') {
                errorMessage = 'パスワードは6文字以上である必要があります'
            } else if (code === 'auth/invalid-email') {
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
        } catch (error: unknown) {
            let errorMessage = 'ログインに失敗しました'
            const code = getErrorCode(error)

            if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
                errorMessage = 'メールアドレスまたはパスワードが正しくありません'
            } else if (code === 'auth/invalid-email') {
                errorMessage = 'メールアドレスの形式が正しくありません'
            } else if (code === 'auth/too-many-requests') {
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
            // Use redirect instead of popup to avoid CORS issues
            await signInWithRedirect(auth, provider)
            // User will be set by onAuthStateChanged listener after redirect
        } catch (error: unknown) {
            const errorMessage = 'Googleログインに失敗しました'
            set({ error: errorMessage, isLoading: false })
            throw error
        }
    },

    resetPassword: async (email: string) => {
        if (!isFirebaseEnabled || !app) {
            set({ error: 'Firebase is not configured. Authentication is not available.' })
            return
        }

        try {
            set({ isLoading: true, error: null })
            const auth = getAuth(app)
            await sendPasswordResetEmail(auth, email)
            set({ isLoading: false })
        } catch (error: unknown) {
            let errorMessage = 'パスワードリセットメールの送信に失敗しました'
            const code = getErrorCode(error)

            if (code === 'auth/user-not-found') {
                errorMessage = 'このメールアドレスは登録されていません'
            } else if (code === 'auth/invalid-email') {
                errorMessage = 'メールアドレスの形式が正しくありません'
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
            set({ error: 'ログアウトに失敗しました', isLoading: false })
        }
    },

    initAuth: () => {
        if (!isFirebaseEnabled || !app) {
            // Firebase未設定のため認証スキップ
            set({ isInitialized: true })
            return
        }

        const auth = getAuth(app)

        // Handle redirect result from Google Sign-In
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    // Successfully signed in via redirect
                    set({ isLoading: false })
                }
            })
            .catch((error) => {
                let errorMessage = 'ログインに失敗しました'
                const code = getErrorCode(error)

                if (code === 'auth/account-exists-with-different-credential') {
                    errorMessage = '別の方法で既に登録されているアカウントです'
                }

                set({ error: errorMessage, isLoading: false })
            })

        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            set({ user, isInitialized: true, isLoading: false })
        })
    },
}))

// Export helper to check auth state in console（開発時のみ。本番では Firebase User
// (uid/email/トークン)を露出させないため import.meta.env.DEV で畳む: 監査/C8 と同方針）
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    interface ExtendedWindow extends Window {
        checkAuth?: () => User | null
    }
    ;(window as ExtendedWindow).checkAuth = () => {
        const state = useAuthStore.getState()
        return state.user
    }
}
