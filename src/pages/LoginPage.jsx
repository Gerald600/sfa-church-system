import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { loginSchema, signupSchema } from '../utils/validation'
import { Shield, Coins, Hammer, Users, Lock, Mail, AlertCircle, Sun, Moon, Key, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

const roleRoutes = {
  admin: '/admin',
  treasurer: '/treasurer',
  coordinator: '/coordinator',
  member: '/dashboard',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginStep, setLoginStep] = useState('login') // 'login' | 'signup'
  
  // Registration States
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('member')
  const [successMsg, setSuccessMsg] = useState('')
  
  const navigate = useNavigate()

  // 2FA and Dark Mode states
  const [show2FA, setShow2FA] = useState(false)
  const [otp, setOtp] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sfa_dark_mode') === 'true')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('sfa_dark_mode', darkMode)
  }, [darkMode])

  const handleBack = () => {
    setLoginStep('login')
    setEmail('')
    setPassword('')
    setError('')
    setSuccessMsg('')
  }
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      setError(result.error.issues[0].message)
      toast.error(result.error.issues[0].message)
      setLoading(false)
      return
    }

    let loginEmail = email.trim()
    if (loginEmail.toLowerCase() === 'admin@sfa.com') {
      loginEmail = 'admin@sfa.org'
    }

    // If it's a phone number (i.e. does not contain '@'), lookup the email from the profiles table
    if (!loginEmail.includes('@')) {
      try {
        // Normalize phone: strip whitespace, keep leading +
        const rawDigits = loginEmail.replace(/[^0-9+]/g, '')
        const digits = loginEmail.replace(/\D/g, '')
        let phoneVariations = [loginEmail.trim(), rawDigits, digits].filter(Boolean)
        if (digits.startsWith('0') && digits.length === 10) {
          phoneVariations.push('+256' + digits.slice(1))
          phoneVariations.push('256' + digits.slice(1))
        } else if (digits.startsWith('256') && digits.length === 12) {
          phoneVariations.push('+' + digits)
          phoneVariations.push('0' + digits.slice(3))
        }

        const uniqueVariations = Array.from(new Set(phoneVariations.filter(Boolean)))
        const orFilter = uniqueVariations.map(val => `phone.eq.${val}`).join(',')

        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email')
          .or(orFilter)
          .maybeSingle()

        if (lookupError || !profile) {
          setError('No registered account found with that phone number. Please check the number or use your email address.')
          toast.error('Account lookup failed.')
          setLoading(false)
          return
        }
        
        loginEmail = profile.email
      } catch (lookupErr) {
        console.error('Phone lookup error:', lookupErr)
        setError('Error retrieving account details for this phone number.')
        toast.error('Account lookup failed.')
        setLoading(false)
        return
      }
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (signInError) {
        const errorMsg = String(signInError.message || '').toLowerCase()
        if (signInError.code === 'email_not_confirmed' || errorMsg.includes('confirm')) {
          const detailedError = 'Email not confirmed. Please check your inbox for the confirmation link, or ensure your Supabase database triggers from "supabase_schema.sql" are fully deployed to automatically confirm new staff accounts.'
          setError(detailedError)
          toast.error("Login failed: Email confirmation required.")
        } else {
          setError(signInError.message)
          toast.error(`Login failed: ${signInError.message}`)
        }
        setLoading(false)
        return
      }

      setPendingEmail(loginEmail)

      // Fetch user profile role and navigate directly to user dashboard
      const { data: { session } } = await supabase.auth.getSession()
      let userRole = 'member'
      let userProfile = null
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (!profileError && profile) {
          userRole = profile.role
          userProfile = profile
        }
      }

      if (session?.user) {
        toast.success(`Welcome back, ${userProfile?.full_name || session.user.email}!`)
        navigate(roleRoutes[userRole] ?? '/dashboard')
      }
    } catch (err) {
      console.error(err)
      setError('Login connection failed. Please check your credentials.')
      toast.error(`Connection failed: ${err.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')

    // Validate with signupSchema before hitting Supabase
    const validationResult = signupSchema.safeParse({
      fullName,
      email,
      phone: phone || '',
      password,
      role
    })

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || 'Please check the form fields.'
      setError(firstError)
      toast.error(firstError)
      setLoading(false)
      return
    }

    // Use the sanitized/transformed values from Zod
    const { fullName: cleanName, email: cleanEmail, phone: cleanPhone, password: cleanPassword, role: cleanRole } = validationResult.data

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            // Only write phone if non-empty; trigger will use NULLIF to store NULL for empty
            phone: cleanPhone || undefined,
            role: cleanRole
          }
        }
      })

      if (signUpError) {
        let errMsg = signUpError.message
        if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('rate_limit')) {
          errMsg = "Email rate limit exceeded. Please disable 'Confirm Email' in your Supabase Dashboard Auth settings to register accounts instantly without limits."
        }
        setError(errMsg)
        toast.error(`Signup failed: ${signUpError.message}`)
        setLoading(false)
        return
      }

      if (signUpData?.user) {
        setSuccessMsg('Account created successfully! You can now log in instantly.')
        toast.success('Account created successfully! Login instantly.')
        setLoginStep('login')
        setFullName('')
        setPhone('')
        setRole('member')
        setPassword('')
      }
    } catch (err) {
      console.error(err)
      setError('An unexpected error occurred during signup.')
      toast.error(`Signup failed: ${err.message || String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify2FA = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP code.')
      toast.error('Please enter a valid 6-digit OTP code.')
      return
    }
    setLoading(true)
    setError('')

    try {
      // Supabase logic (already logged in, fetch session and profile)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          toast.success("2FA Verified!")
          navigate('/dashboard')
        } else {
          toast.success(`2FA Verified! Welcome back, ${dbProfile?.full_name || session.user.email}!`)
          navigate(roleRoutes[dbProfile?.role] ?? '/dashboard')
        }
      } else {
        setError('Authentication session expired. Please log in again.')
        toast.error("Session expired.")
        setShow2FA(false)
      }
    } catch (err) {
      setError(err.message)
      toast.error(`2FA verification failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#030712] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Decorative background grid and gradients */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-200/10 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700 pointer-events-none"></div>

      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-650 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-amber-300 transition-all cursor-pointer shadow-sm"
          title="Toggle Dark Mode"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-400" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-r from-amber-400 via-indigo-500 to-indigo-600 shadow-xl border border-amber-300/40 dark:border-amber-500/30 mx-auto">
            <img src="/st_francis.png" className="w-full h-full rounded-[14px] object-cover" alt="Saint Francis of Assisi" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          St. Francis of Assisi
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400 font-medium">
          Church Construction Management System — Lusanja
        </p>
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
          >
            <span>Return to Main Church Website</span>
          </button>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4 sm:px-0">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 py-8 px-6 shadow-xl dark:shadow-2xl rounded-2xl sm:px-10">
          <AnimatePresence mode="wait">
            {show2FA ? (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/10 dark:border-indigo-500/20">
                    <Key className="w-6 h-6 text-indigo-550 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Security Verification</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Two-Factor Authentication is active. Enter the confirmation code below to verify your identity.
                  </p>
                </div>

                <form className="space-y-6" onSubmit={handleVerify2FA}>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="block w-full text-center tracking-[1em] text-xl font-bold py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-indigo-400 placeholder-slate-400 dark:placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block text-center mt-2 font-medium">
                      Enter any 6-digit code (e.g., 123456) to proceed.
                    </span>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-xl flex items-start space-x-2.5">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShow2FA(false)
                        setOtp('')
                        setError('')
                      }}
                      className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/15 cursor-pointer text-center border border-indigo-600/30"
                    >
                      {loading ? 'Verifying...' : 'Verify & Sign In'}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : loginStep === 'login' ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">Sign In</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Enter your credentials to access the church portal.
                  </p>
                  

                </div>

                <form className="space-y-4" onSubmit={handleLogin}>
                  {/* Email or Phone Number */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email or Phone Number
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="login-email-input"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="Enter email or phone number"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="login-password-input"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  {successMsg && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs px-4 py-3 rounded-xl flex items-start space-x-2.5">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-xl flex items-start space-x-2.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      id="login-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-700 hover:from-primary-500 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-primary-500 transition-all cursor-pointer shadow-primary-500/10 border border-indigo-600/30"
                    >
                      {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('signup')
                      setError('')
                      setSuccessMsg('')
                    }}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    Don't have a real account? Register as a member
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Member Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Register yourself as a congregation member to submit donations and track progress.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleSignUp}>
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="signup-fullname-input"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="Enter member's full name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="signup-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="Enter member's email address"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Phone Number
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="signup-phone-input"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="+256 700 000000"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <input
                        id="signup-password-input"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-xl flex items-start space-x-2.5">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      id="signup-submit-btn"
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 focus:ring-primary-500 transition-all cursor-pointer shadow-primary-500/10 border border-indigo-600/30"
                    >
                      {loading ? 'Creating Account...' : 'Register'}
                    </button>
                  </div>
                </form>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    Already have an account? Back to Login
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}