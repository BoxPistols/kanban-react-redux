import * as color from './color'

export interface Theme {
    background: string
    surface: string
    surfaceHover: string
    text: string
    textSecondary: string
    border: string
    cardBackground: string
    columnBackground: string
    headerBackground: string
    inputBackground: string
    inputBorder: string
    shadow: string
    shadowHover: string
    scrollbarTrack: string
    scrollbarThumb: string
    scrollbarThumbHover: string
    linkColor: string
    linkColorHover: string
    linkColorVisited: string
    // モダンデザイン用の追加プロパティ
    accentGradient: string
    cardBorderRadius: string
    surfaceGlass: string
    // 背景グロー
    accentGlow: string
    accentGlow2: string
}

export const lightTheme: Theme = {
    background: '#EDEEF2',
    surface: color.White,
    surfaceHover: '#F3F4F8',
    text: '#1A1D23',
    textSecondary: '#5E6C84',
    border: 'rgba(0, 0, 0, 0.08)',
    cardBackground: color.White,
    columnBackground: 'rgba(255, 255, 255, 0.55)',
    headerBackground: '#1B2638',
    inputBackground: '#FAFBFC',
    inputBorder: '#DFE1E6',
    shadow: 'rgba(9, 30, 66, 0.06)',
    shadowHover: 'rgba(9, 30, 66, 0.14)',
    scrollbarTrack: '#F4F5F7',
    scrollbarThumb: '#C1C7D0',
    scrollbarThumbHover: '#A5ADBA',
    linkColor: '#0065FF',
    linkColorHover: '#0052CC',
    linkColorVisited: '#5243AA',
    accentGradient: 'linear-gradient(135deg, #0065FF 0%, #6554C0 100%)',
    cardBorderRadius: '8px',
    surfaceGlass: 'rgba(255, 255, 255, 0.6)',
    accentGlow: 'rgba(0, 101, 255, 0.03)',
    accentGlow2: 'rgba(101, 84, 192, 0.02)',
}

export const darkTheme: Theme = {
    background: '#0B0F14',
    surface: '#161B22',
    surfaceHover: '#1C2333',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    border: 'rgba(255, 255, 255, 0.08)',
    cardBackground: '#161B22',
    columnBackground: 'rgba(13, 17, 23, 0.65)',
    headerBackground: '#010409',
    inputBackground: '#0D1117',
    inputBorder: '#30363D',
    shadow: 'rgba(0, 0, 0, 0.35)',
    shadowHover: 'rgba(0, 0, 0, 0.55)',
    scrollbarTrack: '#0D1117',
    scrollbarThumb: '#30363D',
    scrollbarThumbHover: '#484F58',
    linkColor: '#58A6FF',
    linkColorHover: '#79C0FF',
    linkColorVisited: '#BC8CFF',
    accentGradient: 'linear-gradient(135deg, #58A6FF 0%, #BC8CFF 100%)',
    cardBorderRadius: '8px',
    surfaceGlass: 'rgba(22, 27, 34, 0.7)',
    accentGlow: 'rgba(88, 166, 255, 0.04)',
    accentGlow2: 'rgba(188, 140, 255, 0.03)',
}

export function getTheme(isDarkMode: boolean): Theme {
    return isDarkMode ? darkTheme : lightTheme
}
