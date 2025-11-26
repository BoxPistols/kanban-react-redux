import { createGlobalStyle } from 'styled-components'
import type { Theme } from './theme'

export const GlobalStyle = createGlobalStyle<{ $theme: Theme }>`
  html, body, #app {
    height: 100%;
  }

  body {
    /* https://css-tricks.com/snippets/css/system-font-stack/ */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;

    overflow-wrap: break-word;
    background-color: ${props => props.$theme.background};
    color: ${props => props.$theme.text};
    margin: 0;
    padding: 0;
  }

  /* スクロールバーのスタイル（Firefox） */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${props => props.$theme.scrollbarThumb} ${props => props.$theme.scrollbarTrack};
  }

  /* スクロールバーのスタイル（Webkit: Chrome, Safari, Edge） */
  *::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  *::-webkit-scrollbar-track {
    background: ${props => props.$theme.scrollbarTrack};
  }

  *::-webkit-scrollbar-thumb {
    background-color: ${props => props.$theme.scrollbarThumb};
    border-radius: 6px;
    border: 3px solid ${props => props.$theme.scrollbarTrack};
  }

  *::-webkit-scrollbar-thumb:hover {
    background-color: ${props => props.$theme.scrollbarThumbHover};
  }
`