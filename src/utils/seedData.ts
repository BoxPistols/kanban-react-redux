import { v4 as uuidv4 } from 'uuid'
import type { Board, Card } from '../types'
import { LABEL_COLORS, BOARD_COLORS } from '../constants'

export interface SeedData {
    boards: Board[]
    cards: Card[]
}

// Seedデータ生成
export function generateSeedData(): SeedData {
    const now = Date.now()

    // サンプルボード
    const boards: Board[] = [
        {
            id: `seed-board-1-${uuidv4()}`,
            name: 'サンプルプロジェクト',
            description: 'これはサンプルボードです',
            color: BOARD_COLORS[0],
            createdAt: now,
            updatedAt: now,
            labels: [
                { id: uuidv4(), name: 'バグ', color: LABEL_COLORS[2] },
                { id: uuidv4(), name: '機能追加', color: LABEL_COLORS[1] },
                { id: uuidv4(), name: '改善', color: LABEL_COLORS[3] },
                { id: uuidv4(), name: '緊急', color: LABEL_COLORS[0] },
            ],
        },
        {
            id: `seed-board-2-${uuidv4()}`,
            name: '個人タスク',
            description: '日常のタスク管理',
            color: BOARD_COLORS[4],
            createdAt: now,
            updatedAt: now,
            labels: [
                { id: uuidv4(), name: '仕事', color: LABEL_COLORS[3] },
                { id: uuidv4(), name: '趣味', color: LABEL_COLORS[7] },
                { id: uuidv4(), name: '勉強', color: LABEL_COLORS[1] },
            ],
        },
    ]

    // サンプルカード
    const cards: Card[] = [
        // サンプルプロジェクト のカード
        {
            id: uuidv4(),
            text: 'プロジェクトの計画を立てる',
            title: 'プロジェクト計画',
            description: 'プロジェクトの全体計画を策定し、チームと共有する',
            columnId: 'TODO',
            boardId: boards[0].id,
            order: 0,
            createdAt: now - 86400000 * 3,
            updatedAt: now - 86400000 * 3,
            labels: [boards[0].labels![1]],
            checklist: [
                { id: uuidv4(), text: '要件定義', completed: true, order: 0 },
                { id: uuidv4(), text: 'スケジュール作成', completed: false, order: 1 },
                { id: uuidv4(), text: 'リソース確認', completed: false, order: 2 },
            ],
        },
        {
            id: uuidv4(),
            text: 'APIエンドポイントの実装',
            title: 'API実装',
            description: 'ユーザー認証APIとデータ取得APIを実装',
            columnId: 'Doing',
            boardId: boards[0].id,
            order: 0,
            createdAt: now - 86400000 * 2,
            updatedAt: now - 3600000,
            labels: [boards[0].labels![1]],
            dueDate: now + 86400000 * 2,
            checklist: [
                { id: uuidv4(), text: '認証API', completed: true, order: 0 },
                { id: uuidv4(), text: 'データ取得API', completed: false, order: 1 },
            ],
        },
        {
            id: uuidv4(),
            text: 'バグ修正: ログイン画面のレイアウト崩れ',
            columnId: 'TODO',
            boardId: boards[0].id,
            order: 1,
            createdAt: now - 86400000,
            updatedAt: now - 86400000,
            labels: [boards[0].labels![0], boards[0].labels![3]],
            dueDate: now + 86400000,
        },
        {
            id: uuidv4(),
            text: 'ドキュメント作成',
            title: 'API仕様書',
            description: 'RESTful API の仕様書を作成する',
            columnId: 'Waiting',
            boardId: boards[0].id,
            order: 0,
            createdAt: now - 86400000,
            updatedAt: now - 7200000,
            labels: [boards[0].labels![2]],
        },
        {
            id: uuidv4(),
            text: 'テストコードの追加',
            columnId: 'Done',
            boardId: boards[0].id,
            order: 0,
            createdAt: now - 86400000 * 5,
            updatedAt: now - 86400000 * 1,
            labels: [boards[0].labels![2]],
            checklist: [
                { id: uuidv4(), text: 'ユニットテスト', completed: true, order: 0 },
                { id: uuidv4(), text: '統合テスト', completed: true, order: 1 },
            ],
        },

        // 個人タスク のカード
        {
            id: uuidv4(),
            text: 'React の新機能を学ぶ',
            columnId: 'TODO',
            boardId: boards[1].id,
            order: 0,
            createdAt: now - 86400000 * 2,
            updatedAt: now - 86400000 * 2,
            labels: [boards[1].labels![2]],
        },
        {
            id: uuidv4(),
            text: 'ジムに行く',
            columnId: 'TODO',
            boardId: boards[1].id,
            order: 1,
            createdAt: now - 86400000,
            updatedAt: now - 86400000,
            labels: [boards[1].labels![1]],
            dueDate: now + 86400000,
        },
        {
            id: uuidv4(),
            text: 'プレゼン資料作成',
            columnId: 'Doing',
            boardId: boards[1].id,
            order: 0,
            createdAt: now - 3600000 * 5,
            updatedAt: now - 3600000,
            labels: [boards[1].labels![0]],
            dueDate: now + 86400000 * 3,
            checklist: [
                { id: uuidv4(), text: 'アウトライン作成', completed: true, order: 0 },
                { id: uuidv4(), text: 'スライド作成', completed: false, order: 1 },
                { id: uuidv4(), text: 'リハーサル', completed: false, order: 2 },
            ],
        },
    ]

    return { boards, cards }
}

// Seedデータかどうかを判定（IDに "seed-board-" が含まれる）
export function isSeedBoard(boardId: string): boolean {
    return boardId.startsWith('seed-board-')
}

// Seedデータをフィルタリング
export function filterSeedBoards(boards: Board[]): Board[] {
    return boards.filter((board) => isSeedBoard(board.id))
}

export function filterSeedCards(cards: Card[], seedBoardIds: string[]): Card[] {
    return cards.filter((card) => seedBoardIds.includes(card.boardId))
}
