import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleRoutes = {
  admin: '/admin',
  treasurer: '/treasurer',
  coordinator: '/coordinator',
  member: '/dashboard',
}

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role, loading } = useAuth()

  if (loading) {
    const isDark = localStorage.getItem('sfa_dark_mode') === 'true'
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-205 ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-medium">Loading session securely...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={roleRoutes[role] ?? '/login'} replace />
  }

  return children
}

export default ProtectedRoute