# Firebase MCP 使い方マニュアル

Firebase MCP (Model Context Protocol) サーバーを使用すると、Claude CodeからFirebaseの各種サービスを直接操作できます。

## 目次

1. [概要](#概要)
2. [セットアップ](#セットアップ)
3. [認証設定](#認証設定)
4. [利用可能なツール](#利用可能なツール)
5. [使用例](#使用例)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

Firebase MCPは `firebase-tools` v14.18.0以降に統合された公式機能です。

**主な機能:**
- Firestore: ドキュメントのCRUD操作、クエリ実行
- Authentication: ユーザー管理、検索
- Storage: ファイル操作、URL生成
- Cloud Messaging: プッシュ通知送信
- Security Rules: ルール検証
- Remote Config: 設定管理

---

## セットアップ

### 方法1: Claude Code プラグイン（推奨）

```bash
claude mcp add firebase -- npx -y firebase-tools@latest mcp
```

### 方法2: mcp.json で設定

`.claude/mcp.json`:

```json
{
  "mcpServers": {
    "firebase": {
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"]
    }
  }
}
```

### 設定確認

```bash
# MCPサーバー一覧を確認
claude mcp list

# 利用可能なツール一覧を確認
npx firebase-tools@latest mcp --generate-tool-list
```

---

## 認証設定

Firebase MCPを使用するには、事前にFirebase CLIで認証が必要です。

### ユーザー認証（開発環境向け）

```bash
# Firebaseにログイン
firebase login

# ログイン状態を確認
firebase login:list
```

### サービスアカウント認証（CI/本番環境向け）

1. Firebase Console → Project Settings → Service Accounts
2. 「Generate new private key」でJSONファイルをダウンロード
3. 環境変数を設定:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### プロジェクト選択

```bash
# プロジェクト一覧
firebase projects:list

# プロジェクト選択
firebase use <project-id>

# または .firebaserc で設定
```

---

## 利用可能なツール

### Firestore操作

| ツール | 説明 |
|--------|------|
| `firestore_get_document` | ドキュメント取得 |
| `firestore_list_documents` | ドキュメント一覧 |
| `firestore_add_document` | ドキュメント追加 |
| `firestore_set_document` | ドキュメント設定/上書き |
| `firestore_update_document` | ドキュメント更新 |
| `firestore_delete_document` | ドキュメント削除 |
| `firestore_query` | クエリ実行 |
| `firestore_list_collections` | コレクション一覧 |

### Authentication操作

| ツール | 説明 |
|--------|------|
| `auth_get_user` | ユーザー情報取得（UID） |
| `auth_get_user_by_email` | ユーザー情報取得（メール） |
| `auth_list_users` | ユーザー一覧 |
| `auth_set_custom_claims` | カスタムクレーム設定 |
| `auth_disable_user` | ユーザー無効化 |

### Storage操作

| ツール | 説明 |
|--------|------|
| `storage_list_files` | ファイル一覧 |
| `storage_get_file_metadata` | メタデータ取得 |
| `storage_get_download_url` | ダウンロードURL生成 |
| `storage_upload_file` | ファイルアップロード |

### その他

| ツール | 説明 |
|--------|------|
| `messaging_send` | FCM通知送信 |
| `remoteconfig_get` | Remote Config取得 |
| `remoteconfig_deploy` | Remote Configデプロイ |
| `crashlytics_list_issues` | Crashlytics課題一覧 |

---

## 使用例

### Firestoreドキュメント操作

Claude Codeで以下のように依頼:

```
cardsコレクションのドキュメント一覧を取得して
```

```
cardsコレクションに新しいドキュメントを追加して:
- text: "新しいタスク"
- columnId: "TODO"
- boardId: "default"
```

```
ドキュメントID "abc123" を削除して
```

### クエリ実行

```
cardsコレクションからcolumnIdが"Done"のドキュメントを検索して
```

### ユーザー管理

```
メールアドレス user@example.com のユーザー情報を取得して
```

```
ユーザー一覧を表示して
```

### プリセットプロンプト

Claude Codeで以下のスラッシュコマンドが使用可能:

```
/firebase:init      # Firebaseサービスのセットアップガイド
/firebase:deploy    # デプロイ実行
/firebase:consult   # Firebaseドキュメント参照
```

---

## トラブルシューティング

### 認証エラー

```
Error: Could not load the default credentials
```

**解決方法:**
```bash
firebase login
# または
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

### プロジェクト未選択エラー

```
Error: No Firebase project selected
```

**解決方法:**
```bash
firebase use <project-id>
# または firebase.json / .firebaserc を確認
```

### MCPサーバー接続エラー

```
Error: MCP server not responding
```

**解決方法:**
```bash
# firebase-toolsを最新版に更新
npm install -g firebase-tools@latest

# MCPサーバーを再追加
claude mcp remove firebase
claude mcp add firebase -- npx -y firebase-tools@latest mcp
```

### 権限エラー

```
Error: PERMISSION_DENIED
```

**解決方法:**
- Firebase Consoleでセキュリティルールを確認
- サービスアカウントの権限を確認
- IAMロールを確認（Firebase Admin, Firestore Admin等）

---

## セキュリティ注意事項

1. **サービスアカウントキーは絶対にコミットしない**
   - `.gitignore` に追加: `**/service-account*.json`

2. **最小権限の原則**
   - 必要な権限のみ付与

3. **環境別の設定**
   - 開発/本番で別プロジェクトを使用推奨

4. **セキュリティルールの検証**
   ```
   Firestoreのセキュリティルールを検証して
   ```

---

## 参考リンク

- [Firebase MCP Server 公式ドキュメント](https://firebase.google.com/docs/cli/mcp-server)
- [Firebase CLI リファレンス](https://firebase.google.com/docs/cli)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)
