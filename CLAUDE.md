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
