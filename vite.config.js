import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 1. 先にbaseの値を決めて変数に代入しておく
const baseConfig = process.env.VERCEL ? '/' : '/p1/';

export default defineConfig({  
  // 2. 変数を割り当てる
  base: baseConfig,

  server: {
    proxy: {
      // ローカル開発中に `/api/...` へリクエストを送ったら、
      // 自動的にプレリリース用のAPIサーバーへ転送する設定
      '/api': {
        target: 'https://d-elog.ripcurrent.org/api/v1', // 末尾のスラッシュを削る
        changeOrigin: true,
        // フロントの「/api」を消して、ターゲットの「/api/v1」へ綺麗につなぐ設定
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },

  plugins: [
    react(),
    VitePWA({

      // 【修正】ローカルでの開発(dev)やプレビュー(preview)の時はPWAを無効化する
      // Vercelやレンタルサーバー用に本番ビルド(production)する時だけ有効になります
      disable: process.env.NODE_ENV === 'development' || !process.env.VERCEL, 
      
      //disable: false, // PWAを有効にする
      registerType: 'autoUpdate', // 新しいSWが見つかったら自動更新
      injectRegister: 'auto',     // index.htmlに自動で登録スクリプトを挿入
      
      // manifestの設定（アプリとしてインストールした時の名前や色）
      manifest: {
        name: 'Beach Patrol e-eog',
        short_name: 'e-log',
        description: 'Beach Patrol e-log Mockup',
        theme_color: '#3b82f6',      // ブラウザのツールバーなどの色
        background_color: '#ffffff', // アプリ起動時の背景色
        display: 'standalone',       // アプリ単体で動いているように見せる
        lang: 'ja',

        // 【追加】レンタルサーバー（/v2/）でも正しくインストールできるようにする設定
        start_url: baseConfig,
        scope: baseConfig,

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
  ],
})