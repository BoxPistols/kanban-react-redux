// アクセシビリティ共通スタイル断片
//
// 基準:
// - 最小フォントサイズ 12px(これ未満は装飾以外で使用しない)
// - タッチターゲット: 常時 24px 以上(WCAG 2.5.8 AA)、
//   タッチデバイスでは 44px 相当(Apple HIG)を確保する
// - hover でしか現れない操作はタッチデバイスでは常時表示する

// 視覚サイズを変えずに、タッチデバイスでの当たり判定を 44x44px まで拡張する。
// 使用する要素に position: relative を含む。独自の ::after を持つ要素には使わないこと。
// 隣接ターゲット同士が重なる密集配置では、拡張ではなく実サイズを 44px にする。
export const touchTargetExpand = `
    position: relative;

    @media (pointer: coarse) {
        &::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: max(100%, 44px);
            height: max(100%, 44px);
            transform: translate(-50%, -50%);
        }
    }
`

// hover が存在しない環境(タッチ)では、hover表示前提のコントロールを常時表示する
export const visibleWithoutHover = (opacity: number) => `
    @media (hover: none) {
        opacity: ${opacity};
    }
`
