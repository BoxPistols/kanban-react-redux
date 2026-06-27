# ADR-001: 主要依存関係のメジャーバージョン更新計画（2026年下半期）

## Status
**Accepted** - 計画的に段階実施

## Context

`npm-check-updates` による2026年6月時点の分析で、以下の主要依存関係にメジャーバージョン更新が利用可能であることが判明した。

### 対象メジャーアップデート

| パッケージ | 現在 | 最新 | 影響範囲 |
|-----------|------|------|---------|
| react | 18.3.0 | 19.2.7 | 🔴 **Critical** - フレームワークコア |
| react-dom | 18.3.0 | 19.2.7 | 🔴 **Critical** - フレームワークコア |
| @types/react | 18.3.0 | 19.2.17 | 🔴 **Critical** - 型定義 |
| @types/react-dom | 18.3.0 | 19.2.3 | 🔴 **Critical** - 型定義 |
| typescript | 5.5.0 | 6.0.3 | 🔴 **Critical** - コンパイラ |
| vite | 5.4.0 | 8.1.0 | 🟡 **High** - ビルドツール |
| @vitejs/plugin-react | 4.3.0 | 6.0.3 | 🟡 **High** - Vite連携 |
| firebase | 10.14.1 | 12.15.0 | 🟡 **High** - バックエンド |
| eslint | 8.0.0 | 10.6.0 | 🟢 **Medium** - Linter |
| @typescript-eslint/* | 6.0.0 | 8.62.0 | 🟢 **Medium** - ESLint連携 |
| zustand | 4.5.0 | 5.0.14 | 🟢 **Medium** - 状態管理 |
| @dnd-kit/sortable | 8.0.0 | 10.0.0 | 🟢 **Low** - DnD機能 |

### なぜ即座にマージしないのか

1. **破壊的変更のリスク**
   - React 19: レンダリングロジックの変更、新しいReact Server Components
   - TypeScript 6: 型推論の変更、strict mode の強化
   - Vite 8: プラグインAPIの変更、Node.js 20+ 必須化の可能性
   - Firebase 12: 認証フローや型定義の変更

2. **連鎖的影響**
   - React更新 → @types/react, @vitejs/plugin-react も同時更新必須
   - TypeScript更新 → 全ての @types/* パッケージの互換性確認必須
   - ESLint更新 → @typescript-eslint/* プラグインの同時更新必須

3. **テスト負荷**
   - 現在のテストカバレッジ: store層のみ（PR #72で追加）
   - コンポーネントテスト未整備のため、破壊的変更の検出が手動に依存

## Decision

各メジャーアップデートを**採用するが計画的に段階実施**する。

### Phase 1: 準備フェーズ（2026年7月）
**目的**: 安全な更新のための基盤整備

- [ ] **テストカバレッジ拡充**
  - コンポーネントテスト（React Testing Library）を主要コンポーネントに追加
  - E2Eテスト（Playwright/Cypress）の検討
  - 目標: ブランチカバレッジ60%以上

- [ ] **ドキュメント整備**
  - 各パッケージの CHANGELOG / Migration Guide 確認
  - 破壊的変更のリスト化（docs/MIGRATION_NOTES.md）

- [ ] **ステージング環境確保**
  - Vercel Preview Deployments の活用
  - Firebase Emulator Suiteのローカル運用確認

### Phase 2: Low-Risk Updates（2026年8月）
**優先度**: 🟢 影響範囲が限定的

1. **Zustand 4 → 5**
   - 影響: store層のみ（6ファイル）
   - 検証: 既存のstoreテスト + 手動動作確認
   - Rollback容易

2. **@dnd-kit/sortable 8 → 10**
   - 影響: Column/CardDetailModal（2コンポーネント）
   - 検証: ドラッグ&ドロップ操作の手動確認

3. **ESLint 8 → 10**
   - 影響: Lintルールの厳格化
   - 検証: `npm run lint` で全ファイル確認
   - 段階的に新ルール適用

### Phase 3: Build Tooling Updates（2026年9月）
**優先度**: 🟡 ビルド環境の刷新

1. **Vite 5 → 8 + @vitejs/plugin-react 4 → 6**
   - **同時実施必須** (Vite本体とプラグインの互換性)
   - 検証:
     - ローカル開発サーバー (`npm run dev`)
     - プロダクションビルド (`npm run build`)
     - PWA機能の動作確認
     - バンドルサイズ比較（docs/BUNDLE_ANALYSIS.md 更新）
   - Node.js バージョン要件の確認（現在: Node 20推奨）

2. **vite-plugin-pwa 1.2 → 1.3** (Minor)
   - Vite更新と同タイミングで実施

### Phase 4: Framework Core Updates（2026年10月）
**優先度**: 🔴 最も影響範囲が広い

1. **React 18 → 19 + 型定義更新**
   - **同時実施必須**:
     - `react`, `react-dom`
     - `@types/react`, `@types/react-dom`
   - 破壊的変更の調査:
     - Server Components対応（このプロジェクトは未使用だが将来性）
     - Suspense/Error Boundaryの挙動変更
     - useEffectタイミングの変更
     - styled-components v6のReact 19対応状況確認
   - 検証:
     - 全コンポーネントの目視確認
     - 特にModal系（BaseModal, CardDetailModal, BoardModal）の動作確認
     - InputFormのキーボード操作確認

2. **TypeScript 5 → 6**
   - **React更新後に実施**
   - 破壊的変更:
     - strict modeの厳格化
     - 型推論の変更
     - Zustand/styled-componentsの型定義互換性
   - 検証:
     - `npm run typecheck` で全ファイル型チェック
     - `any`禁止ルールの徹底確認

### Phase 5: Backend Updates（2026年11月）
**優先度**: 🟡 Firebase SDK刷新

1. **Firebase 10 → 12**
   - 影響範囲:
     - `src/lib/firebase.ts`（初期化）
     - `src/store/kanbanStore.ts`, `src/store/boardStore.ts`, `src/store/authStore.ts`
   - 破壊的変更の調査:
     - Firestoreクエリ API の変更
     - 認証フローの変更
     - 型定義の互換性
   - 検証:
     - オフライン → オンライン切替テスト
     - CRUD操作の全パターン確認
     - 認証フロー（ログイン/ログアウト）の動作確認

### Phase 6: ESLint Ecosystem（2026年12月）
**優先度**: 🟢 開発体験の向上

1. **@typescript-eslint/* 6 → 8**
   - TypeScript 6更新後に実施
   - 新しいルールセットの段階適用

## Consequences

### Positive
- ✅ 計画的な実施により破壊的変更のリスクを最小化
- ✅ テストカバレッジ拡充により品質向上
- ✅ 各フェーズごとにRollback可能
- ✅ React 19 / TypeScript 6の新機能を活用可能に

### Negative
- ⚠️ 完了まで6ヶ月のスケジュール（2026年12月まで）
- ⚠️ Phase 1のテスト整備に工数が必要
- ⚠️ 各フェーズ間で依存関係のバージョン差異が発生

### Risks & Mitigation
| リスク | 軽減策 |
|-------|--------|
| テスト工数不足 | Phase 1を最優先、必要に応じてスケジュール調整 |
| 互換性問題の発見遅延 | 各Phase完了時に完全な回帰テスト実施 |
| ユーザー影響 | Vercel Preview で検証後にmainマージ |

## Implementation Plan

### Issue管理
各Phaseごとに個別のブランチ + PR を作成:
- `feat/deps-phase1-testing`
- `feat/deps-phase2-low-risk`
- `feat/deps-phase3-vite`
- `feat/deps-phase4-react`
- `feat/deps-phase5-firebase`
- `feat/deps-phase6-eslint`

### Dependabot対応
- メジャーバージョンのDependabot PRは **Close + このADRにリンク**
- Minor/Patchは通常通り自動マージ検討

### ロールバック戦略
- 各Phaseは独立したPRで管理
- 問題発生時は該当PRをrevert
- 次Phase着手前に前Phaseの安定性を確認

## References
- [React 19 Release Notes](https://react.dev/blog)
- [TypeScript 6.0 Breaking Changes](https://devblogs.microsoft.com/typescript/)
- [Vite 8 Migration Guide](https://vite.dev/guide/migration.html)
- [Firebase SDK Changelog](https://firebase.google.com/support/release-notes/js)
- CLAUDE.md: "メジャーアップ Dependabot を ADR で計画的延期"

## Decision Date
2026-06-28

## Author
Claude Sonnet 4.5 (AI Assistant) + a.ito
