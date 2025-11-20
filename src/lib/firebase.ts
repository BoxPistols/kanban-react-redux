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
    'VITE_FIREBASE_APP_ID'
  ]

  const missingVars = requiredEnvVars.filter(
    varName => !import.meta.env[varName]
  )

  if (missingVars.length > 0) {
    console.warn(
      '⚠️  Firebase not configured. Missing environment variables:',
      missingVars.join(', ')
    )
    console.warn(
      '📝 App will run in offline mode using localStorage.'
    )
    console.warn(
      '   To enable Firebase, set the following variables in .env.local:'
    )
    console.warn('   - VITE_FIREBASE_API_KEY')
    console.warn('   - VITE_FIREBASE_AUTH_DOMAIN')
    console.warn('   - VITE_FIREBASE_PROJECT_ID')
    console.warn('   - VITE_FIREBASE_STORAGE_BUCKET')
    console.warn('   - VITE_FIREBASE_MESSAGING_SENDER_ID')
    console.warn('   - VITE_FIREBASE_APP_ID')
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
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    }

    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    console.log('✅ Firebase initialized successfully')
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error)
    console.warn('📝 Falling back to localStorage mode')
  }
} else {
  console.log('📦 Running in offline mode with localStorage')
}
