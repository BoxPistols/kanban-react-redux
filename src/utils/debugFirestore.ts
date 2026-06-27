// Firestore接続とデータのデバッグユーティリティ
// ブラウザのコンソールで window.debugFirestore() を実行

import { db, isFirebaseEnabled } from '../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useAuthStore } from '../store/authStore'

export async function debugFirestore() {
    console.group('🔍 Firestore Debug Information')

    // 1. Firebase有効化状態
    console.log('📋 Firebase Enabled:', isFirebaseEnabled)
    console.log('📋 DB Instance:', db ? '✓ 初期化済み' : '✗ 未初期化')

    // 2. 認証状態
    const authState = useAuthStore.getState()
    console.log('👤 User:', authState.user)
    console.log('👤 User ID:', authState.user?.uid)
    console.log('👤 Email:', authState.user?.email)

    if (!db || !isFirebaseEnabled) {
        console.error('❌ Firebaseが初期化されていません')
        console.groupEnd()
        return
    }

    // 3. 全カード取得（管理者用）
    try {
        console.log('\n📊 全カードデータ:')
        const allCardsSnapshot = await getDocs(collection(db, 'cards'))
        console.log(`  総カード数: ${allCardsSnapshot.size}`)

        allCardsSnapshot.forEach((doc) => {
            const data = doc.data()
            console.log(`  - ${doc.id}:`, {
                text: data.text?.substring(0, 30),
                userId: data.userId,
                boardId: data.boardId,
                columnId: data.columnId,
            })
        })
    } catch (error) {
        console.error('❌ 全カード取得エラー:', error)
    }

    // 4. ユーザーのカード取得
    if (authState.user?.uid) {
        try {
            console.log('\n📊 現在のユーザーのカード:')
            const userCardsQuery = query(collection(db, 'cards'), where('userId', '==', authState.user.uid))
            const userCardsSnapshot = await getDocs(userCardsQuery)
            console.log(`  ユーザーのカード数: ${userCardsSnapshot.size}`)

            userCardsSnapshot.forEach((doc) => {
                const data = doc.data()
                console.log(`  - ${doc.id}:`, {
                    text: data.text,
                    boardId: data.boardId,
                    columnId: data.columnId,
                })
            })

            if (userCardsSnapshot.size === 0) {
                console.warn('⚠️ このユーザーにはカードがありません')
                console.log('💡 新しいカードを作成するか、既存のカードにuserIdを設定してください')
            }
        } catch (error) {
            console.error('❌ ユーザーカード取得エラー:', error)
        }
    }

    // 5. 接続テスト
    console.log('\n🌐 Firestore接続テスト:')
    try {
        await fetch('https://firestore.googleapis.com/robots.txt', {
            method: 'GET',
            mode: 'no-cors',
        })
        console.log('✓ Firestore接続成功')
    } catch (error) {
        console.error('✗ Firestore接続失敗:', error)
        console.log('💡 広告ブロッカーを無効にしてください')
    }

    console.groupEnd()
}

// グローバルに登録（開発時のみ。本番では全カードをダンプし得るため公開しない: 監査C8）
if (typeof window !== 'undefined' && import.meta.env.DEV) {
    ;(window as { debugFirestore?: () => Promise<void> }).debugFirestore = debugFirestore
}
