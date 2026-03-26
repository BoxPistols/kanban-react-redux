import { initializeApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'

// Firebase設定の検証
function isFirebaseConfigured(): boolean {
    const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
    ]

    const missingVars = requiredEnvVars.filter((varName) => !import.meta.env[varName])

    if (missingVars.length > 0) {
        if (import.meta.env.DEV) {
            console.warn('Firebase not configured. Missing:', missingVars.join(', '))
        }
        return false
    }

    return true
}

// Firebase設定状態をエクスポート
export const isFirebaseEnabled = isFirebaseConfigured()

// Firebaseアプリを初期化（設定されている場合のみ）
export let app: FirebaseApp | null = null
export let db: Firestore | null = null

if (isFirebaseEnabled) {
    try {
        const firebaseConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID,
        }

        app = initializeApp(firebaseConfig)
        db = getFirestore(app)
    } catch (error) {
        console.error('Firebase initialization failed:', error)
    }
}
