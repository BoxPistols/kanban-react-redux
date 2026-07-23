// Firestore 購読エラーを利用者向けメッセージに分類する。
//
// 従来は「Failed to fetch / network」を含むだけで一律「広告ブロッカーが原因」と
// 断定表示していたため、単なる一時的な通信断やオフラインでも誤って
// ブロッカー警告が出ていた。ここで次の3種を区別する:
//   - 権限エラー: ブロックではないので専用文言
//   - オフライン: 広告ブロッカーではなく通信断。穏当な文言(ERR_OFFLINE)
//   - オンラインなのに Firestore にだけ到達できない: 拡張機能/プライバシー保護に
//     よる遮断が濃厚なので ERR_BLOCKED（ただし断定はせず「可能性」表現）
//
// 返り値の先頭プレフィックス(ERR_BLOCKED / ERR_OFFLINE)を BlockerWarning が見て
// 表示バリアントを切り替える。

export type FirestoreErrorKind = 'permission' | 'offline' | 'blocked'

export function classifyFirestoreErrorKind(error: unknown, online: boolean): FirestoreErrorKind {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : ''
    if (code === 'permission-denied') {
        return 'permission'
    }
    // 端末がオフラインなら「遮断」ではなく通信断として扱う
    if (!online) {
        return 'offline'
    }
    // オンラインなのに Firestore にだけ到達できない = 遮断の可能性が高い
    return 'blocked'
}

export function classifyFirestoreError(error: unknown, online: boolean): string {
    switch (classifyFirestoreErrorKind(error, online)) {
        case 'permission':
            return 'Firestoreへのアクセス権限がありません'
        case 'offline':
            return 'ERR_OFFLINE: オフラインのためローカルデータで表示しています'
        case 'blocked':
        default:
            return 'ERR_BLOCKED: Firestoreへの接続がブロックされている可能性があります'
    }
}
