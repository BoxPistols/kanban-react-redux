import { create } from 'zustand'

// 直近の操作を取り消すためのUndoスタック。
// 並べ替え・レーン移動・削除など「事故りやすい操作」の逆操作を積み、
// Cmd/Ctrl+Z またはトーストの「元に戻す」から実行する。

export interface UndoEntry {
    label: string
    undo: () => void | Promise<void>
}

interface UndoState {
    entries: UndoEntry[]
    pushUndo: (entry: UndoEntry) => void
    popUndo: () => UndoEntry | null
    clear: () => void
}

// 際限なく積まないための上限
const MAX_ENTRIES = 50

export const useUndoStore = create<UndoState>((set, get) => ({
    entries: [],

    pushUndo: (entry) => {
        const next = [...get().entries, entry]
        if (next.length > MAX_ENTRIES) next.shift()
        set({ entries: next })
    },

    popUndo: () => {
        const entries = get().entries
        if (entries.length === 0) return null
        const entry = entries[entries.length - 1]
        set({ entries: entries.slice(0, -1) })
        return entry
    },

    clear: () => set({ entries: [] }),
}))

// ストア外から使うヘルパー
export function pushUndo(entry: UndoEntry): void {
    useUndoStore.getState().pushUndo(entry)
}
