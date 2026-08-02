import { defineConfig } from 'vitest/config'

/**
 * Firestore セキュリティルール専用の設定。
 *
 * 通常の `vitest`(vitest.config.ts)は src/ 配下だけを対象にしており、
 * こちらは Firestore エミュレータが動いている前提でしか通らないため分離する。
 * 実行は `npm run test:rules`(エミュレータの起動込み)。
 */
export default defineConfig({
    test: {
        environment: 'node',
        include: ['firestore-rules-tests/**/*.test.ts'],
        // エミュレータの起動待ちと往復があるので既定より長めに取る
        testTimeout: 20_000,
        hookTimeout: 30_000,
        // ルールは共有のエミュレータ状態を触るため直列実行する
        fileParallelism: false,
    },
})
