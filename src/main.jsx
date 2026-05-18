import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// Context API を使用する
//import { AuthProvider } from './contexts/authContext';
// ダミー
import { AuthProvider } from './contexts/dummyAuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>)
