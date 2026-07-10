import styled, { css } from 'styled-components'
import * as color from './color'
import { Theme } from './theme'

// ボタンの基本スタイル（グラデーションなし、フラットデザイン）
// タッチターゲット: 常時36px、タッチデバイスでは44px(Apple HIG)を確保する
const baseButtonStyles = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    padding: 8px 16px;
    min-height: 36px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
        background-color 0.2s,
        border-color 0.2s,
        color 0.2s;
    white-space: nowrap;

    @media (pointer: coarse) {
        min-height: 44px;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`

// 小型ボタン共通: 視覚は控えめに保ちつつ、最低28px+タッチ時44px(WCAG 2.5.8/HIG)を確保
const smallButtonSizing = css`
    padding: 4px 8px;
    min-height: 28px;
    min-width: 28px;
    font-size: 12px;

    /* 後述の宣言が base の coarse 指定を上書きしないよう、ここでも44pxを明示する */
    @media (pointer: coarse) {
        min-height: 44px;
        min-width: 44px;
    }
`

// プライマリボタン（メインアクション用: 追加、保存、作成など）
export const PrimaryButton = styled.button`
    ${baseButtonStyles}
    border: none;
    background-color: ${color.Blue};
    color: ${color.White};

    &:hover:not(:disabled) {
        background-color: #026aa7;
    }

    &:active:not(:disabled) {
        background-color: #01527d;
    }
`

// セカンダリボタン（キャンセル、閉じるなど）
export const SecondaryButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    border: 1px solid ${(props) => props.$theme?.border || color.Silver};
    background-color: ${(props) => props.$theme?.surface || color.White};
    color: ${(props) => props.$theme?.text || color.Black};

    &:hover:not(:disabled) {
        background-color: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
    }

    &:active:not(:disabled) {
        background-color: ${(props) => props.$theme?.border || color.Silver};
    }
`

// 危険ボタン（削除など）
export const DangerButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    border: 1px solid ${color.Red};
    background-color: ${(props) => props.$theme?.surface || color.White};
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

// アウトラインプライマリボタン（インポートなど、セカンダリよりも目立たせたいが塗りつぶしは不要な場合）
export const OutlinedPrimaryButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    border: 1px solid ${color.Blue};
    background-color: ${(props) => props.$theme?.surface || color.White};
    color: ${color.Blue};

    &:hover:not(:disabled) {
        background-color: ${color.Blue};
        color: ${color.White};
    }

    &:active:not(:disabled) {
        background-color: ${color.Navy};
        border-color: ${color.Navy};
        color: ${color.White};
    }
`

// 小さいボタン（アイコンボタンやインラインアクション用）
export const SmallButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    ${smallButtonSizing}
    border: 1px solid ${(props) => props.$theme?.border || color.Silver};
    background-color: ${(props) => props.$theme?.surface || color.White};
    color: ${(props) => props.$theme?.text || color.Black};

    &:hover:not(:disabled) {
        background-color: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
    }
`

// 小さいプライマリボタン
export const SmallPrimaryButton = styled.button`
    ${baseButtonStyles}
    ${smallButtonSizing}
    border: none;
    background-color: ${color.Blue};
    color: ${color.White};

    &:hover:not(:disabled) {
        background-color: #026aa7;
    }
`

// 小さい危険ボタン
export const SmallDangerButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    ${smallButtonSizing}
    border: 1px solid ${color.Red};
    background-color: ${(props) => props.$theme?.surface || color.White};
    color: ${color.Red};

    &:hover:not(:disabled) {
        background-color: ${color.Red};
        color: ${color.White};
    }
`

// アイコンボタン（チェックリストの編集・保存・キャンセルなどのアイコン用）
export const IconButton = styled.button<{ $theme?: Theme }>`
    ${baseButtonStyles}
    ${smallButtonSizing}
    font-size: 16px;
    border: 1px solid ${(props) => props.$theme?.border || color.Silver};
    background-color: ${(props) => props.$theme?.surface || color.White};
    color: ${(props) => props.$theme?.text || color.Black};

    &:hover:not(:disabled) {
        background-color: ${(props) => props.$theme?.surfaceHover || color.LightSilver};
    }
`

// フルワイドボタン（フォーム内で横幅いっぱいに使用）
export const FullWidthPrimaryButton = styled(PrimaryButton)`
    width: 100%;
`

export const FullWidthSecondaryButton = styled(SecondaryButton)`
    width: 100%;
`
