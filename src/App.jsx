import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { AIProvider } from './context/AIContext'
import { AICopilotDrawer } from './components/ai/AICopilotDrawer'

// Helper function to auto-retry dynamic module imports after new production deployments
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('page_reloaded_for_chunk') === 'true'
    try {
      const component = await componentImport()
      sessionStorage.setItem('page_reloaded_for_chunk', 'false')
      return component
    } catch (error) {
      if (!pageHasBeenReloaded) {
        sessionStorage.setItem('page_reloaded_for_chunk', 'true')
        window.location.reload()
      }
      throw error
    }
  })

// Route-based lazy loaded pages with deployment chunk retry
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'))
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'))
const TreasurerDashboard = lazyWithRetry(() => import('./pages/TreasurerDashboard'))
const CoordinatorDashboard = lazyWithRetry(() => import('./pages/CoordinatorDashboard'))
const MemberDashboard = lazyWithRetry(() => import('./pages/MemberDashboard'))
const ConstructionOverview = lazyWithRetry(() => import('./pages/ConstructionOverview'))

// Elegant, premium cathedral-style loading screen
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800"></div>
      <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
    </div>
    <span className="mt-4 text-xs font-semibold text-slate-400 dark:text-slate-500 animate-pulse tracking-wider">
      Loading sanctuary portal...
    </span>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '13px'
          }
        }} 
      />
      <AIProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><ConstructionOverview /></ErrorBoundary>} />
            <Route path="/login" element={<ErrorBoundary><LoginPage /></ErrorBoundary>} />
            <Route path="/overview" element={<ErrorBoundary><ConstructionOverview /></ErrorBoundary>} />
            <Route path="/admin" element={
              <ProtectedRoute allowedRole="admin">
                <ErrorBoundary>
                  <AdminDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/treasurer" element={
              <ProtectedRoute allowedRole="treasurer">
                <ErrorBoundary>
                  <TreasurerDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/coordinator" element={
              <ProtectedRoute allowedRole="coordinator">
                <ErrorBoundary>
                  <CoordinatorDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRole="member">
                <ErrorBoundary>
                  <MemberDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Global Action-Oriented AI Copilot Drawer */}
        <AICopilotDrawer />
      </AIProvider>
    </ErrorBoundary>
  )
}

export default App