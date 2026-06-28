// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { isComposing, isInputElement, isModifierKey, isShortcutKey } from './keyboard'

// --- Test helpers -----------------------------------------------------------

type EventProps = {
    key: string
    metaKey?: boolean
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    isComposing?: boolean
}

// Builds a React.KeyboardEvent-like object (has `nativeEvent`, matching the
// SyntheticEvent branch the source checks via `'nativeEvent' in e`).
function makeReactEvent(p: EventProps): ReactKeyboardEvent {
    const nativeEvent = { isComposing: p.isComposing ?? false } as unknown as KeyboardEvent
    return {
        key: p.key,
        metaKey: p.metaKey ?? false,
        ctrlKey: p.ctrlKey ?? false,
        shiftKey: p.shiftKey ?? false,
        altKey: p.altKey ?? false,
        nativeEvent,
    } as unknown as ReactKeyboardEvent
}

// Builds a native KeyboardEvent-like object (NO `nativeEvent` property, so the
// source falls through to the native branch reading `e.isComposing`).
function makeNativeEvent(p: { key?: string; isComposing?: boolean }): KeyboardEvent {
    return {
        key: p.key ?? 'a',
        isComposing: p.isComposing ?? false,
    } as unknown as KeyboardEvent
}

const originalPlatform = window.navigator.platform

function setPlatform(platform: string): void {
    Object.defineProperty(window.navigator, 'platform', {
        configurable: true,
        value: platform,
    })
}

describe('keyboard utils', () => {
    afterEach(() => {
        // Restore platform and clear any focused/appended elements between tests.
        setPlatform(originalPlatform)
        document.body.replaceChildren()
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    })

    describe('isComposing', () => {
        it('returns true when React nativeEvent.isComposing is true', () => {
            expect(isComposing(makeReactEvent({ key: 'a', isComposing: true }))).toBe(true)
        })

        it('returns false when React nativeEvent.isComposing is false', () => {
            expect(isComposing(makeReactEvent({ key: 'a', isComposing: false }))).toBe(false)
        })

        it('returns true for a native event with isComposing true', () => {
            expect(isComposing(makeNativeEvent({ isComposing: true }))).toBe(true)
        })

        it('returns false for a native event with isComposing false', () => {
            expect(isComposing(makeNativeEvent({ isComposing: false }))).toBe(false)
        })
    })

    describe('isInputElement', () => {
        it('returns false for null', () => {
            expect(isInputElement(null)).toBe(false)
        })

        it('returns true for input', () => {
            expect(isInputElement(document.createElement('input'))).toBe(true)
        })

        it('returns true for textarea', () => {
            expect(isInputElement(document.createElement('textarea'))).toBe(true)
        })

        it('returns true for select', () => {
            expect(isInputElement(document.createElement('select'))).toBe(true)
        })

        it('returns true for a contenteditable element', () => {
            const div = document.createElement('div')
            div.setAttribute('contenteditable', 'true')
            expect(isInputElement(div)).toBe(true)
        })

        it('returns false for a plain div', () => {
            expect(isInputElement(document.createElement('div'))).toBe(false)
        })

        it('returns false for a div with contenteditable="false"', () => {
            const div = document.createElement('div')
            div.setAttribute('contenteditable', 'false')
            expect(isInputElement(div)).toBe(false)
        })
    })

    describe('isModifierKey', () => {
        it('reads metaKey on Mac', () => {
            setPlatform('MacIntel')
            expect(isModifierKey(makeReactEvent({ key: 'k', metaKey: true }))).toBe(true)
            expect(isModifierKey(makeReactEvent({ key: 'k', ctrlKey: true }))).toBe(false)
        })

        it('reads ctrlKey on non-Mac', () => {
            setPlatform('Win32')
            expect(isModifierKey(makeReactEvent({ key: 'k', ctrlKey: true }))).toBe(true)
            expect(isModifierKey(makeReactEvent({ key: 'k', metaKey: true }))).toBe(false)
        })
    })

    describe('isShortcutKey', () => {
        it('matches Cmd+K on Mac', () => {
            setPlatform('MacIntel')
            expect(isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k')).toBe(true)
        })

        it('does not match Cmd+K on non-Mac (metaKey ignored)', () => {
            setPlatform('Win32')
            expect(isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k')).toBe(false)
        })

        it('matches Ctrl+K on non-Mac', () => {
            setPlatform('Win32')
            expect(isShortcutKey(makeReactEvent({ key: 'k', ctrlKey: true }), 'k')).toBe(true)
        })

        it('does not match Ctrl+K on Mac (ctrlKey ignored)', () => {
            setPlatform('MacIntel')
            expect(isShortcutKey(makeReactEvent({ key: 'k', ctrlKey: true }), 'k')).toBe(false)
        })

        it('returns false while IME composing even with the right modifier', () => {
            setPlatform('MacIntel')
            expect(isShortcutKey(makeReactEvent({ key: 'k', metaKey: true, isComposing: true }), 'k')).toBe(false)
        })

        describe('when an input element is focused', () => {
            let input: HTMLInputElement

            beforeEach(() => {
                setPlatform('MacIntel')
                input = document.createElement('input')
                document.body.appendChild(input)
                input.focus()
            })

            it('confirms the input is the active element', () => {
                expect(document.activeElement).toBe(input)
            })

            it('blocks a plain "k" shortcut', () => {
                // Focus on an input short-circuits non-Enter keys to false,
                // even when the modifier is held.
                expect(isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k')).toBe(false)
            })

            it('still allows modifier+Enter (submit) while focused', () => {
                expect(isShortcutKey(makeReactEvent({ key: 'Enter', metaKey: true }), 'Enter')).toBe(true)
            })

            it('blocks plain Enter (no modifier) while focused', () => {
                expect(isShortcutKey(makeReactEvent({ key: 'Enter' }), 'Enter')).toBe(false)
            })
        })

        it('returns false when the key does not match', () => {
            setPlatform('MacIntel')
            expect(isShortcutKey(makeReactEvent({ key: 'j', metaKey: true }), 'k')).toBe(false)
        })

        describe('requireModifier option', () => {
            it('requireModifier:false matches a bare key with no modifier', () => {
                setPlatform('MacIntel')
                expect(isShortcutKey(makeReactEvent({ key: 'k' }), 'k', { requireModifier: false })).toBe(true)
            })

            it('requireModifier:false rejects when a modifier IS pressed (inverted branch)', () => {
                setPlatform('MacIntel')
                expect(
                    isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k', {
                        requireModifier: false,
                    })
                ).toBe(false)
            })
        })

        describe('requireShift option', () => {
            it('default (requireShift:false) rejects when shift IS pressed (inverted branch)', () => {
                setPlatform('MacIntel')
                expect(isShortcutKey(makeReactEvent({ key: 'k', metaKey: true, shiftKey: true }), 'k')).toBe(false)
            })

            it('requireShift:true matches when shift is pressed', () => {
                setPlatform('MacIntel')
                expect(
                    isShortcutKey(makeReactEvent({ key: 'k', metaKey: true, shiftKey: true }), 'k', {
                        requireShift: true,
                    })
                ).toBe(true)
            })

            it('requireShift:true rejects when shift is NOT pressed', () => {
                setPlatform('MacIntel')
                expect(
                    isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k', {
                        requireShift: true,
                    })
                ).toBe(false)
            })
        })

        describe('requireAlt option', () => {
            it('requireAlt:true matches when alt is pressed', () => {
                setPlatform('MacIntel')
                expect(
                    isShortcutKey(makeReactEvent({ key: 'k', metaKey: true, altKey: true }), 'k', {
                        requireAlt: true,
                    })
                ).toBe(true)
            })

            it('requireAlt:true rejects when alt is NOT pressed', () => {
                setPlatform('MacIntel')
                expect(
                    isShortcutKey(makeReactEvent({ key: 'k', metaKey: true }), 'k', {
                        requireAlt: true,
                    })
                ).toBe(false)
            })
        })
    })
})
