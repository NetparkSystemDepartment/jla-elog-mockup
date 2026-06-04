import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
    port: 5173,

    proxy: {
      '/api': {
        target: 'https://d-elog.ripcurrent.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1')
      }
    }
  },

  plugins: [
    react(),
    VitePWA({
      // ✅ 自前のsw.jsを使うモードに変更
      strategies: 'injectManifest',
      srcDir: 'src',       // sw.jsの場所
      filename: 'sw.js',   // sw.jsのファイル名

      // 開発時は無効化（元の設定を維持）
      //disable: process.env.NODE_ENV === 'development' || !process.env.VERCEL,
      // テスト中は一時的にこれに変更
      disable: false,

      registerType: 'autoUpdate',
      injectRegister: 'auto',

      injectManifest: {
        // sw.js内でprecacheリストを使わない場合は注入を無効化
        injectionPoint: undefined,
      },

      manifest: {
        name: 'Beach Patrol e-eog',
        short_name: 'e-log',
        description: 'Beach Patrol e-log Mockup',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'ja',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },

      // ✅ injectManifest モードでは workbox ではなく injectManifest に移動
      // workbox: は削除（injectManifestモードでは効かない）
    })
  ],
})