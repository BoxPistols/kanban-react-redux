import styled, { css } from 'styled-components'
import * as color from './color'
import { Theme } from './theme'

// ボタンの基本スタイル（グラデーションなし、フラットデザイン）
const baseButtonStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// プライマリボタン（メインアクション用: 追加、保存、作成など）
export const PrimaryButton = styled.button`
  ${baseButtonStyles}
  border: none;
  background-color: ${color.Blue};
  color: ${color.White};

  &:hover:not(:disabled) {
    background-color: #026AA7;
  }

  &:active:not(:disabled) {
    background-color: #01527d;
  }
`

// セカンダリボタン（キャンセル、閉じるなど）
export const SecondaryButton = styled.button<{ $theme?: Theme }>`
  ${baseButtonStyles}
  border: 1px solid ${props => props.$theme?.border || color.Silver};
  background-color: ${props => props.$theme?.surface || color.White};
  color: ${props => props.$theme?.text || color.Black};

  &:hover:not(:disabled) {
    background-color: ${props => props.$theme?.surfaceHover || color.LightSilver};
  }

  &:active:not(:disabled) {
    background-color: ${props => props.$theme?.border || color.Silver};
  }
`

// 危険ボタン（削除など）
export const DangerButton = styled.button<{ $theme?: Theme }>`
  ${baseButtonStyles}
  border: 1px solid ${color.Red};
  background-color: ${props => props.$theme?.surface || color.White};
  color: ${color.Red};

  &:hover:not(:disabled) {
    background-color: ${color.Red};
    color: ${color.White};
  }

  &:active:not(:disabled) {
    background-color: ${color.Maroon};
    border-color: ${color.Maroon};
    color: ${color.White};
  }
`

// 小さいボタン（アイコンボタンやインラインアクション用）
export const SmallButton = styled.button<{ $theme?: Theme }>`
  ${baseButtonStyles}
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid ${props => props.$theme?.border || color.Silver};
  background-color: ${props => props.$theme?.surface || color.White};
  color: ${props => props.$theme?.text || color.Black};

  &:hover:not(:disabled) {
    background-color: ${props => props.$theme?.surfaceHover || color.LightSilver};
  }
`

// 小さいプライマリボタン
export const SmallPrimaryButton = styled.button`
  ${baseButtonStyles}
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  background-color: ${color.Blue};
  color: ${color.White};

  &:hover:not(:disabled) {
    background-color: #026AA7;
  }
`

// 小さい危険ボタン
export const SmallDangerButton = styled.button<{ $theme?: Theme }>`
  ${baseButtonStyles}
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid ${color.Red};
  background-color: ${props => props.$theme?.surface || color.White};
  color: ${color.Red};

  &:hover:not(:disabled) {
    background-color: ${color.Red};
    color: ${color.White};
  }
`

// フルワイドボタン（フォーム内で横幅いっぱいに使用）
export const FullWidthPrimaryButton = styled(PrimaryButton)`
  width: 100%;
`

export const FullWidthSecondaryButton = styled(SecondaryButton)`
  width: 100%;
`

// 後方互換性のためのエイリアス（非推奨: 将来的に削除予定）
/** @deprecated PrimaryButton を使用してください */
export const Button = SecondaryButton
/** @deprecated PrimaryButton を使用してください */
export const ConfirmButton = PrimaryButton
