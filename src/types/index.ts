// カスタムレーン対応: ColumnTypeはstring型に変更
export type ColumnType = string

// デフォルトカラム定義
export const DEFAULT_COLUMNS: ColumnDefinition[] = [
    { id: 'Backlog', title: 'Backlog', order: 0 },
    { id: 'TODO', title: 'TODO', order: 1 },
    { id: 'Now', title: 'Now', order: 2 },
    { id: 'Doing', title: 'Doing', order: 3 },
    { id: 'Waiting', title: 'Waiting', order: 4 },
    { id: 'Done', title: 'Done', order: 5 },
]

export interface ColumnDefinition {
    id: string
    title: string
    order: number
    color?: string
}

export interface Label {
    id: string
    name: string
    color: string
}

export interface ChecklistItem {
    id: string
    text: string
    completed: boolean
    order: number
}

export interface UrlMetadata {
    url: string
    title?: string
    fetchedAt: number
    error?: boolean
}

// 画像データ（説明エリアの貼り付け画像用）
export interface ImageAttachment {
    id: string
    dataUrl: string
    name?: string
    createdAt: number
}

export interface Card {
    id: string
    text: string
    columnId: ColumnType
    boardId: string
    order: number
    createdAt: number
    updatedAt: number
    // Enhanced fields
    title?: string
    description?: string
    labels?: Label[]
    color?: string
    checklist?: ChecklistItem[]
    dueDate?: number | null // nullは明示的な削除を表す
    progress?: number
    urlMetadata?: UrlMetadata[] // URL メタ情報のキャッシュ
    images?: ImageAttachment[] // 貼り付け画像
}

export interface Column {
    id: ColumnType
    title: string
    order: number
}

export interface Board {
    id: string
    name: string
    description?: string
    color?: string
    labels?: Label[]
    columns?: ColumnDefinition[] // カスタムカラム定義
    createdAt: number
    updatedAt: number
}
