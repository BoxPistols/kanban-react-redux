export type ColumnType = 'TODO' | 'Doing' | 'Waiting' | 'Done'

export interface Card {
  id: string
  text: string
  columnId: ColumnType
  order: number
  createdAt: number
  updatedAt: number
}

export interface Column {
  id: ColumnType
  title: string
  order: number
}
