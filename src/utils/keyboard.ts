// OS判定
export function isMac(): boolean {
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

// 修飾キーの判定（Mac: Cmd、Win/Linux: Ctrl）
export function isModifierKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
    return isMac() ? e.metaKey : e.ctrlKey
}

// 修飾キー名の取得
export function getModifierKeyName(): string {
    return isMac() ? 'Cmd' : 'Ctrl'
}

// 修飾キーシンボルの取得（表示用）
export function getModifierKeySymbol(): string {
    return isMac() ? '⌘' : 'Ctrl'
}

// IME入力中かどうかの判定
export function isComposing(e: KeyboardEvent | React.KeyboardEvent): boolean {
    // React SyntheticEventの場合
    if ('nativeEvent' in e && e.nativeEvent) {
        return (e.nativeEvent as KeyboardEvent).isComposing || false
    }
    // ネイティブEventの場合
    return (e as KeyboardEvent).isComposing || false
}

// フォーカス中の要素が入力欄かどうかの判定
export function isInputElement(element: Element | null): boolean {
    if (!element) return false
    const tagName = element.tagName.toLowerCase()
    return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        element.getAttribute('contenteditable') === 'true'
    )
}

// ショートカットキーのチェック（Cmd+K / Ctrl+K など）
export function isShortcutKey(
    e: KeyboardEvent | React.KeyboardEvent,
    key: string,
    options?: {
        requireModifier?: boolean
        requireShift?: boolean
        requireAlt?: boolean
    }
): boolean {
    const { requireModifier = true, requireShift = false, requireAlt = false } = options || {}

    // IME入力中は無効
    if (isComposing(e)) return false

    // 入力欄にフォーカス中は無効（一部のショートカットを除く）
    const activeElement = document.activeElement
    if (isInputElement(activeElement)) {
        // 入力欄内でもEnterは許可する場合がある
        if (key === 'Enter') {
            // Cmd+Enter / Ctrl+Enter はSubmitとして許可
            return isModifierKey(e) && e.key === key
        }
        return false
    }

    // キーの一致をチェック
    if (e.key !== key) return false

    // 修飾キーのチェック
    if (requireModifier && !isModifierKey(e)) return false
    if (!requireModifier && isModifierKey(e)) return false

    // Shiftキーのチェック
    if (requireShift && !e.shiftKey) return false
    if (!requireShift && e.shiftKey) return false

    // Altキーのチェック
    if (requireAlt && !e.altKey) return false

    return true
}
