import { ONE_DAY_MS } from '../constants'

/**
 * Check if a due date is coming soon (within 24 hours)
 */
export function isDueSoon(dueDate: number | null | undefined): boolean {
  if (!dueDate) return false
  return dueDate < Date.now() + ONE_DAY_MS && dueDate >= Date.now()
}

/**
 * Check if a due date is overdue
 */
export function isOverdue(dueDate: number | null | undefined): boolean {
  if (!dueDate) return false
  return dueDate < Date.now()
}

/**
 * Get due date status
 */
export function getDueDateStatus(dueDate: number | null | undefined): {
  isDueSoon: boolean
  isOverdue: boolean
} {
  return {
    isDueSoon: isDueSoon(dueDate),
    isOverdue: isOverdue(dueDate)
  }
}
