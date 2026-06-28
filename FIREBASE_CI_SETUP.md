# Firebase CI/CD セットアップ手順

Firestore のセキュリティルール（`firestore.rules`）と複合インデックス
（`firestore.indexes.json`）を、`main` への push 時に自動デプロイするための設定。

> ⚠️ **重要:** `FIREBASE_SERVICE_ACCOUNT` secret を設定するまで、デプロイは
> **スキップ**されます（ワークフローは警告付きで成功扱い）。設定が完了するまで
> ルール/インデックスの変更は**本番に反映されません**。
> 既存の変更を今すぐ反映したい場合は、後述の「手動デプロイ」を実行してください。

## 1. サービスアカウントの作成

`firebase login:ci` のトークン方式は Google が非推奨化したため、
**サービスアカウント**を使う。

1. [Google Cloud Console](https://console.cloud.google.com/) で対象プロジェクト
   （`kanban-relax`）を開く
2. IAM と管理 → サービスアカウント → 「サービスアカウントを作成」
3. ロールに **Firebase Admin**（または最小権限なら
   `Cloud Datastore Index Admin` + `Firebase Rules Admin`）を付与
4. 作成したサービスアカウント → キー → 「鍵を追加」→ JSON を作成しダウンロード

## 2. GitHub Secrets に登録

1. GitHub リポジトリ → Settings → Secrets and variables → Actions
2. "New repository secret"
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Secret: ダウンロードした **JSON の中身をそのまま**貼り付け
5. "Add secret"

## 3. 自動デプロイの動作

以下のファイルが `main` で変更されると自動デプロイされる:

- `firestore.rules`
- `firestore.indexes.json`
- `.firebaserc`
- `.github/workflows/firebase-deploy.yml`

`workflow_dispatch` でも手動実行可能。

## 4. 手動デプロイ（初回反映 / 緊急時）

ローカルに Firebase CLI とログイン済み環境があれば:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project kanban-relax
```

## 5. デプロイ状況の確認

- GitHub Actions タブでワークフローの実行状況を確認
- secret 未設定の場合は「Check credentials」ステップに警告が出てスキップされる

## 注意事項

- `FIREBASE_SERVICE_ACCOUNT`（JSON 鍵）は絶対に公開しないこと
- 鍵が漏洩した場合は Google Cloud Console から該当鍵を無効化し、再発行する
- プロジェクト ID（`kanban-relax`）は `.firebaserc` の default で固定
