import { create } from 'zustand'

// トースト通知のグローバルストア。
// 操作の成否・Undo をユーザーに伝える基盤(UX改善: 無言の失敗をなくす)。

export type ToastType = 'info' | 'success' | 'error'

export interface Toast {
    id: number
    message: string
    type: ToastType
    // Undo などのアクションボタン(任意)
    action?: {
        label: string
        onAction: () => void
    }
}

interface ToastState {
    toasts: Toast[]
    showToast: (message: string, type?: ToastType, action?: Toast['action']) => void
    dismissToast: (id: number) => void
}

let nextToastId = 1

const AUTO_DISMISS_MS = 5000

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    showToast: (message, type = 'info', action) => {
        const id = nextToastId++
        set({ toasts: [...get().toasts, { id, message, type, action }] })
        // 一定時間で自動的に消す
        setTimeout(() => {
            get().dismissToast(id)
        }, AUTO_DISMISS_MS)
    },

    dismissToast: (id) => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) })
    },
}))

// ストア外(zustand ストアのアクション内など)からも呼べるヘルパー
export function showToast(message: string, type: ToastType = 'info', action?: Toast['action']): void {
    useToastStore.getState().showToast(message, type, action)
}
