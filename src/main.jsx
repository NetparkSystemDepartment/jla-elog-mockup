import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import React from 'react'
import ReactDOM from 'react-dom/client'

// Context API を使用する
import { AuthProvider } from './contexts/authContext';
// ダミー
//import { AuthProvider } from './contexts/dummyAuthContext';

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

// 開発環境（npm run dev）のときだけMSWを起動する
//async function enableMocking() {
//  if (process.env.NODE_ENV !== 'development') {
//    return;
//  }
//  const { worker } = await import('./mocks/browser');
//  return worker.start({
//    // 開発に関係ないアセットファイルへのリクエスト警告を非表示にする
//    onUnhandledRequest: 'bypass', 
//    serviceWorker: {
//    // Viteのbaseパス（/p1/）に合わせてMSWを探すように指定
//    url: '/p1/mockServiceWorker.js',
//    options: {
//      scope: '/p1/',
//    },
//  },
//  });
//}

//createRoot(document.getElementById('root')).render(
//  <StrictMode>
//    <AuthProvider>
//      <App />
//    </AuthProvider>
//  </StrictMode>)

  // モックの起動が完了してから、Reactアプリをレンダリング（マウント）する
//enableMocking().then(() => {
//  ReactDOM.createRoot(document.getElementById('root')).render(
//    <React.StrictMode>
//      <App />
//    </React.StrictMode>,
//  )
//})

//enableMocking().then(() => {
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
//})
