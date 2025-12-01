/**
 * Color utility functions for contrast and accessibility
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const { r, g, b } = rgb
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  )
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Determine if a color is light or dark
 * Returns true if the color is light (should use dark text)
 */
export function isLightColor(hex: string): boolean {
  const luminance = getLuminance(hex)
  return luminance > 0.179
}

/**
 * Get contrasting text color (black or white) for a given background color
 */
export function getContrastTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#111111' : '#FFFFFF'
}

/**
 * Get contrasting border color for a given background color
 * Useful for selection states
 */
export function getContrastBorderColor(backgroundColor: string, isDarkMode: boolean): string {
  if (!backgroundColor) {
    return isDarkMode ? '#FFFFFF' : '#111111'
  }
  return isLightColor(backgroundColor) ? '#111111' : '#FFFFFF'
}
