# Firebase CI/CD セットアップ手順

## 1. Firebase CI Token の取得

ターミナルで以下のコマンドを実行:

```bash
firebase login:ci
```

ブラウザが開くのでログインし、生成されたトークンをコピー

## 2. GitHub Secrets に登録

1. GitHubリポジトリページを開く
2. Settings → Secrets and variables → Actions
3. "New repository secret" をクリック
4. Name: `FIREBASE_TOKEN`
5. Secret: 先ほどコピーしたトークンを貼り付け
6. "Add secret" をクリック

## 3. 自動デプロイの動作

以下のファイルが変更されると、自動的にFirebaseルールがデプロイされます:
- `firestore.rules`
- `firestore.indexes.json`

## 4. デプロイ状況の確認

- GitHub Actions タブでワークフローの実行状況を確認
- 失敗した場合はログを確認

## 注意事項

- `FIREBASE_TOKEN`は絶対に公開しないこと
- トークンが漏洩した場合は `firebase logout --token <TOKEN>` で無効化
- 定期的にトークンを再生成することを推奨
