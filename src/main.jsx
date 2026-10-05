import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import './index.css'

// Automatically handle Vite dynamic import / chunk loading failures after new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error detected. Reloading page to fetch latest deployed assets...', event)
  window.location.reload()
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)