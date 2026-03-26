# Kanban React Firebase Project

## プロジェクト概要
React + TypeScript + Firebase/Firestore を使用したカンバンボードアプリケーション。
オフラインモード(localStorage)とFirebase連携モードの両方をサポート。

## 技術スタック
- **Frontend**: React 18, TypeScript 5.5
- **State Management**: Zustand
- **Backend**: Firebase/Firestore (オプション)
- **Drag & Drop**: @dnd-kit
- **Styling**: styled-components
- **Build**: Vite

## ディレクトリ構造
```
src/
├── lib/firebase.ts      # Firebase初期化・設定
├── store/               # Zustand stores
│   ├── kanbanStore.ts   # カード操作のメインstore
│   ├── boardStore.ts    # ボード管理
│   ├── authStore.ts     # 認証状態
│   └── themeStore.ts    # テーマ設定
├── types/index.ts       # TypeScript型定義
├── components/          # UIコンポーネント (ルート直下)
│   ├── App.tsx
│   ├── Card.tsx
│   ├── Column.tsx
│   └── ...
└── utils/               # ユーティリティ関数
```

## 主要コマンド
```bash
npm run dev      # 開発サーバー起動 (Vite)
npm run build    # TypeScriptコンパイル + プロダクションビルド
npm run preview  # ビルドプレビュー
npm run format   # Prettierフォーマット
```

## 環境変数
Firebase使用時は `.env.local` に以下を設定:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```
未設定の場合、自動的にlocalStorageモードで動作。

## 型定義 (src/types/index.ts)
- `Card`: カードデータ (text, columnId, boardId, labels, checklist等)
- `Column`: カラム定義 (TODO, Doing, Waiting, Done)
- `Board`: ボード定義
- `Label`: ラベル
- `ChecklistItem`: チェックリスト項目

## コーディング規約
- コンポーネントは関数コンポーネント + TypeScript
- styled-componentsでスタイリング
- Zustandでグローバル状態管理
- Firebase操作はstore内で完結させる
- 日本語コメント推奨

## 注意事項
- Firestoreはundefined値をサポートしないため、`removeUndefinedFields`で除去
- カードの並び順は`order`フィールドで管理
- ボードごとにカードをフィルタリング
<!-- claude-memory-sync: auto-generated -->

## グローバル設計方針

# グローバル設計方針

## コンポーネント設計
- 単一責任。1コンポーネント1責務
- Props は必ず型定義。any 禁止
- 副作用は hooks に分離する

## 命名規則
- コンポーネント: PascalCase
- hooks: use プレフィックス
- 定数: UPPER_SNAKE_CASE

## Claude への指示スタイル
- 差分だけ返す。ファイル全体を返さない
- 変更理由を1行コメントで添える
- 選択肢がある場合は推奨を1つ明示してから提示する

## 禁止パターン
- any の使用
- console.log の commit
- ハードコードされた文字列（i18n対象はすべて定数化）

---

## AI チャット汎用パターン

### ハイブリッド AI 戦略（オフライン + オンライン）
- 常にオフライン動作可能: FAQ ローカル検索（Fuse.js ファジーマッチ）
- AI があれば強化: Embedding セマンティック検索 + LLM 生成
- AI エラー時: FAQ フォールバック
- 3層: Semantic Search → Keyword Search → Hardcoded Suggestions

### OpenAI/Gemini デュアル対応
- Gemini は OpenAI 互換エンドポイント (`generativelanguage.googleapis.com/v1beta/openai/`) 経由
- Bearer 認証統一。`model.includes('gemini')` で分岐
- レスポンス抽出: OpenAI標準 / Responses API / Gemini native の3形式を正規化

### Embedding セマンティック検索
- `text-embedding-3-small` (512次元に短縮でコスト削減)
- インメモリ VectorIndex（バッチ100件単位でAPI呼び出し）
- コサイン類似度: `dot / (norm_a * norm_b)`, threshold=0.3, topK=5

### ページ文脈認識パターン
- 現在のページ情報 `{ title, name, description }` をシステムプロンプトに動的注入
- 指示語解決: 「このUI何?」→ 現在ページのコンポーネントを特定
- 応用: ドキュメントビューア等で「現在地」パラメータを渡すだけで同じ仕組みが使える

### ペルソナ検出
- ページシグナル(+2点) + 語彙シグナル(+1点/match) でスコアリング
- 閾値2以上で判定（designer/engineer/unknown）
- ペルソナ別プロンプト拡張を動的注入

### APIキー管理パターン
- ビルド時デフォルト (`import.meta.env`) → ユーザー入力上書き (localStorage)
- モデル互換性チェック（defaultKey 使用時に制限）
- 接続テスト UI

### ショートカット管理
- KeyDown 捕捉 + IME対応 (`e.nativeEvent.isComposing`)
- 修飾キー正規化（Mac: Cmd / Windows: Ctrl 自動判定）
- localStorage 永続化 + リセット機能

## Storybook 汎用パターン

### テーマ切替
- toolbar globalTypes で複数テーマを定義
- `parseThemeValue()` で "dark-scheme" → mode + scheme に分離
- `data-theme-transitioning` 属性で切替トランジション制御（350ms）
- 初回マウントはトランジションなし

### Decorator 多重ラップ
- Emotion ThemeProvider → MUI ThemeProvider → CacheProvider → CssBaseline
- パラメータ制御: noPadding / fullscreenNoPadding / blockLinks
- コンテキスト注入: viewMode 判定で docs 時は特定コンポーネント非表示

### Story カテゴリ設計
- 番号プレフィックス (00-Guide, 01-Philosophy, 02-Tokens, ...) でソート順を制御
- storySort で明示的順序指定

## デザインシステム汎用パターン

### マルチスキーム対応
- ColorSet: { main, dark, light, lighter, contrastText } の統一インターフェース
- lighter スロットをスキーム環境色で上書き（セマンティック色は固有 lighter を保持）
- CSS Variables で Tailwind と MUI を色共有

### CVA (class-variance-authority) パターン
- variant × size のマトリクスで型安全なバリエーション管理
- Tailwind utility + CVA = styled-components 不要
- shadcn/ui 互換の設計

### MUI + Tailwind 共存
- MUI: 複雑な UI コンポーネント（Dialog, DataGrid 等）→ theme.palette トークン参照
- Tailwind: シンプルなコンポーネント（Button, Card）→ CVA + CSS Variables
- tailwind.config で `var(--color-*)` を colors に定義 → テーマ自動切替

### W3C DTCG トークン
- `$value` + `$type` 形式で機械可読
- light/dark を同一ファイルに構造化
- Figma / デザインツール連携可能

### コンポーネントメタデータ
- JSON で name/category/path/variants/sizes/accessibility/prohibited/sample を定義
- AI エージェントがコンポーネント仕様を自動認識可能

## LP 汎用パターン

### framer-motion アニメーション
- `useInView({ once: true })` + stagger (index * delay) でスクロールトリガー
- `useScroll` + `useTransform` でパララックス効果
- カスタムイージング: `[0.25, 0.1, 0, 1]` でモダンな減速感
- グラデーションオーブ: `radial-gradient` + `blur` + keyframes で有機的な背景

### ダークモード分岐
- `const isDark = theme.palette.mode === 'dark'`
- alpha 値で分岐: dark=0.15, light=0.12（色付きシャドウ）
- bgcolor/borderColor を三項演算子で切替

### ホバー効果統一パターン
- `transition: 'border-color 0.2s ease, box-shadow 0.2s ease'`
- `&:hover: { boxShadow: '0 12px 40px rgba(brand,alpha)', borderColor: 'primary.main' }`
- 全カード系コンポーネントで共通化

### レスポンシブ
- CONTAINER_SX: `{ maxWidth: 1120, mx: 'auto', px: { xs: 2.5, sm: 3, md: 4 } }`
- Grid: `gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }`
- フォント: `fontSize: { xs: '2rem', md: '2.8rem' }`

## モノレポ汎用パターン

### pnpm workspace + Turborepo
- `pnpm-workspace.yaml` でパッケージ定義
- `workspace:*` でルートパッケージを apps から参照
- turbo.json: `dependsOn: ["^build"]` で依存順ビルド、dev は `cache: false, persistent: true`

### 統合ビルド・デプロイ（Vercel）
- ビルドスクリプトで全アプリを `dist/` サブディレクトリに出力
- `vercel.json` の rewrites でパスルーティング（`/app-name/(.*)` → `/app-name/$1`）
- 各アプリは `VITE_BASE_PATH=/app-name/` でビルド

### ポート管理
- デフォルトポートを定数定義
- localStorage で上書き可能（開発者向け設定パネル）
- ポート生存確認: HEAD fetch + timeout → 隣接ポートスキャン
- ローカル/本番リンク自動切替: `isDev ? localhost:PORT : origin + path`

### dev:all 一括起動
- `pnpm dev & pnpm storybook & pnpm -F app1 dev & ... & wait`
- 個別起動: `pnpm --filter app-name dev`

---
<!-- このファイルは claude-memory-sync が管理します -->
<!-- 自由に編集してください。cm コマンドで同期されます -->

