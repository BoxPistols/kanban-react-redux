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

  /* Modalが開いているときのbodyスクロール固定（通常ブラウザ） */
  body.modal-open {
    overflow: hidden;
  }

  /* Modalが開いているときのbodyスクロール固定（iOS Safari） */
  body.modal-open-ios {
    position: fixed;
    width: 100%;
    height: 100%;
  }

  /* Modalが開いているときの背景要素のpointer-events無効化 */
  body.modal-open #root,
  body.modal-open-ios #root {
    pointer-events: none;
  }

  body.modal-open [data-app-container],
  body.modal-open-ios [data-app-container] {
    pointer-events: none;
  }

  body.modal-open [data-card-container],
  body.modal-open-ios [data-card-container] {
    pointer-events: none;
  }

  body.modal-open [data-column-container],
  body.modal-open-ios [data-column-container] {
    pointer-events: none;
  }

  body.modal-open [data-horizontal-scroll],
  body.modal-open-ios [data-horizontal-scroll] {
    pointer-events: none;
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

  /* iOS Safariで入力フィールドタップ時の自動ズームを防止 */
  /* フォントサイズが16px未満の場合にズームされるため、モバイルでは16pxに統一 */
  @media screen and (max-width: 768px) {
    input,
    textarea,
    select {
      font-size: 16px !important;
    }
  }

  /* ダブルタップによるズームを防止 */
  * {
    touch-action: manipulation;
  }
`