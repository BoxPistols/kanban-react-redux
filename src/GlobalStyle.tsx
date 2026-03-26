import { createGlobalStyle } from 'styled-components'
import type { Theme } from './theme'

export const GlobalStyle = createGlobalStyle<{ $theme: Theme }>`
  html, body, #app, #root {
    height: 100%;
    /* iPhoneのセーフエリアを考慮した最小高さ */
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }

  body {
    font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI',
      'Noto Sans JP', sans-serif;
    font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;

    overflow-wrap: break-word;
    background-color: ${(props) => props.$theme.background};
    color: ${(props) => props.$theme.text};
    margin: 0;
    padding: 0;
    line-height: 1.5;
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
    scrollbar-color: ${(props) => props.$theme.scrollbarThumb} ${(props) => props.$theme.scrollbarTrack};
  }

  /* スクロールバーのスタイル（Webkit: Chrome, Safari, Edge） */
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  *::-webkit-scrollbar-track {
    background: ${(props) => props.$theme.scrollbarTrack};
    border-radius: 4px;
  }

  *::-webkit-scrollbar-thumb {
    background-color: ${(props) => props.$theme.scrollbarThumb};
    border-radius: 4px;
    border: 2px solid ${(props) => props.$theme.scrollbarTrack};
  }

  *::-webkit-scrollbar-thumb:hover {
    background-color: ${(props) => props.$theme.scrollbarThumbHover};
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

  /* ボタンのデフォルトリセット */
  button {
    border: none;
    cursor: pointer;
    font-family: inherit;
  }

  /* 選択色 */
  ::selection {
    background: rgba(0, 101, 255, 0.2);
  }

  /* アクセシビリティ: モーション軽減設定 */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* フォーカスリング: キーボード操作時のみ表示 */
  :focus-visible {
    outline: 2px solid ${(props) => props.$theme.linkColor};
    outline-offset: 2px;
  }

  :focus:not(:focus-visible) {
    outline: none;
  }
`
