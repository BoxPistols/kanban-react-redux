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
}

export const lightTheme: Theme = {
  background: '#F4F5F7',
  surface: color.White,
  surfaceHover: '#F8F9FA',
  text: color.Black,
  textSecondary: '#6B778C',
  border: color.Silver,
  cardBackground: color.White,
  columnBackground: color.LightSilver,
  headerBackground: color.Navy,
  inputBackground: color.White,
  inputBorder: color.Silver,
  shadow: 'hsla(0, 0%, 7%, 0.1)',
  shadowHover: 'hsla(0, 0%, 7%, 0.2)',
  scrollbarTrack: '#F4F5F7',
  scrollbarThumb: '#C1C7D0',
  scrollbarThumbHover: '#A5ADBA'
}

export const darkTheme: Theme = {
  background: '#1A1D23',
  surface: '#22272B',
  surfaceHover: '#2C333A',
  text: '#E3E5E8',  // Improved contrast from #B6C2CF - 87% opacity on white
  textSecondary: '#9BA1A6',  // Improved contrast from #8C9BAB - 60% opacity
  border: '#3D444D',
  cardBackground: '#22272B',
  columnBackground: '#161A1D',
  headerBackground: '#161A1D',
  inputBackground: '#22272B',
  inputBorder: '#3D444D',
  shadow: 'hsla(0, 0%, 0%, 0.3)',
  shadowHover: 'hsla(0, 0%, 0%, 0.5)',
  scrollbarTrack: '#161A1D',
  scrollbarThumb: '#3D444D',
  scrollbarThumbHover: '#515861'
}

export function getTheme(isDarkMode: boolean): Theme {
  return isDarkMode ? darkTheme : lightTheme
}
