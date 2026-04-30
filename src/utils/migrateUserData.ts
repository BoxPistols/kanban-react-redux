/**
 * 既存のFirestoreデータに現在のユーザーのuserIdを追加する移行関数
 *
 * 使い方:
 * 1. アプリにログイン
 * 2. ブラウザのコンソールで以下を実行:
 *    window.migrateUserData()
 */

import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuthStore } from '../store/authStore'

export async function migrateUserData() {
    if (!db) {
        console.error('❌ Firebase が有効化されていません')
        return
    }

    const user = useAuthStore.getState().user
    if (!user) {
        console.error('❌ ログインしてください')
        return
    }

    const userId = user.uid
    console.log(`🔄 移行開始: userId = ${userId}`)

    try {
        // Cards の移行
        const cardsRef = collection(db, 'cards')
        const cardsSnapshot = await getDocs(cardsRef)

        let cardsUpdated = 0
        const cardsBatch = writeBatch(db)
        let batchCount = 0

        cardsSnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data()
            if (!data.userId) {
                cardsBatch.update(doc(db!, 'cards', docSnapshot.id), {
                    userId,
                    updatedAt: Date.now(),
                })
                cardsUpdated++
                batchCount++

                // Firestoreのバッチは最大500操作まで
                if (batchCount >= 500) {
                    console.warn('⚠️ バッチサイズ制限に達しました。複数回に分けて実行してください。')
                }
            }
        })

        if (cardsUpdated > 0) {
            await cardsBatch.commit()
            console.log(`✅ Cards: ${cardsUpdated} 件更新`)
        } else {
            console.log('✅ Cards: 更新対象なし (全て userId あり)')
        }

        // Boards の移行
        const boardsRef = collection(db, 'boards')
        const boardsSnapshot = await getDocs(boardsRef)

        let boardsUpdated = 0
        const boardsBatch = writeBatch(db)
        batchCount = 0

        boardsSnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data()
            if (!data.userId) {
                boardsBatch.update(doc(db!, 'boards', docSnapshot.id), {
                    userId,
                    updatedAt: Date.now(),
                })
                boardsUpdated++
                batchCount++

                if (batchCount >= 500) {
                    console.warn('⚠️ バッチサイズ制限に達しました。複数回に分けて実行してください。')
                }
            }
        })

        if (boardsUpdated > 0) {
            await boardsBatch.commit()
            console.log(`✅ Boards: ${boardsUpdated} 件更新`)
        } else {
            console.log('✅ Boards: 更新対象なし (全て userId あり)')
        }

        console.log('\n🎉 移行完了！ページをリロードしてください。')
        console.log('合計: Cards ' + cardsUpdated + '件 + Boards ' + boardsUpdated + '件')
    } catch (error) {
        console.error('❌ 移行エラー:', error)

        // 権限エラーの可能性を示唆
        if (error instanceof Error && error.message.includes('permission')) {
            console.error(
                '\n💡 ヒント: Firestore セキュリティルールで userId なしのドキュメントへの書き込みが拒否されている可能性があります。'
            )
            console.error('一時的にルールを緩和するか、Firebase Console から手動で userId を追加してください。')
        }
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    ;(window as any).migrateUserData = migrateUserData
}
