# Modern Kanban Board

Vite + React 18 + TypeScript + Firebase + Zustandで構築されたモダンなカンバンボードアプリケーションです。

## 主な機能

### カード管理
- ✅ **カードのCRUD操作** - カードの作成、表示、編集、削除
- ✅ **完全なドラッグ&ドロップ** - @dnd-kit/sortableによる高度なカード操作
  - カラム内でのカードの並べ替え
  - カードを別のカラムの特定の位置にドロップ
  - カラムへのドロップで末尾に追加
  - スムーズなアニメーション
- ✅ **リアルタイム同期** - Firestoreによるデータ同期
- ✅ **検索/フィルター** - カードをテキスト、ラベル、担当者で検索
- ✅ **カード詳細** - 説明、チェックリスト、画像添付、URLメタデータ表示

### ボード管理
- ✅ **マルチボード** - 複数のボードを作成・管理
- ✅ **カスタムカラム** - カラムの追加、編集、削除、並べ替え、カラーカスタマイズ
- ✅ **ボード設定** - ボード名、説明、カラーテーマ、ラベル管理
- ✅ **ラベル管理** - カスタムラベルの作成、編集、削除、インポート/エクスポート

### ユーザー機能
- ✅ **認証システム** - Firebase Authentication（メール/パスワード、Google）
- ✅ **ダークモード** - システム設定連動の自動切り替え
- ✅ **ゴミ箱機能** - 削除したカードを30日間保存、復元可能

### 技術機能
- ✅ **PWA対応** - オフラインでも動作、インストール可能
- ✅ **状態管理** - Zustandによるシンプルな状態管理
- ✅ **バッチ更新** - Firebase Batch Writeによる効率的なデータ更新
- ✅ **モダンな技術スタック** - Vite、React 18、TypeScript
- ✅ **パフォーマンス最適化** - React.memoによるコンポーネントメモ化

## 技術スタック

- **React 18** - 最新のReact（Concurrent Features対応）
- **TypeScript 5.5** - 型安全な開発
- **Vite 5** - 高速なビルドツール
- **Firebase 10** - Authentication、Firestore Database、Storage
- **Zustand 4** - 軽量な状態管理（複数storeによる関心の分離）
- **@dnd-kit** - ドラッグ&ドロップライブラリ
- **styled-components 6** - CSS-in-JS
- **Workbox** - PWA/Service Worker（オフライン対応）
- **ESLint** - コード品質チェック（react-hooks、jsx-a11y対応）

## セットアップ

### 1. 依存関係のインストール

このプロジェクトはpnpmを使用しています。

\`\`\`bash
pnpm install
\`\`\`

pnpmがインストールされていない場合：

\`\`\`bash
npm install -g pnpm
\`\`\`

### 2. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Firestoreデータベースを有効化（テストモードで開始）
4. プロジェクト設定から設定値を取得

### 3. 環境変数の設定

\`.env.example\`をコピーして\`.env.local\`を作成し、Firebaseの設定値を入力してください。

\`\`\`bash
cp .env.example .env.local
\`\`\`

\`.env.local\`を編集：

\`\`\`env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
\`\`\`

### 4. 開発サーバーの起動

\`\`\`bash
pnpm dev
\`\`\`

ブラウザで http://localhost:3000 を開きます。

## ビルド

\`\`\`bash
pnpm build
\`\`\`

ビルドされたファイルは\`dist\`ディレクトリに出力されます。

## プレビュー

ビルドされたアプリをプレビュー：

\`\`\`bash
pnpm preview
\`\`\`

## Firestoreデータ構造

### Boards Collection

\`\`\`typescript
{
  id: string          // Firestore auto-generated ID
  name: string        // ボード名
  description?: string // ボードの説明
  color?: string      // ボードのカラーテーマ
  columns: ColumnDefinition[]  // カスタムカラム定義
  labels: Label[]     // ボード固有のラベル
  userId: string      // ボードの所有者
  createdAt: number   // 作成日時（Unix timestamp）
  updatedAt: number   // 更新日時（Unix timestamp）
}
\`\`\`

### Cards Collection

\`\`\`typescript
{
  id: string          // Firestore auto-generated ID
  title?: string      // カードタイトル（新規）
  text: string        // カードの内容
  description?: string // 詳細説明
  columnId: string    // カラムID（カスタマイズ可能）
  boardId: string     // 所属ボードID
  order: number       // カラム内の並び順
  labels: string[]    // ラベルID配列
  assignees: string[] // 担当者配列
  checklist: ChecklistItem[]  // チェックリスト
  images: ImageAttachment[]   // 画像添付
  color?: string      // カードのカラー
  userId: string      // カード作成者
  createdAt: number   // 作成日時（Unix timestamp）
  updatedAt: number   // 更新日時（Unix timestamp）
}
\`\`\`

### Trash Collection

\`\`\`typescript
{
  id: string          // 元のカードID
  ...Card             // カードの全データ
  originalBoardId: string    // 元のボードID
  originalColumnId: string   // 元のカラムID
  deletedAt: number          // 削除日時（30日後に自動削除）
}
\`\`\`

## プロジェクト構造

\`\`\`
src/
├── lib/
│   └── firebase.ts          # Firebase設定・初期化
├── store/
│   ├── kanbanStore.ts       # カード操作のメインstore
│   ├── boardStore.ts        # ボード管理store
│   ├── authStore.ts         # 認証状態store
│   ├── themeStore.ts        # テーマ設定store
│   └── trashStore.ts        # ゴミ箱管理store
├── types/
│   └── index.ts             # 型定義（Card, Board, Label等）
├── hooks/
│   ├── useFirestore.ts      # Firestore操作hooks
│   └── useUrlMetadata.ts    # URLメタデータ取得hooks
├── App.tsx                  # メインコンポーネント
├── Auth.tsx                 # 認証画面
├── Header.tsx               # ヘッダーコンポーネント
├── BoardSelector.tsx        # ボード選択UI
├── Column.tsx               # カラムコンポーネント
├── ColumnManager.tsx        # カラム管理モーダル
├── Card.tsx                 # カードコンポーネント
├── CardDetailModal.tsx      # カード詳細モーダル
├── CardFilter.tsx           # 検索フィルターコンポーネント
├── BoardModal.tsx           # ボード設定モーダル
├── TrashModal.tsx           # ゴミ箱モーダル
├── BaseModal.tsx            # モーダルベースコンポーネント
├── InputForm.tsx            # 入力フォームコンポーネント
├── Button.tsx               # ボタンコンポーネント
├── LinkedText.tsx           # リンク付きテキスト
├── ReloadPrompt.tsx         # PWA更新プロンプト
├── ErrorBoundary.tsx        # エラー境界
├── GlobalStyle.tsx          # グローバルスタイル
├── theme.ts                 # テーマ定義
├── color.ts                 # カラー定義
├── constants.ts             # 定数定義
├── icon.tsx                 # アイコンコンポーネント
└── main.tsx                 # エントリーポイント
\`\`\`

## 使い方

### 基本操作
1. **認証**: メールアドレスまたはGoogleアカウントでログイン
2. **ボード作成**: ヘッダーの「+」ボタンから新しいボードを作成
3. **カードの追加**: 各カラムの「+」ボタンをクリックしてカードを作成
4. **カードの編集**: カードをクリックして詳細モーダルを開く
5. **カードの削除**: カードのゴミ箱アイコンをクリック（30日間ゴミ箱に保存）

### カード操作
- **ドラッグ&ドロップ**:
  - 同じカラム内でカードをドラッグして並べ替え
  - カードを別のカードにドロップして特定の位置に配置
  - カラムの空白部分にドロップしてカラムの末尾に追加
- **ラベル**: カード詳細モーダルでラベルを追加・削除
- **チェックリスト**: タスクリストを作成して進捗を管理
- **画像添付**: Firebase Storageに画像をアップロード
- **カラー**: カードに色を設定して視覚的に分類

### ボード管理
- **カラムのカスタマイズ**: 「レーン管理」ボタンからカラムの追加・編集・並べ替え
- **ボード設定**: ヘッダーのギアアイコンからボード名、説明、ラベルを管理
- **ラベル管理**: ボード設定でカスタムラベルを作成、JSONでインポート/エクスポート可能

### その他
- **検索**: ヘッダーの検索ボックスでカードを検索（テキスト、ラベル、担当者）
- **ゴミ箱**: ヘッダーのゴミ箱アイコンから削除したカードを復元
- **ダークモード**: ヘッダーの月アイコンでテーマ切り替え
- **オフライン**: PWA対応により、オフラインでもカード操作が可能（オンライン時に同期）

## 機能の詳細

### ドラッグ&ドロップ
- **カラム内並べ替え**: カードをドラッグして同じカラム内の好きな位置に移動
- **カラム間移動**: カードを別のカラムの特定の位置にドロップ可能
- **スマートな順序更新**: Firebase Batch Writeで複数カードのorder値を効率的に更新
- **リアルタイム反映**: 並べ替え後、すぐにFirestoreと同期

### データ永続化
- すべてのカードデータはFirestore Databaseに保存
- リアルタイムリスナーで複数ユーザー間のデータ同期をサポート
- 環境変数の検証機能により設定ミスを早期に検出

## ライセンス

MIT
