import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo)
    const errorMsg = error?.message || String(error)
    if (
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module')
    ) {
      const reloadKey = 'chunk_reload_' + window.location.pathname
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true')
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const isDark = localStorage.getItem('sfa_dark_mode') === 'true'
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Component Failure</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">An unexpected rendering error occurred</p>
              </div>
            </div>

            <div className="p-4 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500 block">Error details:</span>
              <p className="text-xs text-rose-600 dark:text-rose-300 font-semibold font-mono leading-relaxed break-all">
                {this.state.error?.message || String(this.state.error)}
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/15 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
