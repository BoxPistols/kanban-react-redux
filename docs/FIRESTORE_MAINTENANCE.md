# Firestore データ整備手順 (#103 → #102)

厳格ルール(`firestore.rules`: `resource.data.userId == request.auth.uid`)を本番へ反映する前に、
**userId 欠落ドキュメント**と**孤児 boardId カード**を解消する必要がある。
反映を先にすると、userId を持たないドキュメントは誰からも読めなくなり「データが消えた」ように見える。

順序は **①バックフィル(#103) → ②ルール反映(#102)** で固定。

## ① バックフィル・孤児整理

`scripts/firestore-backfill.mjs` を使う。**既定は dry-run(読み取りのみ)**で、
`--apply` を明示的に付けたときだけ書き込む。

### 準備

```bash
npm i -D firebase-admin           # このスクリプト専用。通常のビルドには不要

# 認証(いずれか)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# または
gcloud auth application-default login
```

サービスアカウントは `FIREBASE_CI_SETUP.md` の手順で作ったもの(Firebase Admin ロール)を流用できる。

### 手順

```bash
# 1. 現状把握(書き込みなし)。userId 欠落・孤児カード・既存 userId の分布が出る
node scripts/firestore-backfill.mjs

# 2. 所有者 UID を決めて計画を確認(まだ書き込まない)
#    UID は手順1の「既存 userId の分布」で最も件数の多いものが通常の自分のアカウント
node scripts/firestore-backfill.mjs --owner <UID>

# 3. バックフィルを適用(孤児カードは既定で保留)
node scripts/firestore-backfill.mjs --owner <UID> --apply

# 4. 孤児カードを処理する(どちらか一方)
node scripts/firestore-backfill.mjs --owner <UID> --orphans=reassign --target-board <BOARD_ID> --apply
node scripts/firestore-backfill.mjs --owner <UID> --orphans=trash --apply
```

`--orphans` の選択:

| モード | 挙動 | 使いどころ |
| --- | --- | --- |
| `skip`(既定) | 一覧表示のみ | まず中身を見て判断したい |
| `reassign` | `boardId` を既存ボードへ付け替え | カードを残したい |
| `trash` | `trash` へ退避して `cards` から削除 | アプリのゴミ箱から復元できる状態にして片付けたい |

**破壊的操作の前に必ず手順1の一覧で件数を確認すること。** 2026-07-24 の本番実測では
userId 欠落が boards 1件 / cards 2件、孤児 boardId カードが 5件だった。

## ② ルール/インデックスの本番反映

`.github/workflows/firebase-deploy.yml` は `FIREBASE_SERVICE_ACCOUNT` secret が
**未設定だとデプロイをスキップして緑になる**。そのため repo の `firestore.rules` /
`firestore.indexes.json` は本番へ一度も反映されていない。

どちらかで反映する:

**A. CI を有効化(推奨・以後自動)**

1. `FIREBASE_CI_SETUP.md` の手順でサービスアカウント JSON を作成
2. GitHub → Settings → Secrets and variables → Actions → `FIREBASE_SERVICE_ACCOUNT` に JSON の中身を登録
3. Actions → "Deploy Firestore Rules & Indexes" → Run workflow で手動実行し、スキップ警告が出ないことを確認

**B. 手動デプロイ(単発)**

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project kanban-relax
```

`--only firestore:rules` だけだと**インデックスが永久に未反映**になるため、
必ず `firestore:rules,firestore:indexes` の両方を指定する。

## 反映後の確認

1. 本番 (https://kanban-relax.netlify.app) にログインし、ボードとカードが全件見えること
2. 別アカウントでログインし、他人のカードが見えないこと(厳格ルールが効いている)
3. 見えない場合は **Firestore REST の runQuery で実測する**。CLI のインデックス一覧だけで
   「欠落＝クエリ失敗」と断定しない(2026-07-24 に誤診した経緯あり。真因はクライアント側の
   コンテンツブロッカーによる `firestore.googleapis.com` 遮断だった)
