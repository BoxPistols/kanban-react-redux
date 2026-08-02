#!/usr/bin/env node
/**
 * Firestore データ整備スクリプト (#103)
 *
 * 厳格ルール(`userId == request.auth.uid`)を本番反映する前に、以下を解消する:
 *   1. userId 欠落ドキュメント(boards / cards / trash)へ所有者 uid をバックフィル
 *   2. 存在しないボードを指す「孤児 boardId」カードの整理(再割当 or 削除)
 *
 * 既定は dry-run(読み取りのみ)。実際に書き込むには --apply を明示的に付ける。
 *
 * 使い方:
 *   # 認証(いずれか)
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   # または: gcloud auth application-default login
 *
 *   # 1) 現状把握(書き込みなし)
 *   node scripts/firestore-backfill.mjs
 *
 *   # 2) 所有者を指定してバックフィル内容を確認
 *   node scripts/firestore-backfill.mjs --owner <UID>
 *
 *   # 3) 実行(バックフィルのみ。孤児カードは既定で「保留」)
 *   node scripts/firestore-backfill.mjs --owner <UID> --apply
 *
 *   # 4) 孤児カードも処理する(どちらか一方を選ぶ)
 *   node scripts/firestore-backfill.mjs --owner <UID> --orphans=reassign --target-board <BOARD_ID> --apply
 *   node scripts/firestore-backfill.mjs --owner <UID> --orphans=trash --apply
 *
 * 依存: firebase-admin(未インストールなら `npx --yes firebase-admin` ではなく
 *       `npm i -D firebase-admin` 後に実行するか、`npx -p firebase-admin node ...` を使う)
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const COLLECTIONS = ['boards', 'cards', 'trash']
const ORPHAN_MODES = ['skip', 'reassign', 'trash']

function parseArgs(argv) {
    const args = { apply: false, owner: null, orphans: 'skip', targetBoard: null, project: null }
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]
        if (a === '--apply') args.apply = true
        else if (a === '--owner') args.owner = argv[++i]
        else if (a.startsWith('--owner=')) args.owner = a.slice('--owner='.length)
        else if (a === '--orphans') args.orphans = argv[++i]
        else if (a.startsWith('--orphans=')) args.orphans = a.slice('--orphans='.length)
        else if (a === '--target-board') args.targetBoard = argv[++i]
        else if (a.startsWith('--target-board=')) args.targetBoard = a.slice('--target-board='.length)
        else if (a === '--project') args.project = argv[++i]
        else if (a.startsWith('--project=')) args.project = a.slice('--project='.length)
        else if (a === '--help' || a === '-h') args.help = true
        else throw new Error(`不明な引数: ${a}`)
    }
    if (!ORPHAN_MODES.includes(args.orphans)) {
        throw new Error(`--orphans は ${ORPHAN_MODES.join(' | ')} のいずれか (指定: ${args.orphans})`)
    }
    if (args.orphans === 'reassign' && !args.targetBoard) {
        throw new Error('--orphans=reassign には --target-board <BOARD_ID> が必要')
    }
    return args
}

function defaultProjectId() {
    // .firebaserc の default を既定のプロジェクトにする(引数 --project で上書き可)
    const here = dirname(fileURLToPath(import.meta.url))
    const rc = JSON.parse(readFileSync(resolve(here, '..', '.firebaserc'), 'utf8'))
    return rc?.projects?.default ?? null
}

async function main() {
    const args = parseArgs(process.argv.slice(2))
    if (args.help) {
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0])
        return
    }

    const projectId = args.project ?? defaultProjectId()
    if (!projectId) throw new Error('プロジェクトIDを解決できません(--project で指定してください)')

    // firebase-admin はモジュラー API(サブパス export)を使う。
    // ルートの default 経由(admin.firestore())は現行バージョンでは解決できない。
    let appMod, firestoreMod
    try {
        appMod = await import('firebase-admin/app')
        firestoreMod = await import('firebase-admin/firestore')
    } catch {
        console.error('firebase-admin が見つかりません。`pnpm add -D firebase-admin` を実行してから再試行してください。')
        process.exit(1)
    }
    const { applicationDefault, initializeApp } = appMod
    const { getFirestore } = firestoreMod

    // 認証は「最初のクエリ」ではなくここで確かめる。
    // gRPC はスタブ生成を遅延させるため、認証失敗が main() の外の
    // 未処理 rejection として出てしまい、生スタックだけが表示される。
    const credential = applicationDefault()
    try {
        await credential.getAccessToken()
    } catch {
        console.error(
            [
                '',
                '認証情報が見つかりません。次のいずれかを設定してから再実行してください:',
                '',
                '  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json',
                '  # または',
                '  gcloud auth application-default login',
                '',
                'サービスアカウントの作り方は FIREBASE_CI_SETUP.md を参照(Firebase Admin ロール)。',
                'GitHub Actions から実行する場合は firestore-backfill ワークフローを使えます',
                '(FIREBASE_SERVICE_ACCOUNT secret のみで動き、鍵をローカルに置かずに済みます)。',
                '',
            ].join('\n')
        )
        process.exit(1)
    }

    initializeApp({ credential, projectId })
    const db = getFirestore()

    const mode = args.apply ? 'APPLY(書き込みます)' : 'DRY-RUN(書き込みません)'
    console.log(`\n=== Firestore backfill / project=${projectId} / ${mode} ===\n`)

    // --- 1) 全ドキュメントを読み、userId 欠落と boardId 参照を集計 ---
    const docsByCollection = {}
    for (const name of COLLECTIONS) {
        const snap = await db.collection(name).get()
        docsByCollection[name] = snap.docs
        console.log(`${name}: ${snap.size} 件`)
    }

    const boardIds = new Set(docsByCollection.boards.map((d) => d.id))
    const missingUserId = {}
    for (const name of COLLECTIONS) {
        missingUserId[name] = docsByCollection[name].filter((d) => {
            const uid = d.data().userId
            return typeof uid !== 'string' || uid.length === 0
        })
    }

    // 所有者候補(既存ドキュメントの userId 分布)。--owner 未指定時の判断材料として出す。
    const ownerCounts = new Map()
    for (const name of COLLECTIONS) {
        for (const d of docsByCollection[name]) {
            const uid = d.data().userId
            if (typeof uid === 'string' && uid) ownerCounts.set(uid, (ownerCounts.get(uid) ?? 0) + 1)
        }
    }

    const orphanCards = docsByCollection.cards.filter((d) => {
        const bid = d.data().boardId
        return typeof bid !== 'string' || bid.length === 0 || !boardIds.has(bid)
    })

    console.log('\n--- userId 欠落 ---')
    for (const name of COLLECTIONS) {
        const list = missingUserId[name]
        console.log(`${name}: ${list.length} 件`)
        for (const d of list) {
            const data = d.data()
            const label = data.name ?? data.title ?? data.text ?? '(無題)'
            console.log(`  - ${d.id} : ${String(label).slice(0, 40)}`)
        }
    }

    console.log('\n--- 既存 userId の分布(所有者の判断材料) ---')
    if (ownerCounts.size === 0) console.log('  (userId を持つドキュメントがありません)')
    for (const [uid, count] of [...ownerCounts].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${uid}: ${count} 件`)
    }

    console.log(`\n--- 孤児 boardId カード: ${orphanCards.length} 件 ---`)
    for (const d of orphanCards) {
        const data = d.data()
        console.log(`  - ${d.id} : boardId=${data.boardId ?? '(なし)'} / ${String(data.text ?? '').slice(0, 40)}`)
    }

    // --- 2) 適用計画 ---
    const totalMissing = COLLECTIONS.reduce((n, c) => n + missingUserId[c].length, 0)
    console.log('\n=== 計画 ===')
    if (totalMissing === 0) {
        console.log('userId 欠落: なし(バックフィル不要)')
    } else if (!args.owner) {
        console.log(`userId 欠落 ${totalMissing} 件。--owner <UID> を指定すると書き込み計画を表示します。`)
    } else {
        console.log(`userId 欠落 ${totalMissing} 件に userId="${args.owner}" を設定`)
    }

    if (orphanCards.length > 0) {
        if (args.orphans === 'skip') {
            console.log(`孤児カード ${orphanCards.length} 件: 保留(--orphans=reassign|trash で処理)`)
        } else if (args.orphans === 'reassign') {
            if (!boardIds.has(args.targetBoard)) {
                throw new Error(`--target-board=${args.targetBoard} は存在しないボードです`)
            }
            console.log(`孤児カード ${orphanCards.length} 件: boardId を "${args.targetBoard}" へ再割当`)
        } else {
            console.log(`孤児カード ${orphanCards.length} 件: trash コレクションへ退避して cards から削除`)
        }
    }

    if (!args.apply) {
        console.log('\nDRY-RUN のため書き込みは行いません。実行するには --apply を付けてください。\n')
        return
    }

    // --- 3) 適用(バッチは 500 件上限のため分割) ---
    const writes = []
    if (args.owner) {
        for (const name of COLLECTIONS) {
            for (const d of missingUserId[name]) {
                writes.push({ kind: 'set-userId', ref: d.ref, data: { userId: args.owner } })
            }
        }
    }
    if (orphanCards.length > 0 && args.orphans === 'reassign') {
        for (const d of orphanCards) {
            writes.push({ kind: 'reassign', ref: d.ref, data: { boardId: args.targetBoard } })
        }
    }
    if (orphanCards.length > 0 && args.orphans === 'trash') {
        for (const d of orphanCards) {
            const data = d.data()
            writes.push({
                kind: 'trash',
                ref: d.ref,
                trashRef: db.collection('trash').doc(d.id),
                trashData: {
                    ...data,
                    ...(args.owner && !data.userId ? { userId: args.owner } : {}),
                    deletedAt: Date.now(),
                    originalBoardId: data.boardId ?? '',
                    originalColumnId: data.columnId ?? 'TODO',
                },
            })
        }
    }

    if (writes.length === 0) {
        console.log('\n適用する変更はありません。\n')
        return
    }

    let applied = 0
    for (let i = 0; i < writes.length; i += 400) {
        const batch = db.batch()
        for (const w of writes.slice(i, i + 400)) {
            if (w.kind === 'trash') {
                batch.set(w.trashRef, w.trashData)
                batch.delete(w.ref)
            } else {
                batch.update(w.ref, w.data)
            }
        }
        await batch.commit()
        applied += Math.min(400, writes.length - i)
        console.log(`  コミット: ${applied}/${writes.length}`)
    }

    console.log(`\n完了: ${writes.length} 件の書き込みを適用しました。`)
    console.log('この後、Firestore の厳格ルールを反映してください(#102)。\n')
}

main().catch((error) => {
    console.error('\nエラー:', error.message)
    process.exit(1)
})
