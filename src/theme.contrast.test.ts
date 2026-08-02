import { describe, it, expect } from 'vitest'
import { lightTheme, darkTheme, type Theme } from './theme'

/**
 * テーマ色の WCAG コントラスト実測ガード。
 *
 * 「濃くしたから多分大丈夫」で色を決めると AA を割ったまま気付けない
 * (実際 light の期限バッジは 2.05:1、dark の期限切れバッジは 4.42:1 だった)。
 * ここで実際に比を計算し、AA(4.5:1)を割る変更を機械的に落とす。
 */

const AA_NORMAL_TEXT = 4.5

type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
    const c = hex.replace('#', '')
    const full =
        c.length === 3
            ? c
                  .split('')
                  .map((x) => x + x)
                  .join('')
            : c
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
}

function relativeLuminance([r, g, b]: Rgb): number {
    const channel = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

// 前景を背景に alpha で重ねた実効色(半透明の地色・薄めた文字色の実測に使う)
function composite(fg: Rgb, bg: Rgb, alpha: number): Rgb {
    return [
        fg[0] * alpha + bg[0] * (1 - alpha),
        fg[1] * alpha + bg[1] * (1 - alpha),
        fg[2] * alpha + bg[2] * (1 - alpha),
    ]
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
    const a = relativeLuminance(fg) + 0.05
    const b = relativeLuminance(bg) + 0.05
    return Math.max(a, b) / Math.min(a, b)
}

// バッジは「同じ色を 0x20(= 12.5%)で敷いた地」に同色の文字を載せる作りなので、
// 白/黒地ではなくこの実効地色に対して測る必要がある。
const TINT_ALPHA = 0x20 / 0xff

function onTint(colorHex: string, surfaceHex: string): number {
    const fg = parseHex(colorHex)
    const bg = composite(fg, parseHex(surfaceHex), TINT_ALPHA)
    return contrastRatio(fg, bg)
}

function onSurface(colorHex: string, surfaceHex: string): number {
    return contrastRatio(parseHex(colorHex), parseHex(surfaceHex))
}

const themes: { name: string; theme: Theme }[] = [
    { name: 'light', theme: lightTheme },
    { name: 'dark', theme: darkTheme },
]

describe.each(themes)('$name テーマのコントラスト (WCAG AA 4.5:1)', ({ theme }) => {
    const surface = theme.cardBackground

    it.each([
        ['warning(期限が近い)', 'warning'],
        ['danger(期限切れ)', 'danger'],
        ['success(チェックリスト完了)', 'success'],
    ] as const)('%s は淡色タイント地の上で AA を満たす', (_label, token) => {
        expect(onTint(theme[token], surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })

    it.each([
        ['warning', 'warning'],
        ['danger', 'danger'],
        ['success', 'success'],
        ['textSecondary(二次テキスト)', 'textSecondary'],
        ['text(本文)', 'text'],
    ] as const)('%s はカード面の上で AA を満たす', (_label, token) => {
        expect(onSurface(theme[token], surface)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })

    it('二次テキストを opacity で薄めると AA を割る(opacity を使わない根拠)', () => {
        // この比較自体が「なぜトークン色をそのまま使うのか」の根拠。
        // 実装が opacity を復活させたらこの前提が崩れるため、数値で残しておく。
        const fg = parseHex(theme.textSecondary)
        const bg = parseHex(surface)
        const faded = composite(fg, bg, 0.85)
        expect(contrastRatio(faded, bg)).toBeLessThan(AA_NORMAL_TEXT)
    })
})
