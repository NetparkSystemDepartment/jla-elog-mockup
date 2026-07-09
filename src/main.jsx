import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from './contexts/authContext'
import { ConfirmProvider } from './components/ConfirmDialogContext'
import { registerSW } from 'virtual:pwa-register'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

// ServiceWorkerを登録（renderより前に呼ぶ）
registerSW({
  onRegistered(registration) {
    console.log('SW登録完了:', registration)
  },
  onRegisterError(error) {
    console.error('SW登録エラー:', error)
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)