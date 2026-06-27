import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(async () => ({
  plugins: [
    react(),
    ...(process.env.ANALYZE
      ? [
          (await import('rollup-plugin-visualizer')).visualizer({
            filename: './dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      // Web manifest は public/manifest.json を単一ソースとして使う(index.html が参照)。
      // VitePWA に manifest を生成させると 2 つ目の <link rel="manifest"> が注入されて
      // 重複し、さらに存在しない icon-192/512.png を参照して 404 になっていた(監査C6)。
      manifest: false,
      includeAssets: ['robots.txt', 'apple-touch-icon.png', 'favicon.svg', 'manifest.json'],
      workbox: {
        cleanupOutdatedCaches: true,
        // NOTE: skipWaiting / clientsClaim を有効にすると、デプロイ中に新SWが
        // 開いている旧タブを即時奪取し旧ビルドの precache を破棄する。旧タブが
        // lazy chunk（カード詳細/ゴミ箱/列管理モーダル）を後から import すると
        // 404 → ChunkLoadError でアプリ全体がクラッシュ（白画面と同クラス）。
        // 既定（false）に戻し、新SWは全旧タブが閉じるまで待機させる。
        // → 開いているセッションは旧チャンクを引き続き取得でき、次回フルリロードで更新。
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          // Keep React, ReactDOM and React-internals-dependent libs (@dnd-kit)
          // in ONE chunk. Splitting @dnd-kit into its own chunk caused a
          // production-only crash: @dnd-kit reads
          // ReactDOM.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
          // (unstable_batchedUpdates) at module-eval time and got `undefined`
          // when react-dom lived in a separate chunk (init-order/circular),
          // throwing before render → white screen.
          vendor: [
            'react',
            'react-dom',
            '@dnd-kit/core',
            '@dnd-kit/sortable',
            '@dnd-kit/utilities',
            'zustand',
            'styled-components',
          ],
        }
      }
    }
  }
}))
