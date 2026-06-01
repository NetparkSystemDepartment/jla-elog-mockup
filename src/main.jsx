import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import React from 'react'
import ReactDOM from 'react-dom/client'

// Context API を使用する
import { AuthProvider } from './contexts/authContext';

// 1. TanStack Query から必要なものをインポート
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 2. クライアントのインスタンスを作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 画面を切り替えた時に自動で裏で再取得する機能を、
      // 開発中は邪魔になりやすいので好みでオフにする設定（任意）
      refetchOnWindowFocus: false, 
    },
  },
})

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      {/* 3. 全体を QueryClientProvider で包み、作成した queryClient を渡す */}
      <QueryClientProvider client={queryClient}>
        {/* 3. その内側に AuthProvider を配置 */}
        <AuthProvider>
          {/*これで App.jsx の中で useAuth() が正常に動くようになります */}
          <App />
        </AuthProvider>
      </QueryClientProvider>      
    </React.StrictMode>,
  )

  // ServiceWorkerを登録する
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker登録成功:', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker登録失敗:', error);
        });
    });
  }