import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase設定の検証
function validateFirebaseConfig() {
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
    console.error(
      '⚠️  Firebase configuration error: Missing environment variables:',
      missingVars.join(', ')
    )
    console.error(
      '📝 Please create a .env.local file and set the following variables:'
    )
    console.error('   - VITE_FIREBASE_API_KEY')
    console.error('   - VITE_FIREBASE_AUTH_DOMAIN')
    console.error('   - VITE_FIREBASE_PROJECT_ID')
    console.error('   - VITE_FIREBASE_STORAGE_BUCKET')
    console.error('   - VITE_FIREBASE_MESSAGING_SENDER_ID')
    console.error('   - VITE_FIREBASE_APP_ID')
    console.error(
      '\nSee .env.example for reference or README.md for setup instructions.'
    )

    throw new Error(
      `Firebase configuration error: Missing environment variables: ${missingVars.join(', ')}`
    )
  }
}

// 環境変数の検証
validateFirebaseConfig()

// Firebase設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Firebaseアプリを初期化
export const app = initializeApp(firebaseConfig)

// Firestoreインスタンスをエクスポート
export const db = getFirestore(app)
