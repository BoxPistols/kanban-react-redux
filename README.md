# Modern Kanban Board

Vite + React 18 + TypeScript + Firebase + Zustandで構築されたモダンなカンバンボードアプリケーションです。

## 主な機能

- ✅ **カードのCRUD操作** - カードの作成、表示、削除
- ✅ **完全なドラッグ&ドロップ** - @dnd-kit/sortableによる高度なカード操作
  - カラム内でのカードの並べ替え
  - カードを別のカラムの特定の位置にドロップ
  - カラムへのドロップで末尾に追加
  - スムーズなアニメーション
- ✅ **リアルタイム同期** - Firestoreによるデータ同期
- ✅ **検索/フィルター** - カードをテキストで検索
- ✅ **状態管理** - Zustandによるシンプルな状態管理
- ✅ **バッチ更新** - Firebase Batch Writeによる効率的なorder値の更新
- ✅ **モダンな技術スタック** - Vite、React 18、TypeScript

## 技術スタック

- **React 18** - 最新のReact
- **TypeScript 5** - 型安全な開発
- **Vite 5** - 高速なビルドツール
- **Firebase 10** - Firestore Database
- **Zustand 4** - 軽量な状態管理
- **@dnd-kit** - ドラッグ&ドロップライブラリ
- **styled-components 6** - CSS-in-JS

## セットアップ

### 1. 依存関係のインストール

\`\`\`bash
npm install
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
npm run dev
\`\`\`

ブラウザで http://localhost:3000 を開きます。

## ビルド

\`\`\`bash
npm run build
\`\`\`

ビルドされたファイルは\`dist\`ディレクトリに出力されます。

## プレビュー

ビルドされたアプリをプレビュー：

\`\`\`bash
npm run preview
\`\`\`

## Firestoreデータ構造

### Cards Collection

\`\`\`typescript
{
  id: string          // Firestore auto-generated ID
  text: string        // カードの内容
  columnId: 'TODO' | 'Doing' | 'Waiting' | 'Done'
  order: number       // カラム内の並び順
  createdAt: number   // 作成日時（Unix timestamp）
  updatedAt: number   // 更新日時（Unix timestamp）
}
\`\`\`

## プロジェクト構造

\`\`\`
src/
├── lib/
│   └── firebase.ts          # Firebase設定
├── store/
│   └── kanbanStore.ts       # Zustand状態管理
├── types/
│   └── index.ts             # 型定義
├── App.tsx                  # メインコンポーネント
├── Column.tsx               # カラムコンポーネント
├── Card.tsx                 # カードコンポーネント
├── Header.tsx               # ヘッダーコンポーネント
├── CardFilter.tsx           # 検索フィルターコンポーネント
├── InputForm.tsx            # 入力フォームコンポーネント
├── Button.tsx               # ボタンコンポーネント
├── GlobalStyle.tsx          # グローバルスタイル
├── color.ts                 # カラー定義
├── icon.tsx                 # アイコンコンポーネント
└── main.tsx                 # エントリーポイント
\`\`\`

## 使い方

1. **カードの追加**: 各カラムの「+」ボタンをクリック
2. **カードの並べ替え**:
   - 同じカラム内でカードをドラッグして並べ替え
   - カードを別のカードにドロップして特定の位置に配置
   - カラムの空白部分にドロップしてカラムの末尾に追加
3. **カラム間の移動**: カードをドラッグして別のカラムにドロップ
4. **カードの削除**: カードのゴミ箱アイコンをクリック
5. **カードの検索**: ヘッダーの検索ボックスにテキストを入力

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
