import { Component, ReactNode } from 'react'

/**
 * Local boundary for lazy-loaded (`React.lazy` / dynamic `import()`) chunks.
 *
 * A dynamic import can reject with a ChunkLoadError — e.g. after a deploy the
 * old content-hashed chunk file is gone from the server. Without a *local*
 * boundary that rejection bubbles to the single top-level <ErrorBoundary> and
 * replaces the entire app with the error screen. Here we instead reload ONCE to
 * fetch the current build; if that still fails we render nothing (the parent
 * stays usable) rather than crashing the whole app.
 */
const RELOAD_FLAG = 'kanban-chunk-reload-attempted'

function isChunkLoadError(error: unknown): boolean {
    const msg = (error instanceof Error ? error.message : String(error)) || ''
    return /Loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(
        msg
    )
}

interface State {
    failed: boolean
}

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { failed: false }

    static getDerivedStateFromError(): State {
        return { failed: true }
    }

    componentDidCatch(error: Error): void {
        if (isChunkLoadError(error)) {
            // Reload once to pick up the current build's chunks. Guard against a
            // reload loop if reloading doesn't resolve it.
            try {
                if (!sessionStorage.getItem(RELOAD_FLAG)) {
                    sessionStorage.setItem(RELOAD_FLAG, '1')
                    window.location.reload()
                }
            } catch {
                window.location.reload()
            }
        }
    }

    render(): ReactNode {
        if (this.state.failed) return null
        return this.props.children
    }
}

/** Call after the app has successfully rendered so a future deploy can reload again. */
export function clearChunkReloadFlag(): void {
    try {
        sessionStorage.removeItem(RELOAD_FLAG)
    } catch {
        /* ignore */
    }
}
