import { describe, it, expect } from 'vitest'
import * as color from './color'

describe('color utilities', () => {
    it('should export all required color constants', () => {
        expect(color.Navy).toBeDefined()
        expect(color.Blue).toBeDefined()
        expect(color.Green).toBeDefined()
        expect(color.Red).toBeDefined()
        expect(color.Maroon).toBeDefined()
        expect(color.Black).toBeDefined()
        expect(color.Gray).toBeDefined()
        expect(color.Silver).toBeDefined()
        expect(color.LightSilver).toBeDefined()
        expect(color.White).toBeDefined()
    })

    it('should have valid hex color format', () => {
        const hexColorRegex = /^#[0-9A-F]{6}$/i

        expect(color.Navy).toMatch(hexColorRegex)
        expect(color.Blue).toMatch(hexColorRegex)
        expect(color.Green).toMatch(hexColorRegex)
        expect(color.Red).toMatch(hexColorRegex)
        expect(color.Maroon).toMatch(hexColorRegex)
        expect(color.Black).toMatch(hexColorRegex)
        expect(color.Gray).toMatch(hexColorRegex)
        expect(color.Silver).toMatch(hexColorRegex)
        expect(color.LightSilver).toMatch(hexColorRegex)
        expect(color.White).toMatch(hexColorRegex)
    })

    it('should export exactly 10 color constants', () => {
        const exportedColors = Object.keys(color)
        expect(exportedColors).toHaveLength(10)
    })
})
