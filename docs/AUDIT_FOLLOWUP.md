# 監査フォローアップ / 残タスク

最終更新: 2026-06-28

2026-06 に実施した全体監査（36件の確認済み指摘）と一連の改善作業の **残タスク** をまとめる。
**安全に自動修正できる分はすべて main にマージ済み**。本ドキュメントに残るのは
「人の判断・操作が必要」「視覚レビューが必要」な項目のみ。

関連: [ADR-001 主要依存関係のメジャー更新計画](./adr/001-major-dependency-updates-2026-h2.md) /
[Firebase CI セットアップ手順](../FIREBASE_CI_SETUP.md)

---

## ⚠️ 1. 要対応（本番反映）— Firestore ルール / インデックス

`firestore.rules`（C5 強化）と `firestore.indexes.json`（C4 の複合インデックス）は
**リポジトリには入っているが本番未反映**。`firebase-deploy` ワークフローは
認証情報（`FIREBASE_SERVICE_ACCOUNT` secret）が未設定の間は**安全にスキップ**される
（＝本番は現状維持、CI は赤バツにならない）。

反映するには、以下の **どちらか** を実施:

- **CI を有効化（推奨・恒久）**: GCP でサービスアカウント（Firebase Admin）を作成し
  JSON 鍵を GitHub の `FIREBASE_SERVICE_ACCOUNT` secret に登録。以後は
  `firestore.rules` / `firestore.indexes.json` / `.firebaserc` の変更で自動デプロイ。
  手順 → [`FIREBASE_CI_SETUP.md`](../FIREBASE_CI_SETUP.md)
- **一度だけ手動デプロイ**: ローカルの Firebase CLI（ログイン済み）で
  ```bash
  firebase deploy --only firestore:rules,firestore:indexes --project kanban-relax
  ```

> 補足: C5 で fail-open（`!('userId' in resource.data)`）を撤去したため、万一
> 本番に **userId フィールドを持たないレガシー文書** が残っていると読めなくなる。
> `create` ルールは常に userId を要求してきたため理論上は存在しないはずだが、
> 不安なら反映前に確認を。問題が出たらルールを revert して再デプロイで即復旧可能。

---

## 🎨 2. 視覚レビューが必要（コントラスト）

light モードで WCAG AA（4.5:1）未満のテキストがある。**テーマ条件付きの色調整**が
必要で、dark モードの可読性を崩さないよう実値の確認が要るため保留。

| 箇所 | 現状 | 実測 | 対応案 |
|------|------|------|--------|
| 期限バッジ/警告（`Card.tsx` / `CardDetailModal.tsx`） | `#FF9F1A`（due-soon）/ `#FF4136`（overdue） | 2.05:1 / 3.46:1 | light モードは濃いめ（amber ~`#B45309`, red ~`#C53030`）に |
| 二次テキスト（`Card.tsx` Description ほか） | トークン色 + `opacity: 0.85/0.7` | 3.89:1 / 2.84:1 | opacity 乗算をやめトークン色のみに |
| 進捗テキスト（`CardDetailModal.tsx` ProgressText） | `#AAAAAA` ハードコード | 2.32:1 | `textSecondary` トークンへ |

---

## 🤔 3. 要判断（自動修正しない）

設計判断・大きめの実装・外部仕様/インフラが絡むため、方針確定後に着手する想定。

- ~~**キーボード DnD 対応**~~ → **対応済み**（`App.tsx` に `KeyboardSensor` +
  `sortableKeyboardCoordinates` を導入済み。この記述は古い）。
- ~~**カラーピッカーの ARIA radio パターン**（`CardDetailModal.tsx`）~~ → **対応済み**。
  `role='radiogroup'` ＋ roving tabindex ＋ 矢印キー/Home/End 移動を実装。
  実ブラウザでのキーボード操作は `e2e/color-picker-a11y.spec.ts` が検証する。
- ~~**URL メタデータの外部プロキシ流出**（`urlUtils.ts`）~~ → **対応済み**（「クエリ除去・
  内部ホスト除外」を採用）。`toProxySafeUrl()` が以下を実施する:
  - プライベート/内部ホスト（localhost・RFC1918・169.254.169.254・`.local`/`.internal`/
    `.corp` 等・ドット無しのイントラネット名）は**送信しない**
  - 資格情報を運ぶ URL（`user:pass@`、`token`/`sig`/`X-Amz-*` 等のクエリ、
    フラグメントの `access_token`）は削らず**丸ごと送信しない**
  - 送る場合も `origin + pathname` のみ（クエリ・フラグメントは落とす）
  - YouTube はホスト名で判定し、プロキシを経由せず oEmbed を直接叩く

  送信内容は `urlUtils.fetch.test.ts` が fetch 実測で固定している。
  残る改善余地は自己ホストプロキシ化（公開プロキシに URL を渡すこと自体をやめる）。
- ~~**base64 画像が Firestore 1MiB 制限超過**（`CardDetailModal.tsx`）~~ →
  **暫定対応済み**。1枚 600KB / カード合計 900KB で判定するよう是正（`imageLimits.ts`）。
  従来の 5MB は base64 化（約 4/3 倍）を考慮しておらず、通せば必ず保存が失敗する値だった。
  恒久対応（Firebase Storage へ退避し URL のみ保存）は Storage 有効化が必要なため未着手。
- **Firestore ルールのフィールド/型/サイズ検証**: cross-user 分離は C5 で完了。残るは
  自分の領域内での型・サイズ検証（defense-in-depth）。
- ~~**`ai-auto-fix.yml` の再利用ワークフロー pin**~~ → **対応済み**。
  `@main`（可変）から **SHA 固定** へ変更し、`check-secrets` ジョブで
  API キー未設定時はスキップするようにした。
  SHA の更新手順はワークフロー内のコメントに記載。

---

## 📦 4. メジャー依存アップグレード（計画済み）

React 19 / TypeScript 6 / Vite 8 / Firebase 12 等は段階導入の計画あり。
詳細・順序・各フェーズの検証項目は ADR を参照:
→ [ADR-001](./adr/001-major-dependency-updates-2026-h2.md)

監査 **C9**（firebase SDK の transitive 脆弱性 = undici 等）も、個別 override せず
ADR の Firebase フェーズで本体アップグレードにより一括解消する方針。

---

## ✅ 参考: 完了済み（main マージ）

| カテゴリ | PR |
|----------|----|
| 白画面/クラッシュ系（PWAチャンク・lookbehind・認証前購読・複合インデックス・スモークCI） | #80–#83 |
| C5 Firestore ルール fail-open 撤去 + 所有権固定 | #85 |
| lockfile 一本化（pnpm） | #87 |
| Firebase deploy CI 修復（service account, .firebaserc） | #88 |
| 監査ランタイムバグ5件（useUrlMetadata 無限ループ ほか） | #89 |
| 監査 a11y コア（モーダル aria 名・フォーカス復帰・IME・focus-visible） | #90 |
| データ整合性ロジックの単体テスト 62件（計127） | #91 |
| 設定ハードニング（checkAuth DEV化・CI lint・Node/CLI pin・browserslist） | #92 |
| 監査 a11y セマンティクス（メニュー状態・説明欄キーボード・タブ/スウォッチ role） | #93 |
