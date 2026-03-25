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
}

export const lightTheme: Theme = {
  background: '#F0F2F5',
  surface: color.White,
  surfaceHover: '#F5F6F8',
  text: '#1A1D23',
  textSecondary: '#5E6C84',
  border: '#DFE1E6',
  cardBackground: color.White,
  columnBackground: '#F7F8FA',
  headerBackground: '#1B2638',
  inputBackground: '#FAFBFC',
  inputBorder: '#DFE1E6',
  shadow: 'rgba(9, 30, 66, 0.08)',
  shadowHover: 'rgba(9, 30, 66, 0.16)',
  scrollbarTrack: '#F4F5F7',
  scrollbarThumb: '#C1C7D0',
  scrollbarThumbHover: '#A5ADBA',
  linkColor: '#0065FF',
  linkColorHover: '#0052CC',
  linkColorVisited: '#5243AA',
  accentGradient: 'linear-gradient(135deg, #0065FF 0%, #6554C0 100%)',
  cardBorderRadius: '10px',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)'
}

export const darkTheme: Theme = {
  background: '#0D1117',
  surface: '#161B22',
  surfaceHover: '#1C2333',
  text: '#E6EDF3',
  textSecondary: '#8B949E',
  border: '#30363D',
  cardBackground: '#161B22',
  columnBackground: '#0D1117',
  headerBackground: '#010409',
  inputBackground: '#0D1117',
  inputBorder: '#30363D',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowHover: 'rgba(0, 0, 0, 0.5)',
  scrollbarTrack: '#0D1117',
  scrollbarThumb: '#30363D',
  scrollbarThumbHover: '#484F58',
  linkColor: '#58A6FF',
  linkColorHover: '#79C0FF',
  linkColorVisited: '#BC8CFF',
  accentGradient: 'linear-gradient(135deg, #58A6FF 0%, #BC8CFF 100%)',
  cardBorderRadius: '10px',
  surfaceGlass: 'rgba(22, 27, 34, 0.8)'
}

export function getTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? darkTheme : lightTheme
}
