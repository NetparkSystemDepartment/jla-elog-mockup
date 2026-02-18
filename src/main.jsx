import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'


async function prepareApp() {
  // Vite環境での「開発中」フラグ
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    return worker.start({
      onUnhandledRequest: 'bypass', // 定義していないAPIはスルーする設定
    })
  }
}

prepareApp().then(() => {
  // ここに既存のレンダリングコード
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
})