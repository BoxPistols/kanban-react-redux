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

export interface Card {
  id: string
  text: string
  columnId: ColumnType
  order: number
  createdAt: number
  updatedAt: number
  // Enhanced fields
  title?: string
  description?: string
  labels?: Label[]
  color?: string
  checklist?: ChecklistItem[]
  dueDate?: number
  progress?: number
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
