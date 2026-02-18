import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 新しいSWが見つかったら自動更新
      injectRegister: 'auto',     // index.htmlに自動で登録スクリプトを挿入
      
      // manifestの設定（アプリとしてインストールした時の名前や色）
      manifest: {
        name: 'JLA e-eog',
        short_name: 'e-log',
        description: 'JLA e-log Mockup',
        theme_color: '#3b82f6',      // ブラウザのツールバーなどの色
        background_color: '#ffffff', // アプリ起動時の背景色
        display: 'standalone',       // アプリ単体で動いているように見せる（重要！）
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
            purpose: 'any maskable' // OSに合わせて形が変わる設定
          }
        ]
      },

      // キャッシュ戦略などの詳細設定が必要な場合はここに追記
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // キャッシュ対象
      },
    })
  ]
})