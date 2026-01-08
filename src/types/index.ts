export type ColumnType = 'TODO' | 'Doing' | 'Waiting' | 'Done'

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
  dueDate?: number | null  // nullは明示的な削除を表す
  progress?: number
  urlMetadata?: UrlMetadata[]  // URL メタ情報のキャッシュ
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
  createdAt: number
  updatedAt: number
}
