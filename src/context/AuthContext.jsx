import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (data) {
        setProfile(data)
        setRole(data.role)
      } else if (error) {
        console.error('Supabase profile fetch error:', error.message)
      }
    } catch (err) {
      console.warn('Supabase profile fetch exception:', err)
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (active) {
          if (session?.user) {
            setUser(session.user)
            await fetchProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
            setRole(null)
          }
        }
      } catch (err) {
        console.warn('Failed to retrieve Supabase session:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSession()

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setUser(null)
          setProfile(null)
          setRole(null)
          setLoading(false)
          toast.error("Session expired or signed out. Redirecting to login...")
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
          return
        }

        if (session?.user) {
          setUser(session.user)
          setLoading(true)
          await fetchProfile(session.user.id)
          setLoading(false)
        } else {
          setUser(null)
          setProfile(null)
          setRole(null)
          setLoading(false)
          
          const protectedRoutes = ['/admin', '/treasurer', '/coordinator', '/dashboard']
          if (protectedRoutes.some(route => window.location.pathname.startsWith(route))) {
            toast.error("Session expired. Redirecting to login...")
            setTimeout(() => {
              window.location.href = '/login'
            }, 1000)
          }
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const createUserByAdmin = async (email, password, fullName, phone, role) => {
    // Create a temporary client to sign up the new user without breaking the current admin session
    const tempSupabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    )
    
    const { data, error } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          role
        }
      }
    })
    
    if (error) throw error

    // Log administrative action
    try {
      await supabase.from('audit_logs').insert([{
        user_id: user?.id || null,
        action_type: 'Create Custom Account',
        description: JSON.stringify({
          userName: profile?.full_name || 'Admin',
          role: profile?.role || 'admin',
          details: `Created new ${role} account: "${fullName}" (${email})`
        })
      }])
    } catch (auditErr) {
      console.warn("Failed to log custom account creation:", auditErr)
    }

    return data
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Supabase signout exception:', err)
    }
    setUser(null)
    setProfile(null)
    setRole(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      role, 
      loading, 
      signOut, 
      createUserByAdmin
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)