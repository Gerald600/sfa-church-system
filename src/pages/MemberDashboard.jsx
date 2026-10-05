import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '../supabaseClient'
import { 
  useProfiles, usePhases, useContributions, useEvents, useAnnouncements, useDocuments, usePhasePhotos, useFeedback, usePledges,
  useCreateContribution, useCreateFeedback,
  usePaymentDetails, useCommittee
} from '../hooks/useData'
import { 
  LayoutDashboard, Coins, Hammer, FileText, 
  Activity, Sun, Moon, LogOut, Plus, Check, X, Menu,
  AlertTriangle, AlertCircle, Bell, ClipboardList, 
  BookOpen, Share2, FileCheck, Landmark, MessageSquare,
  Search, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Download,
  Shield, Copy, Megaphone
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { feedbackSchema, contributionSchema } from '../utils/validation'
import DailyVerse from '../components/DailyVerse'
import GlobalBudgetOverview from '../components/GlobalBudgetOverview'
import AdBannerWidget, { SponsoredAnnouncementsWidget, ParishDirectoryView } from '../components/dashboard/member/AdBannerWidget'
import { 
  Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie
} from 'recharts'

export default function MemberDashboard() {
  const { user, profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sfa_dark_mode') === 'true')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => {
    const mockSession = localStorage.getItem('sfa_mock_session')
    const email = mockSession ? JSON.parse(mockSession).email : ''
    return localStorage.getItem(`sfa_2fa_user_enabled_${email}`) === 'true'
  })

  useEffect(() => {
    if (profile?.email) {
      setTwoFactorEnabled(localStorage.getItem(`sfa_2fa_user_enabled_${profile.email}`) === 'true')
    }
  }, [profile])

  // React Query data hooks
  const { data: profiles = {}, isLoading: profilesLoading } = useProfiles()
  const { data: phases = [], isLoading: phasesLoading } = usePhases()
  const { data: allContributions = [], isLoading: contribsLoading } = useContributions()
  const { data: events = [] } = useEvents()
  const { data: announcements = [] } = useAnnouncements()
  const { data: documents = [] } = useDocuments()
  const { data: phasePhotos = [] } = usePhasePhotos()
  const { data: pledges = [] } = usePledges()
  const { data: allFeedback = [] } = useFeedback()
  const { data: paymentDetails = [] } = usePaymentDetails()
  const { data: committee = [] } = useCommittee()

  // Selectors for personal data
  const contributions = useMemo(() => {
    return allContributions.filter(c => c.userId === profile?.id)
  }, [allContributions, profile?.id])

  const myPledges = useMemo(() => {
    return pledges.filter(p => p.userId === profile?.id || p.userName === profile?.full_name)
  }, [pledges, profile?.id, profile?.full_name])

  const feedback = useMemo(() => {
    return allFeedback.filter(f => f.member_id === profile?.id)
  }, [allFeedback, profile?.id])

  // React Query mutations
  const createContributionMutation = useCreateContribution()
  const createFeedbackMutation = useCreateFeedback()

  // Interaction states
  const [receiptToShow, setReceiptToShow] = useState(null)
  const [expandedPhaseId, setExpandedPhaseId] = useState(null)
  const [selectedDocCategory, setSelectedDocCategory] = useState('all')
  const [eventReportToShow, setEventReportToShow] = useState(null)
  const [toast, setToast] = useState(null)
  
  // Payment Form states
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    purposeType: 'phase', // phase or event
    purposeName: 'Roofing & Trussing',
    method: 'Mobile Money',
    reference: '',
    screenshotUrl: ''
  })
  
  const [paymentSuccess, setPaymentSuccess] = useState('')

  // Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({ subject: '', message: '' })
  const [feedbackErrors, setFeedbackErrors] = useState(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState('')

  // Ledger state
  const [ledgerSearch, setLedgerSearch] = useState('')
  const [ledgerPage, setLedgerPage] = useState(1)

  // Photo Carousel State (mapped by phaseId -> active index)
  const [carouselIndices, setCarouselIndices] = useState({})

  // Lightbox State
  const [lightboxPhotos, setLightboxPhotos] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [lightboxZoom, setLightboxZoom] = useState(1)
  
  // Inline Document Preview State
  const [previewDoc, setPreviewDoc] = useState(null)

  // Carousel controls
  const handlePrevSlide = (phaseId, count) => {
    setCarouselIndices(prev => ({
      ...prev,
      [phaseId]: (prev[phaseId] || 0) === 0 ? count - 1 : (prev[phaseId] || 0) - 1
    }))
  }

  const handleNextSlide = (phaseId, count) => {
    setCarouselIndices(prev => ({
      ...prev,
      [phaseId]: ((prev[phaseId] || 0) + 1) % count
    }))
  }

  // Lightbox controls
  const handleOpenLightbox = (photos, index) => {
    setLightboxPhotos(photos)
    setLightboxIndex(index)
    setLightboxZoom(1)
  }

  const handleCloseLightbox = () => {
    setLightboxPhotos(null)
    setLightboxIndex(0)
    setLightboxZoom(1)
  }

  const handlePrevLightbox = () => {
    if (!lightboxPhotos) return
    setLightboxIndex(prev => (prev === 0 ? lightboxPhotos.length - 1 : prev - 1))
    setLightboxZoom(1)
  }

  const handleNextLightbox = () => {
    if (!lightboxPhotos) return
    setLightboxIndex(prev => (prev + 1) % lightboxPhotos.length)
    setLightboxZoom(1)
  }
  
  // Load database - maps to invalidateQueries
  const loadData = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])

  // Handle receipt image file change and convert to base64
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setToast({
          type: 'info',
          message: 'File is too large. Please select an image under 2MB.'
        })
        setTimeout(() => setToast(null), 5000)
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setPaymentForm(prev => ({
          ...prev,
          screenshotUrl: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle direct download of receipts/reports as PDF using html2pdf
  const handleDownloadPDF = async (elementId, filename) => {
    try {
      setToast({
        type: 'info',
        message: 'Generating PDF. Please wait...'
      })
      setTimeout(() => setToast(null), 3000)

      // Load html2pdf dynamically from CDN
      const html2pdf = await new Promise((resolve, reject) => {
        if (window.html2pdf) {
          resolve(window.html2pdf)
          return
        }
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        script.onload = () => resolve(window.html2pdf)
        script.onerror = () => reject(new Error("Failed to load PDF generation library."))
        document.body.appendChild(script)
      })

      const element = document.getElementById(elementId)
      if (!element) {
        setToast({
          type: 'info',
          message: 'Error: Receipt/Report view element not found.'
        })
        setTimeout(() => setToast(null), 4000)
        return
      }

      // Hide close button & print buttons for the PDF capture, and force print dimensions + light-theme overrides
      const style = document.createElement('style')
      style.innerHTML = `
        #${elementId} button, 
        #${elementId} .print\\:hidden, 
        #${elementId} [class*="print:hidden"] { 
          display: none !important; 
        }
        #${elementId} {
          box-shadow: none !important;
          border: none !important;
          width: 580px !important;
          max-width: 580px !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-radius: 12px !important;
          padding: 24px !important;
        }
        /* Override inherited dark mode colors inside PDF */
        #${elementId} * {
          color: #0f172a !important;
          border-color: #e2e8f0 !important;
        }
        /* Specific overrides for text color accents */
        #${elementId} .text-indigo-600, #${elementId} .text-indigo-655 {
          color: #4f46e5 !important;
        }
        #${elementId} .text-emerald-600, #${elementId} .text-emerald-750, #${elementId} .text-emerald-700, #${elementId} .text-emerald-650 {
          color: #059669 !important;
        }
        #${elementId} .text-rose-500 {
          color: #e11d48 !important;
        }
        #${elementId} .text-slate-400, #${elementId} .text-slate-500 {
          color: #64748b !important;
        }
        /* Background accents */
        #${elementId} .bg-slate-50 {
          background-color: #f8fafc !important;
        }
        #${elementId} .bg-emerald-50, #${elementId} .bg-emerald-50\\/50 {
          background-color: #ecfdf5 !important;
        }
        #${elementId} .bg-emerald-500\\/10 {
          background-color: rgba(16, 185, 129, 0.1) !important;
        }
        #${elementId} .bg-indigo-50\\/50 {
          background-color: #f5f3ff !important;
        }
        #${elementId} .bg-indigo-500 {
          background-color: #6366f1 !important;
        }
        #${elementId} .bg-slate-100 {
          background-color: #f1f5f9 !important;
        }
      `
      element.appendChild(style)

      const opt = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
          background: '#ffffff'
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      }

      const pdfBlob = await html2pdf().set(opt).from(element).toPdf().output('blob')
      style.remove()
      
      const blobUrl = URL.createObjectURL(pdfBlob)

      // Trigger automatic save/download to store it to the device
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Open in a new tab for immediate viewing on device
      const viewWindow = window.open(blobUrl, '_blank')
      if (viewWindow) {
        setToast({
          type: 'info',
          message: 'PDF stored to device and opened for viewing!'
        })
      } else {
        setToast({
          type: 'info',
          message: 'PDF saved to device! Check your downloads.'
        })
      }
      setTimeout(() => setToast(null), 5000)
    } catch (err) {
      console.error("PDF generation failed:", err)
      setToast({
        type: 'info',
        message: `PDF generation failed: ${err.message}`
      })
      setTimeout(() => setToast(null), 5000)
    }
  }

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Submit payment form
  const handlePaymentSubmit = (e) => {
    e.preventDefault()
    setPaymentSuccess('')

    // Validate with Zod
    const validationResult = contributionSchema.safeParse({
      amount: paymentForm.amount,
      purposeType: paymentForm.purposeType,
      purposeName: paymentForm.purposeName,
      method: paymentForm.method,
      reference: paymentForm.reference
    })

    if (!validationResult.success) {
      const errorMsg = validationResult.error.issues.map(i => i.message).join(', ')
      setToast({
        type: 'info',
        message: `Validation Error: ${errorMsg}`
      })
      setTimeout(() => setToast(null), 5000)
      return
    }

    const validatedData = validationResult.data
    
    const newTxn = {
      userId: profile.id,
      userName: profile.full_name,
      amount: validatedData.amount,
      purposeType: validatedData.purposeType,
      purposeName: validatedData.purposeName,
      method: validatedData.method,
      reference: validatedData.reference,
      date: new Date().toISOString(),
      status: 'Pending',
      screenshotUrl: paymentForm.screenshotUrl
    }

    createContributionMutation.mutate({
      contribution: newTxn,
      user
    }, {
      onSuccess: () => {
        // Simulate WhatsApp notification dispatch
        setToast({
          type: 'whatsapp',
          message: `WhatsApp alert sent to ${profile.phone || '+256 703 111222'}: "Reference ${validatedData.reference} for ${validatedData.purposeName} of ${formatUGX(validatedData.amount)} logged successfully. Verification pending."`
        })

        setPaymentSuccess(`Payment reference submitted successfully! Awaiting Treasurer verification.`)
        setPaymentForm({
          amount: '',
          purposeType: 'phase',
          purposeName: phases[0]?.name || 'Roofing & Trussing',
          method: 'Mobile Money',
          reference: '',
          screenshotUrl: ''
        })

        setTimeout(() => {
          setPaymentSuccess('')
          setToast(null)
        }, 6000)
      }
    })
  }

  // Submit feedback or question form
  const handleFeedbackSubmit = (e) => {
    e.preventDefault()
    setFeedbackErrors(null)
    setFeedbackSuccess('')

    const validationResult = feedbackSchema.safeParse(feedbackForm)
    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setFeedbackErrors(formattedErrors)
      return
    }

    const validatedData = validationResult.data
    const newFb = {
      member_id: profile.id,
      memberName: profile.full_name,
      subject: validatedData.subject,
      message: validatedData.message,
      reply_message: null,
      replied_by: null,
      status: 'Pending'
    }

    createFeedbackMutation.mutate({
      feedback: newFb,
      user
    }, {
      onSuccess: () => {
        // Log feedback audit log in Supabase
        supabase.from('audit_logs').insert([{
          user_id: profile.id,
          action_type: 'Submit Feedback',
          description: JSON.stringify({
            userName: profile.full_name,
            role: 'member',
            details: `Submitted feedback subject: "${validatedData.subject}"`
          })
        }]).then(() => {
          queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
        })

        setFeedbackSuccess('Your feedback has been submitted successfully to the building committee!')
        setFeedbackForm({ subject: '', message: '' })
        
        setTimeout(() => {
          setFeedbackSuccess('')
        }, 5000)
      }
    })
  }

  // Handle re-submitting rejected contribution
  const handleResubmit = (txn) => {
    setPaymentForm({
      amount: txn.amount.toString(),
      purposeType: txn.purposeType,
      purposeName: txn.purposeName,
      method: txn.method,
      reference: txn.reference,
      screenshotUrl: txn.screenshotUrl
    })
    
    // We try to delete the old rejected contribution in Supabase.
    // Note that because of RLS, this will fail for non-admins, but we catch it silently.
    // The user will still be able to submit their corrected transaction as a new entry.
    supabase
      .from('contributions')
      .delete()
      .eq('id', txn.id)
      .then(({ error }) => {
        if (error) {
          console.warn("Could not delete rejected contribution due to security policy (expected for members).", error.message)
        }
        queryClient.invalidateQueries({ queryKey: ['contributions'] })
      })

    setActiveTab('contribute')
  }

  // Handle direct donate button click
  const handleDirectDonate = (category, name) => {
    setPaymentForm({
      amount: '',
      purposeType: category,
      purposeName: name,
      method: 'Mobile Money',
      reference: '',
      screenshotUrl: ''
    })
    setActiveTab('contribute')
  }

  const handleToggle2FA = () => {
    const newValue = !twoFactorEnabled
    setTwoFactorEnabled(newValue)
    if (profile?.email) {
      localStorage.setItem(`sfa_2fa_user_enabled_${profile.email}`, String(newValue))
      
      // Log this action to the audit logs in Supabase
      supabase.from('audit_logs').insert([{
        user_id: profile.id,
        action_type: 'Toggle Personal 2FA',
        description: JSON.stringify({
          userName: profile.full_name,
          role: 'member',
          details: `${newValue ? 'Enabled' : 'Disabled'} personal Two-Factor Authentication (2FA)`
        })
      }]).then(() => {
        queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
      })
      
      setToast({
        type: 'info',
        message: `Two-Factor Authentication has been successfully ${newValue ? 'enabled' : 'disabled'} for your account.`
      })
      setTimeout(() => setToast(null), 4000)
    }
  }

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Totals calculations wrapped in useMemo for performance
  const approvedTx = useMemo(() => contributions.filter(c => c.status === 'Approved'), [contributions])
  const myTotalPaid = useMemo(() => approvedTx.reduce((sum, c) => sum + c.amount, 0), [approvedTx])
  const pendingTx = useMemo(() => contributions.filter(c => c.status === 'Pending'), [contributions])
  const rejectedTx = useMemo(() => contributions.filter(c => c.status === 'Rejected'), [contributions])

  // Financial statistics overview for transparency
  const grandTotalBOQ = 750825000 // 750,825,000 UGX
  const contingencyBOQ = 18532000 // 18,532,000 UGX
  const vatBOQ = 114533000 // 114,533,000 UGX
  const totalPhaseBudget = useMemo(() => phases.reduce((sum, p) => sum + (p.boqBudget || p.budget || 0), 0), [phases])
  const totalPhaseCollected = useMemo(() => phases.reduce((sum, p) => sum + (p.amountCollected || 0), 0), [phases])
  const totalPhaseSpent = useMemo(() => phases.reduce((sum, p) => sum + (p.amountSpent || 0), 0), [phases])



  // Document categories label mapping
  const docCategoryLabels = {
    all: 'All Files',
    plans: 'Architectural Plans',
    drawings: 'Engineering Drawings',
    layouts: 'Building Layouts',
    construction_budget: 'Construction Budget',
    phase_budget: 'Phase Budgets',
    committees: 'Committees',
    contractors: 'Contractor Info',
    timeline: 'Timeline & Plan',
    minutes: 'Meeting Minutes',
    approvals: 'Approvals',
    contracts: 'Contracts',
    quotations: 'Quotations',
    invoices: 'Invoices',
    construction_updates: 'Construction Updates',
    funding: 'Funding Forecasts'
  }

  // Committee list data
  const committeeMembers = [
    { name: 'Rev. Fr. Joseph Mukasa', role: 'Committee Chairperson', responsibility: 'Spiritual direction and overall project signoff', phone: '+256 701 234567' },
    { name: 'Dr. Sarah Nakato', role: 'Treasurer General', responsibility: 'Funds collection, banking, audits & disbursements', phone: '+256 772 987654' },
    { name: 'Eng. John Baptist Lule', role: 'Technical Coordinator', responsibility: 'Engineering designs supervisor and site contractor evaluations', phone: '+256 754 555666' },
    { name: 'Deacon Charles Mugisha', role: 'Logistics Supervisor', responsibility: 'Material requests receipting and youth volunteers mobilization', phone: '+256 703 111222' },
    { name: 'Mrs. Florence Nsubuga', role: 'Welfare Coordinator', responsibility: 'Catering and welfare of workers during workdays', phone: '+256 772 444333' }
  ]

  // Contractor / Supplier Directory
  const supplierDirectory = [
    { name: 'Atlas Engineering Ltd', contact: 'Moses Ssewankambo (Director)', phone: '+256 705 999888', specialty: 'Excavation & Structural Works' },
    { name: 'Sanyu Builders crew', contact: 'Robert Kibirige (Foreman)', phone: '+256 782 555111', specialty: 'Masonry & Walling Work' },
    { name: 'Steel Roof Specialists Ug', contact: 'Alex Kamya (Engineer)', phone: '+256 773 111999', specialty: 'Truss Fabrication & Roofing' },
    { name: 'Lusanja Plumbers Ltd', contact: 'Charles Lwanga (Lead)', phone: '+256 752 333444', specialty: 'Plumbing & Drainage Supply' },
    { name: 'Spark Techs Uganda', contact: 'Peter Mukasa (Electrician)', phone: '+256 701 555222', specialty: 'Conduits & Lighting Wiring' }
  ]

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-200">
      
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-25 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 z-30 lg:relative lg:translate-x-0 lg:flex h-full flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 rounded-xl object-cover shadow-md" alt="SFA Logo" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">SFA Church</h2>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Member Portal</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'dashboard' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>My Dashboard</span>
            </button>

            <button 
              onClick={() => { setActiveTab('phases'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'phases' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Hammer className="w-5 h-5" />
              <span>Phases & Progress</span>
            </button>

            <button 
              onClick={() => { setActiveTab('contribute'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'contribute' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Submit Contribution</span>
            </button>

            <button 
              onClick={() => { setActiveTab('receipts'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'receipts' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5" />
                <span>My Receipts</span>
              </div>
              {rejectedTx.length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {rejectedTx.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('transparency'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'transparency' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Events & Portal</span>
            </button>

            <button 
              onClick={() => {
                setActiveTab('ledger')
                setLedgerPage(1)
                setLedgerSearch('')
                setMobileMenuOpen(false)
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'ledger' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Landmark className="w-5 h-5" />
              <span>Global Ledger</span>
            </button>

            <button 
              onClick={() => { setActiveTab('feedback'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'feedback' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Feedback & Questions</span>
            </button>

            <button 
              onClick={() => { setActiveTab('infocenter'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'infocenter' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Information Center</span>
            </button>

            <button 
              onClick={() => { setActiveTab('directory'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'directory' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Megaphone className="w-5 h-5" />
              <span>Business Directory</span>
            </button>

            <button 
              onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold ${
                activeTab === 'security' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Security Settings</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              MB
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-none truncate">{profile?.full_name}</p>
              <span className="text-[10px] text-emerald-500 font-semibold dark:text-emerald-400">Church Member</span>
            </div>
          </div>

          <button 
            onClick={() => { signOut(); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-red-500/30 dark:hover:border-red-500/20 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-sm font-medium rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 capitalize truncate">
              {activeTab === 'infocenter' ? 'Transparency Information Center' : 
               activeTab === 'transparency' ? 'Fundraising Events Transparency Portal' : 
               activeTab === 'phases' ? 'Construction Phase Management' : 
               activeTab === 'ledger' ? 'Global Contributions Ledger' :
               activeTab === 'feedback' ? 'Feedback & Questions Hub' :
               activeTab === 'directory' ? 'Parish Business Directory & Marketplace' :
               activeTab === 'security' ? 'Security Settings' :
               `${activeTab} Panel`}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-750 hidden sm:inline-block">
              Donor Gate
            </span>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in">

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
              {/* Daily Bread: Generosity Scripture Engine */}
              <DailyVerse
                onContributeClick={() => {
                  setActiveTab('contribute')
                  // Ensure focus jumps to the contribute section
                  setTimeout(() => {
                    const el = document.getElementById('contribute-section')
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 120)
                }}
              />

              {/* Verified Church Partner & Sponsor Visual Banner Carousel */}
              <AdBannerWidget placement="dashboard" />

              {!twoFactorEnabled && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 animate-fade-in shadow-md shadow-indigo-500/5">
                  <div className="flex items-center space-x-4">
                    <Shield className="w-10 h-10 flex-shrink-0 text-indigo-500" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white">Security Recommendation</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Protect your congregation member account with Two-Factor Authentication (2FA). Set it up now to secure your contribution history.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer shrink-0"
                  >
                    Set Up 2FA
                  </button>
                </div>
              )}

              {/* Personal Contributions Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-indigo-500/10 rounded-2xl">
                    <Coins className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">My Total Contributed</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatUGX(myTotalPaid)}</h3>
                    <span className="text-[10px] text-emerald-500 font-semibold block mt-1">Verified Receipts Available</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-amber-500/10 rounded-2xl">
                    <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pending Verifications</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {pendingTx.length} Transactions
                    </h3>
                    <span className="text-[10px] text-slate-400 block mt-1">Awaiting Treasurer signoff</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-rose-500/10 rounded-2xl">
                    <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Clarifications Needed</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {rejectedTx.length} Flagged
                    </h3>
                    <span className="text-[10px] text-rose-500 font-semibold block mt-1">Action Required</span>
                  </div>
                </div>
              </div>

              {/* Action warnings if rejected */}
              {rejectedTx.map(txn => (
                <div key={txn.id} className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <AlertTriangle className="w-10 h-10 flex-shrink-0 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Clarification Requested by Treasurer!</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
                        Transaction reference <strong className="font-mono">{txn.reference}</strong> of {formatUGX(txn.amount)} was rejected: <strong className="italic">"{txn.clarificationNote}"</strong>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleResubmit(txn)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
                  >
                    Resolve & Re-Submit
                  </button>
                </div>
              ))}

              <GlobalBudgetOverview />

              {/* Building Committee Widget */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Building Committee</h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-semibold">Leadership overseeing project execution and transparency</p>
                  </div>
                  <span className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/20">
                    {committee.filter(m => m.isActive).length} Members
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {committee.filter(m => m.isActive).map(member => (
                    <div key={member.id} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-105 dark:border-slate-800 flex items-center space-x-3 text-xs font-semibold">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {member.fullName.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-slate-800 dark:text-slate-200 truncate" title={member.fullName}>{member.fullName}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-450 truncate">{member.roleTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Announcements feed & Construction Progress */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Announcements */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    <span>Church Project Announcements & Updates</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {announcements.map(ann => (
                      <div key={ann.id} className="p-4 border border-slate-105 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                          <span>{ann.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ann.date}</span>
                        </div>
                        <p className="text-slate-650 dark:text-slate-400 leading-relaxed">{ann.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Sponsored Community Announcements & Classifieds */}
                  <SponsoredAnnouncementsWidget placement="announcements" />
                </div>

                <div className="space-y-6">
                  {/* My Active Pledges */}
                  <div className="glass-card bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 text-xs border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <ClipboardList className="w-5 h-5 text-indigo-500" />
                      <span>My Active Pledges</span>
                    </h4>
                    
                    {pledges.length === 0 ? (
                      <p className="text-slate-400 font-semibold text-center py-2">No active pledges registered.</p>
                    ) : (
                      <div className="space-y-4">
                        {pledges.map(p => {
                          const progressPercent = Math.min(Math.round((p.amountPaid / p.amount) * 100), 100)
                          return (
                            <div key={p.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                              <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                                <span>{p.purpose}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                                  p.status === 'Completed' 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                }`}>
                                  {p.status}
                                </span>
                              </div>
                              
                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-500" 
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>

                              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                                <span>Paid: {formatUGX(p.amountPaid)} / {formatUGX(p.amount)}</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
                              </div>

                              {p.status !== 'Completed' && (
                                <div className="pt-1 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 mt-2">
                                  <span className="text-[9px] font-mono text-slate-400">Due: {p.targetDate}</span>
                                  <button
                                    onClick={() => handleDirectDonate('phase', p.purpose)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                                  >
                                    Pay towards Pledge
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quick Documents Preview */}
                  <div className="glass-card bg-white dark:bg-slate-900 rounded-2xl p-6 space-y-4 text-xs border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-indigo-500" />
                      <span>Transcripts & Drawings</span>
                    </h4>
                    <div className="space-y-3">
                      {documents.slice(0, 3).map(doc => (
                        <div key={doc.id} className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center space-x-3 bg-white dark:bg-slate-950/40">
                          <FileText className="w-5 h-5 text-sky-500 flex-shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-850 dark:text-slate-200 truncate">{doc.title}</p>
                            <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-0.5">{docCategoryLabels[doc.category]}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: PHASES & PROGRESS */}
          {activeTab === 'phases' && (
            <div className="space-y-6">
              {/* Financial stats of phases */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center text-xs">
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Grand BOQ Target</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1.5 block">{formatUGX(grandTotalBOQ)}</span>
                  <div className="flex justify-between text-[9px] text-slate-400 mt-1 border-t border-slate-150 dark:border-slate-800 pt-1 font-mono">
                    <span>Works: {formatUGX(totalPhaseBudget)}</span>
                    <span>VAT+Cont: {formatUGX(133065000)}</span>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Total Funds Collected</span>
                  <span className="text-xl font-bold text-emerald-500 mt-1.5 block">{formatUGX(totalPhaseCollected)}</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Total Funds Disbursed</span>
                  <span className="text-xl font-bold text-rose-500 mt-1.5 block">{formatUGX(totalPhaseSpent)}</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Remaining Fund Reserve</span>
                  <span className="text-xl font-bold text-indigo-500 mt-1.5 block">{formatUGX(totalPhaseCollected - totalPhaseSpent)}</span>
                </div>
              </div>

              {/* 12 Phases list */}
              <div className="space-y-4">
                {phases.map((p) => {
                  const isExpanded = expandedPhaseId === p.id
                  return (
                    <div 
                      key={p.id} 
                      className={`glass-card rounded-2xl p-6 border transition-all duration-300 ${
                        isExpanded ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="space-y-1 lg:max-w-md">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                            {p.name}
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                              p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                              p.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500 animate-pulse' :
                              'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {p.status}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                        </div>

                        {/* Progress Bar & Budget Overview */}
                        <div className="w-full lg:w-72 space-y-2">
                          <div className="flex justify-between text-[11px] font-bold text-slate-650 dark:text-slate-350">
                            <span>Progress</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${p.progress}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                            <span>Budget: {formatUGX(p.budget)}</span>
                            <span>Spent: {formatUGX(p.amountSpent)}</span>
                          </div>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="flex gap-2 items-center w-full lg:w-auto shrink-0 justify-end">
                          <button
                            onClick={() => handleDirectDonate('phase', p.name)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Donate to Phase</span>
                          </button>

                          <button
                            onClick={() => setExpandedPhaseId(isExpanded ? null : p.id)}
                            className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl transition-all font-bold text-xs"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Phase Details Drawer */}
                      {isExpanded && (
                        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs animate-fade-in">
                          
                          {/* Contractor and Material Details */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Contractor Details</h4>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{p.contractorName || 'Not Assigned'}</p>
                              <span className="text-slate-400">{p.contractorEmail}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Project Engineer</h4>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{p.engineerName || 'Not Assigned'}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Required Materials</h4>
                              <p className="text-slate-600 dark:text-slate-400 font-medium">{p.requiredMaterials || 'None listed'}</p>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Target Completion Date</h4>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{p.completionDate || 'N/A'}</p>
                            </div>
                          </div>

                          {/* Milestones checklist & Site Photos */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-2">Milestones Tracker</h4>
                              {(!p.milestones || p.milestones.length === 0) ? (
                                <p className="text-slate-400 italic">No milestones set for this phase.</p>
                              ) : (
                                <div className="space-y-2">
                                  {p.milestones.map((m) => (
                                    <div key={m.id} className="flex items-center space-x-2.5 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                      {m.status === 'Completed' ? (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" />
                                      )}
                                      <div className="flex-1">
                                        <p className={`font-semibold ${m.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{m.title}</p>
                                        <span className="text-[9px] text-slate-400">Target: {m.deadline}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Site Photos */}
                            <div>
                              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-2">Site Construction Photos</h4>
                              {(() => {
                                const photosForPhase = phasePhotos.filter(ph => ph.phase_id === p.id)
                                if (photosForPhase.length === 0) {
                                  return (
                                    <div className="h-32 bg-slate-100 dark:bg-slate-850 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-750">
                                      <span className="text-slate-400 text-[10px]">No site photo uploaded</span>
                                    </div>
                                  )
                                }
                                return (
                                  <div className="relative h-48 rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                                    <img 
                                      src={photosForPhase[carouselIndices[p.id] || 0]?.image_url} 
                                      alt={`${p.name} update`} 
                                      className="w-full h-full object-cover cursor-zoom-in transition-all duration-300 hover:scale-105"
                                      onClick={() => handleOpenLightbox(photosForPhase, carouselIndices[p.id] || 0)}
                                    />
                                    
                                    {photosForPhase.length > 1 && (
                                      <>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handlePrevSlide(p.id, photosForPhase.length)
                                          }}
                                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white transition-colors cursor-pointer"
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleNextSlide(p.id, photosForPhase.length)
                                          }}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white transition-colors cursor-pointer"
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                        
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                          {photosForPhase.map((_, idx) => (
                                            <div 
                                              key={idx} 
                                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                                (carouselIndices[p.id] || 0) === idx ? 'bg-white w-3' : 'bg-white/50'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Phase Updates Feed */}
                          <div>
                            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-2">Site Logs & Updates Feed</h4>
                            {(!p.updates || p.updates.length === 0) ? (
                              <p className="text-slate-400 italic">No construction logs posted yet.</p>
                            ) : (
                              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {p.updates.map((upd) => (
                                  <div key={upd.id} className="p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-1">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                                      <span className="font-bold">{upd.author}</span>
                                      <span>{upd.date}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-350 leading-relaxed font-medium">{upd.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB: CONTRIBUTE */}
          {activeTab === 'contribute' && (
            <div id="contribute-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Payment submission form */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Submit Contribution Reference</h4>
                <p className="text-xs text-slate-400">Record your Mobile Money or Bank deposit details to trigger an official receipt verification.</p>
                
                {paymentSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-xs flex items-center space-x-2">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <span>{paymentSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Select Donation Category</label>
                      <select 
                        value={paymentForm.purposeType}
                        onChange={e => setPaymentForm({
                          ...paymentForm, 
                          purposeType: e.target.value,
                          purposeName: e.target.value === 'phase' ? (phases[0]?.name || '') : (events[0]?.name || '')
                        })}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                      >
                        <option value="phase">Construction Phase</option>
                        <option value="event">Fundraising Event</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Link Destination</label>
                      <select 
                        value={paymentForm.purposeName}
                        onChange={e => setPaymentForm({...paymentForm, purposeName: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                      >
                        {paymentForm.purposeType === 'phase' 
                          ? phases.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                          : events.map(e => <option key={e.id} value={e.name}>{e.name}</option>)
                        }
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Amount (UGX)</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="e.g. 5000000"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                      <select 
                        value={paymentForm.method}
                        onChange={e => setPaymentForm({...paymentForm, method: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Mobile Money">Mobile Money (MTN/Airtel)</option>
                        <option value="Bank Transfer">Bank Transfer (Centenary/Stanbic)</option>
                        <option value="Deposit Slip">Bank Agent Cash Deposit</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Transaction reference number / Slip ID</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. STAN-TRF-98273 or MOMO Txn ID"
                      value={paymentForm.reference}
                      onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 font-mono"
                    />
                  </div>

                  {/* Real Receipt Image Upload */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-400 font-semibold mb-1">Attach Receipt Image (Optional)</label>
                    <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/60 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex-1 text-center md:text-left">
                        <span className="font-semibold block text-slate-850 dark:text-slate-200 text-xs">
                          {paymentForm.screenshotUrl ? "Receipt image attached!" : "Attach proof of payment"}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          {paymentForm.screenshotUrl ? "Click Change file to upload a different image." : "Select receipt photograph or deposit slip screenshot (Max 2MB)."}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {paymentForm.screenshotUrl && (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-300 shadow-sm bg-white shrink-0">
                            <img src={paymentForm.screenshotUrl} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <label className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-xl font-bold text-[10px] cursor-pointer transition-colors text-center inline-block">
                          {paymentForm.screenshotUrl ? "Change file" : "Choose file"}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange} 
                          />
                        </label>
                        {paymentForm.screenshotUrl && (
                          <button
                            type="button"
                            onClick={() => setPaymentForm(prev => ({ ...prev, screenshotUrl: '' }))}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 px-2 py-2 rounded-xl font-bold text-[10px] cursor-pointer border-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-primary-500/10 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Payment to Treasurer</span>
                  </button>
                </form>
              </div>

              {/* Instructions and bank details */}
              <div className="glass-card rounded-2xl p-6 h-fit text-xs space-y-6">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[10px]">Official Deposit Accounts</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Copy details directly to perform Mobile Money or Bank deposits</p>
                </div>
                
                <div className="space-y-6">
                  {/* Group 1: Mobile Money */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Mobile Money Accounts</span>
                    {paymentDetails.filter(c => c.methodType === 'Mobile Money' && c.isActive).length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">No active Mobile Money accounts configured.</p>
                    ) : (
                      paymentDetails
                        .filter(c => c.methodType === 'Mobile Money' && c.isActive)
                        .map(channel => (
                          <div key={channel.id} className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-105 dark:border-slate-805 rounded-xl space-y-1.5 font-semibold">
                            <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                              <span className="font-bold">{channel.providerName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(channel.accountNumber)
                                  toast.success(`${channel.providerName} number copied!`)
                                }}
                                className="text-slate-400 hover:text-indigo-500 p-1 border-0 bg-transparent cursor-pointer"
                                title="Copy Account Number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-slate-450 dark:text-slate-400 text-[10px]">Name: {channel.accountName}</p>
                            <p className="font-mono text-slate-900 dark:text-slate-100 text-[11px] font-bold">{channel.accountNumber}</p>
                            {channel.instructions && (
                              <p className="text-[9px] text-slate-400 leading-normal italic font-medium pt-1 border-t border-slate-100 dark:border-slate-850">{channel.instructions}</p>
                            )}
                          </div>
                        ))
                    )}
                  </div>

                  {/* Group 2: Bank Transfer */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">Bank Transfer Accounts</span>
                    {paymentDetails.filter(c => c.methodType === 'Bank Transfer' && c.isActive).length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">No active Bank Transfer accounts configured.</p>
                    ) : (
                      paymentDetails
                        .filter(c => c.methodType === 'Bank Transfer' && c.isActive)
                        .map(channel => (
                          <div key={channel.id} className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-105 dark:border-slate-805 rounded-xl space-y-1.5 font-semibold">
                            <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                              <span className="font-bold">{channel.providerName}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(channel.accountNumber)
                                  toast.success(`${channel.providerName} account copied!`)
                                }}
                                className="text-slate-400 hover:text-indigo-500 p-1 border-0 bg-transparent cursor-pointer"
                                title="Copy Account Number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-slate-450 dark:text-slate-455 text-[10px]">Name: {channel.accountName}</p>
                            <p className="font-mono text-slate-900 dark:text-slate-100 text-[11px] font-bold">{channel.accountNumber}</p>
                            {channel.instructions && (
                              <p className="text-[9px] text-slate-400 leading-normal italic font-medium pt-1 border-t border-slate-100 dark:border-slate-850">{channel.instructions}</p>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: RECEIPTS & HISTORY */}
          {activeTab === 'receipts' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">My Contributions History</h4>
                
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Transaction ID</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Payment Method</th>
                        <th className="pb-3">Purpose</th>
                        <th className="pb-3">Reference</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {contributions.map((c) => (
                        <tr key={c.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-4 font-mono text-slate-400">{c.id}</td>
                          <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{formatUGX(c.amount)}</td>
                          <td className="py-4">{c.method}</td>
                          <td className="py-4">{c.purposeName}</td>
                          <td className="py-4 font-mono">{c.reference}</td>
                          <td className="py-4 text-slate-400">{c.date}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                              c.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-rose-500/10 text-rose-500'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {c.status === 'Approved' && c.receiptId ? (
                              <button 
                                onClick={() => setReceiptToShow(c)}
                                className="bg-indigo-500 hover:bg-indigo-650 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                View Receipt
                              </button>
                            ) : c.status === 'Rejected' ? (
                              <button 
                                onClick={() => handleResubmit(c)}
                                className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Re-Submit
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Verifying</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transparency' && (
            <div className="space-y-6">

              {/* Master BOQ Financial Transparency Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Financial Transparency & Grand Summary */}
                <div className="lg:col-span-1 glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Master QS Controller
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-3">
                      St. Francis of Assisi BOQ
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Official financial controller budget of Lusanja Sub Parish Catholic Church.
                    </p>
                  </div>

                  <div className="space-y-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-105 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Grand Total Target Goal</span>
                      <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                        {formatUGX(grandTotalBOQ)}
                      </span>
                    </div>

                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(Math.round((totalPhaseCollected / grandTotalBOQ) * 100), 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-400">
                      <span>Collected: {formatUGX(totalPhaseCollected)}</span>
                      <span className="text-primary-600 dark:text-indigo-400 font-extrabold">
                        {Math.min(Math.round((totalPhaseCollected / grandTotalBOQ) * 100), 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30">
                      <p className="text-slate-400 font-semibold leading-tight">Works (11 Elements)</p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{formatUGX(617760000)}</p>
                    </div>
                    <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30">
                      <p className="text-slate-400 font-semibold leading-tight">Contingency (3%)</p>
                      <p className="font-extrabold text-amber-500 mt-0.5">{formatUGX(contingencyBOQ)}</p>
                    </div>
                    <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/30">
                      <p className="text-slate-400 font-semibold leading-tight">VAT Provision (18%)</p>
                      <p className="font-extrabold text-rose-500 mt-0.5">{formatUGX(vatBOQ)}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Recharts Budget Breakdown Donut Chart */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Overall Funds Allocation</h4>
                      <p className="text-xs text-slate-400">Budget allocation across active construction phases</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Works Subtotal: {formatUGX(totalPhaseBudget)}
                    </span>
                  </div>

                  <div className="h-64 sm:h-72 w-full flex items-center justify-center relative">
                    {phases.length === 0 ? (
                      <div className="h-full w-full flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <span>No phase data available.</span>
                      </div>
                    ) : (
                      <>
                        <div className="absolute flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Budget</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white leading-none mt-1">
                            {formatUGX(totalPhaseBudget)}
                          </span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={phases.map(p => ({
                                name: p.name,
                                value: p.boqBudget || p.budget || 0
                              }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                            >
                              {phases.map((entry, index) => {
                                const colors = [
                                  '#1e3a8a', '#2563eb', '#ca8a04', '#3b82f6', '#d97706', 
                                  '#0f172a', '#4f46e5', '#10b981', '#f59e0b', '#ec4899'
                                ]
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              })}
                            </Pie>
                            <Tooltip formatter={(value) => [formatUGX(value), 'Budget']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </>
                    )}
                  </div>

                  {/* Detailed Legend */}
                  <div className="mt-4 max-h-36 overflow-y-auto space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                    {phases.map((p, index) => {
                      const totalBudget = totalPhaseBudget || 1;
                      const value = p.boqBudget || p.budget || 0;
                      const percent = ((value / totalBudget) * 100).toFixed(0);
                      const colors = [
                        '#1e3a8a', '#2563eb', '#ca8a04', '#3b82f6', '#d97706', 
                        '#0f172a', '#4f46e5', '#10b981', '#f59e0b', '#ec4899'
                      ]
                      const color = colors[index % colors.length];
                      return (
                        <div key={p.id} className="flex items-center justify-between text-slate-700 dark:text-slate-350">
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="truncate font-semibold">{p.name}</span>
                          </div>
                          <span className="font-bold shrink-0 pl-2 text-slate-900 dark:text-white font-mono">
                            {percent}% ({formatUGX(value)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: CONSTRUCTION INFORMATION CENTER */}
          {activeTab === 'infocenter' && (
            <div className="space-y-6">
              
              {/* Document Categories Filtering Bar */}
              <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Construction Documentation Database</h4>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(docCategoryLabels).map(([cat, label]) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedDocCategory(cat)}
                      className={`px-3 py-2 rounded-xl transition-all cursor-pointer font-bold ${
                        selectedDocCategory === cat
                          ? 'bg-indigo-650 bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-350'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Documents Table */}
                <div className="overflow-x-auto text-xs mt-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Document Title</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Date Uploaded</th>
                        <th className="pb-3">Uploaded By</th>
                        <th className="pb-3 text-right">View file</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {documents
                        .filter(doc => selectedDocCategory === 'all' || doc.category === selectedDocCategory)
                        .map(doc => (
                          <tr key={doc.id} className="text-slate-750 dark:text-slate-300">
                            <td className="py-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                              <FileText className="w-4.5 h-4.5 text-sky-500 flex-shrink-0" />
                              {doc.title}
                            </td>
                            <td className="py-4">
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full">
                                {docCategoryLabels[doc.category]}
                              </span>
                            </td>
                            <td className="py-4 font-mono text-slate-400">{doc.date}</td>
                            <td className="py-4 font-semibold">{doc.uploadedBy}</td>
                            <td className="py-4 text-right">
                              <button
                                onClick={() => {
                                  if (!doc.url || doc.url === '#') {
                                    setToast({
                                      type: 'info',
                                      message: `Simulating secure file retrieval: "${doc.title}" downloaded securely from SFA Cloud.`
                                    })
                                    setTimeout(() => setToast(null), 4000)
                                  } else {
                                    setPreviewDoc(doc)
                                  }
                                }}
                                className="text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 font-bold bg-transparent border-0 cursor-pointer text-xs"
                              >
                                Open File
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {documents.filter(doc => selectedDocCategory === 'all' || doc.category === selectedDocCategory).length === 0 && (
                    <p className="text-center text-slate-400 italic py-6">No documents found matching this category filter.</p>
                  )}
                </div>
              </div>

              {/* Committee Members Directory & Supplier Directory */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                
                {/* Committee Directory */}
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Building Committee Directory</h4>
                    <p className="text-xs text-slate-400">Official parish building committee members and their direct responsibilities.</p>
                  </div>

                  <div className="space-y-4">
                    {committeeMembers.map((m, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold font-mono text-xs uppercase shrink-0 border border-indigo-200 dark:border-slate-700">
                          {m.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="space-y-1">
                          <strong className="text-slate-800 dark:text-slate-200 block">{m.name}</strong>
                          <span className="text-[10px] text-indigo-500 font-bold block">{m.role}</span>
                          <p className="text-slate-500 leading-snug mt-1 font-semibold">{m.responsibility}</p>
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">Direct: {m.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplier & Contractor list */}
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Active Contractors & Suppliers</h4>
                    <p className="text-xs text-slate-400">Database of outsourced engineering partners and hardware vendors.</p>
                  </div>

                  <div className="space-y-4">
                    {supplierDirectory.map((s, idx) => (
                      <div key={idx} className="p-3.5 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950/40 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <strong className="text-slate-850 dark:text-slate-200 text-xs block">{s.name}</strong>
                          <span className="text-[9px] bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full font-bold">{s.specialty}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium font-mono">
                          <span>Contact: {s.contact}</span>
                          <span>Phone: {s.phone}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Construction Phasing Timeline (GANTT simulation) */}
              <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Project Phasing Gantt & Timeline</h4>
                  <p className="text-xs text-slate-400">Visual mapping of structural progression from Foundation excavation to Parish Consecration.</p>
                </div>

                <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-6 text-xs">
                  <div className="relative">
                    <div className="absolute -left-10 top-0.5 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-4 border-slate-50 dark:border-slate-950">1</div>
                    <strong className="text-emerald-500 block">Foundation & Ground Support (Completed)</strong>
                    <span className="text-[10px] text-slate-400">Target: Sep 2025 - Oct 2025</span>
                    <p className="text-slate-500 leading-snug mt-1 font-semibold">Excavation, ground steel frame assemblies, and reinforcing concrete beams pour completed.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-0.5 bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-4 border-slate-50 dark:border-slate-950">2</div>
                    <strong className="text-emerald-500 block">Pillars, Columns & Walling (In Progress)</strong>
                    <span className="text-[10px] text-slate-400">Target: Jan 2026 - Jul 2026</span>
                    <p className="text-slate-500 leading-snug mt-1 font-semibold">Columns casting finalized. Main exterior brick structures laid. Internal partitions ongoing.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-0.5 bg-indigo-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-4 border-slate-50 dark:border-slate-950 animate-pulse">3</div>
                    <strong className="text-indigo-500 block">Roofing Structure & Trussing (Up Next)</strong>
                    <span className="text-[10px] text-slate-400">Target: Jul 2026 - Sep 2026</span>
                    <p className="text-slate-500 leading-snug mt-1 font-semibold">Procurement of timber and iron sheets under verification. Ground trussing assembly finished.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-4 border-slate-50 dark:border-slate-950">4</div>
                    <strong className="text-slate-700 dark:text-slate-350 block">Plumbing, Electrical & Finishes (Future Phase)</strong>
                    <span className="text-[10px] text-slate-400">Target: Oct 2026 - Mar 2027</span>
                    <p className="text-slate-500 leading-snug mt-1 font-semibold">Internal conduits wiring, sanitary fittings layouts, skimming, ceiling setups, pews and plaster painting.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-10 top-0.5 bg-slate-200 dark:bg-slate-800 text-slate-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-4 border-slate-50 dark:border-slate-950">5</div>
                    <strong className="text-slate-700 dark:text-slate-350 block">Consecration Liturgy & Official Launch</strong>
                    <span className="text-[10px] text-slate-400">Target: Jul 2027</span>
                    <p className="text-slate-500 leading-snug mt-1 font-semibold">Rectification logs review, deep cleaning, and consecration ceremony scheduled for Assisi parishioners.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GLOBAL CONTRIBUTIONS LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              {/* Financial stats of approved contributions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Total Verified Donations</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5 block">
                    {allContributions.filter(c => c.status === 'Approved').length} Transactions
                  </span>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Grand Total UGX Raised</span>
                  <span className="text-2xl font-bold text-emerald-500 mt-1.5 block">
                    {formatUGX(allContributions.filter(c => c.status === 'Approved').reduce((sum, c) => sum + c.amount, 0))}
                  </span>
                </div>
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold">Average Donation Size</span>
                  <span className="text-2xl font-bold text-indigo-500 mt-1.5 block">
                    {(() => {
                      const approved = allContributions.filter(c => c.status === 'Approved')
                      const total = approved.reduce((sum, c) => sum + c.amount, 0)
                      return formatUGX(approved.length > 0 ? total / approved.length : 0)
                    })()}
                  </span>
                </div>
              </div>

              {/* Ledger Table Container */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Verified Parish Collections Ledger</h4>
                    <p className="text-xs text-slate-400">Public registry of verified transactions to maintain 100% financial accountability.</p>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      id="ledger-search-input"
                      type="text"
                      placeholder="Search member name, ID, purpose..."
                      value={ledgerSearch}
                      onChange={e => {
                        setLedgerSearch(e.target.value)
                        setLedgerPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Transaction ID</th>
                        <th className="pb-3">Member/Donor</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Purpose</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3">Reference Code</th>
                        <th className="pb-3">Verification Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(() => {
                        const approved = allContributions.filter(c => c.status === 'Approved')
                        const filtered = approved.filter(c => {
                          const q = (ledgerSearch || '').toLowerCase()
                          return (
                            (c.id || '').toLowerCase().includes(q) ||
                            (c.userName || '').toLowerCase().includes(q) ||
                            (c.purposeName || '').toLowerCase().includes(q) ||
                            (c.method || '').toLowerCase().includes(q) ||
                            ((c.reference || '')).toLowerCase().includes(q)
                          )
                        })

                        const ITEMS_PER_PAGE = 8
                        const paginated = filtered.slice(
                          (ledgerPage - 1) * ITEMS_PER_PAGE,
                          ledgerPage * ITEMS_PER_PAGE
                        )

                        if (paginated.length === 0) {
                          return (
                            <tr>
                              <td colSpan="7" className="text-center text-slate-400 italic py-8">
                                No verified contributions found matching your search.
                              </td>
                            </tr>
                          )
                        }

                        return paginated.map(c => (
                          <tr key={c.id} className="text-slate-700 dark:text-slate-350">
                            <td className="py-4 font-mono text-slate-400">{c.id}</td>
                            <td className="py-4 font-bold text-slate-900 dark:text-slate-200">{c.userName || 'Member'}</td>
                            <td className="py-4 font-bold text-emerald-500">{formatUGX(c.amount)}</td>
                            <td className="py-4 font-semibold">{c.purposeName || 'General'}</td>
                            <td className="py-4">{c.method || 'N/A'}</td>
                            <td className="py-4 font-mono">{c.reference || 'N/A'}</td>
                            <td className="py-4 text-slate-400">{c.date || ''}</td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const approved = allContributions.filter(c => c.status === 'Approved')
                  const filtered = approved.filter(c => {
                    const q = (ledgerSearch || '').toLowerCase()
                    return (
                      (c.id || '').toLowerCase().includes(q) ||
                      (c.userName || '').toLowerCase().includes(q) ||
                      (c.purposeName || '').toLowerCase().includes(q) ||
                      (c.method || '').toLowerCase().includes(q) ||
                      ((c.reference || '')).toLowerCase().includes(q)
                    )
                  })

                  const ITEMS_PER_PAGE = 8
                  const totalPages = Math.max(Math.ceil(filtered.length / ITEMS_PER_PAGE), 1)

                  if (totalPages <= 1) return null

                  return (
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Showing page {ledgerPage} of {totalPages} ({filtered.length} total entries)
                      </span>
                      <div className="flex gap-2">
                        <button
                          id="ledger-prev-btn"
                          disabled={ledgerPage === 1}
                          onClick={() => setLedgerPage(p => Math.max(p - 1, 1))}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                        >
                          Previous
                        </button>
                        <button
                          id="ledger-next-btn"
                          disabled={ledgerPage === totalPages}
                          onClick={() => setLedgerPage(p => Math.min(p + 1, totalPages))}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer font-bold"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* TAB: FEEDBACK & QUESTIONS HUB */}
          {activeTab === 'feedback' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Submission Form */}
              <div className="lg:col-span-1 glass-card rounded-2xl p-6 h-fit space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Submit Feedback or Question</h4>
                  <p className="text-xs text-slate-400">Share your thoughts, suggestions, or raise inquiries directly to the Building Committee.</p>
                </div>

                {feedbackSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-xs flex items-center space-x-2">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <span>{feedbackSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Subject</label>
                    <input 
                      id="feedback-subject-input"
                      type="text"
                      required
                      placeholder="e.g. Voluntary construction labor schedule"
                      value={feedbackForm.subject}
                      onChange={e => setFeedbackForm({...feedbackForm, subject: e.target.value})}
                      className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                        feedbackErrors?.subject ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    />
                    {feedbackErrors?.subject && (
                      <span className="text-rose-500 text-[10px] block mt-1 font-semibold">{feedbackErrors.subject}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Message / Question Details</label>
                    <textarea 
                      id="feedback-message-textarea"
                      required
                      rows="6"
                      placeholder="Please details your request (min. 10 characters)..."
                      value={feedbackForm.message}
                      onChange={e => setFeedbackForm({...feedbackForm, message: e.target.value})}
                      className={`w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 ${
                        feedbackErrors?.message ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                      }`}
                    />
                    {feedbackErrors?.message && (
                      <span className="text-rose-500 text-[10px] block mt-1 font-semibold">{feedbackErrors.message}</span>
                    )}
                  </div>

                  <button 
                    id="feedback-submit-btn"
                    type="submit"
                    className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-primary-500/10 flex items-center justify-center space-x-2 cursor-pointer animate-fade-in"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Send to Committee</span>
                  </button>
                </form>
              </div>

              {/* Feedback History List */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">My Support Tickets & Inquiries</h4>
                  <p className="text-xs text-slate-400">Track the review status of your inquiries and read responses from the parish staff.</p>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {feedback.filter(f => f.member_id === profile.id).length === 0 ? (
                    <div className="p-8 text-center text-slate-400 italic">
                      You have not submitted any feedback entries yet.
                    </div>
                  ) : (
                    feedback
                      .filter(f => f.member_id === profile.id)
                      .map(f => (
                        <div key={f.id} className="p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl space-y-3 animate-fade-in">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 text-xs block">{f.subject}</strong>
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{f.created_at}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              f.status === 'Replied'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>

                          <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed font-semibold">
                            {f.message}
                          </p>

                          {f.status === 'Replied' && f.reply_message && (
                            <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-155 dark:border-indigo-900/50 rounded-xl space-y-1">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-650 dark:text-indigo-400 block">
                                Response from Leadership
                              </span>
                              <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed italic">
                                "{f.reply_message}"
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PARISH BUSINESS DIRECTORY & ADS */}
          {activeTab === 'directory' && (
            <ParishDirectoryView />
          )}

          {/* TAB: SECURITY SETTINGS */}
          {activeTab === 'security' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Account Security Settings</h3>
                    <p className="text-xs text-slate-400">Configure multi-factor security preferences for your church login credentials.</p>
                  </div>
                </div>

                <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250">Two-Factor Authentication (2FA)</h4>
                      <p className="text-xs text-slate-400 max-w-md">
                        Enforce verification via a one-time password (OTP) code sent to your registered credentials each time you log in.
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border tracking-wider ${
                        twoFactorEnabled 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                          : 'bg-slate-200/50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-750 text-slate-400'
                      }`}>
                        {twoFactorEnabled ? 'Active & Enforced' : 'Inactive'}
                      </span>
                      
                      <button
                        onClick={handleToggle2FA}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {twoFactorEnabled && (
                  <div className="bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-4 flex gap-3 text-xs animate-fade-in">
                    <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold block">2FA Enabled Successfully</strong>
                      <p className="text-slate-650 dark:text-slate-400">
                        The system will now prompt you for a 6-digit OTP code on all future logins. You can enter any 6-digit passcode to log in for quick local verification.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* RECEIPT VIEW MODAL */}
      {receiptToShow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            id="member-receipt-print"
            className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 relative text-slate-900 shadow-2xl overflow-hidden print-container transition-all receipt-force-white font-outfit print:bg-white print:text-black print:shadow-none"
            style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            
            {/* Top Accent Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 print:h-2" />
            
            {/* Receipt Content Container */}
            <div className="p-8 space-y-6 relative">
              {/* Background Watermark */}
              <div 
                className="absolute inset-0 bg-no-repeat bg-center opacity-[0.02] pointer-events-none print:opacity-[0.03]"
                style={{ backgroundImage: "url('/logo.png')", backgroundSize: '240px' }}
              />
              
              {/* Close Button */}
              <button 
                onClick={() => setReceiptToShow(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 print:hidden cursor-pointer border-0 bg-transparent z-25 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="relative z-10 space-y-6">
                
                {/* Header: Logo & Title (Invoice Style) */}
                <div className="flex justify-between items-start pb-6 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <img src="/logo.png" className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" alt="St. Francis Logo" />
                    <div className="text-left">
                      <h3 className="font-extrabold text-base tracking-tight text-slate-900 uppercase">St. Francis of Assisi Church</h3>
                      <p className="text-[10px] text-indigo-655 text-indigo-600 font-bold uppercase tracking-wider">Lusanja Parish Building Fund</p>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Kampala, Uganda • Tel: +256 700 000000</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">RECEIPT</h2>
                    <span className="inline-block bg-emerald-500/10 text-emerald-800 font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase border border-emerald-500/25 mt-2">
                      ★ PAID ★
                    </span>
                  </div>
                </div>

                {/* Receipt Details Grid (Invoice Style) */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs py-6 border-b border-slate-200 text-left">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Receipt Number:</span>
                    <span className="font-mono font-black text-slate-900 text-sm mt-1 block">{receiptToShow.receiptId}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Payment Date:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-1 block">{receiptToShow.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Contributor:</span>
                    <span className="font-extrabold text-slate-900 text-sm mt-1 block">{receiptToShow.userName}</span>
                  </div>
                  <div>
                    <span className="text-slate-405 text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Purpose / Phase:</span>
                    <span className="font-bold text-slate-900 text-sm mt-1 block">{receiptToShow.purposeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Payment Method:</span>
                    <span className="font-bold text-slate-900 text-sm mt-1 block flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      {receiptToShow.method}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Contribution ID:</span>
                    <span className="font-mono font-medium text-slate-500 text-[11px] mt-1 block">{receiptToShow.id}</span>
                  </div>
                </div>

                {/* Transaction Financial Area */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-3">
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-left">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800">Building Fund Contribution</p>
                      <p className="text-[10px] text-slate-400 font-medium">Thank you for your partnership in construction</p>
                    </div>
                    <span className="font-bold text-slate-800">{formatUGX(receiptToShow.amount)}</span>
                  </div>
                  
                  {/* Total Highlight */}
                  <div className="flex justify-between items-center border-t border-emerald-100 pt-4 bg-emerald-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
                    <div className="text-left">
                      <span className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wider block">Total Amount Received</span>
                      <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block italic">Payment in full</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-700 font-black text-xl tracking-tight block">{formatUGX(receiptToShow.amount)} UGX</span>
                    </div>
                  </div>
                </div>

                {/* Signatures & QR Code Section */}
                <div className="flex justify-between items-end pt-4 gap-4">
                  
                  {/* Official Stamp & Sign */}
                  <div className="space-y-4 text-left">
                    <div className="relative pt-2">
                      <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold block">Authorized Sign-off:</span>
                      <div className="relative inline-block mt-2">
                        <p className="font-cursive-signature italic font-bold text-slate-800 text-3xl select-none tracking-wide relative z-10 pl-2">
                          {receiptToShow.signature || "Dr. Sarah Nakato"}
                        </p>
                        {/* SVG Official Stamp overlay next to signature */}
                        <svg className="absolute -top-6 -right-12 w-20 h-20 text-emerald-600/15 pointer-events-none select-none z-0 rotate-12" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 3" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <text x="50" y="32" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="currentColor" letterSpacing="0.5">SFA CHURCH</text>
                          <text x="50" y="52" textAnchor="middle" fontSize="12" fontWeight="black" fill="currentColor" letterSpacing="1">PAID</text>
                          <text x="50" y="70" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="currentColor" letterSpacing="0.5">OFFICIAL SEAL</text>
                        </svg>
                      </div>
                      <span className="text-[8px] text-slate-400 block font-bold mt-1 uppercase tracking-wider">Lusanja Parish Treasurer</span>
                    </div>
                  </div>

                  {/* QR Verification */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 bg-white p-2 border border-slate-150 rounded-2xl shadow-sm hover:shadow transition-shadow">
                    <QRCode 
                      value={receiptToShow.receiptQrCode || receiptToShow.receipt_qr_code || receiptToShow.qrCode || ''} 
                      size={80} 
                      level="H"
                      includeMargin={false}
                    />
                    <span className="text-[7px] font-black text-slate-400 tracking-widest uppercase">SCAN TO VERIFY</span>
                  </div>
                </div>

                {/* Decorative cut-out bottom border for paper look */}
                <div className="border-t border-dashed border-slate-200 pt-4 text-center">
                  <p className="text-[9px] text-slate-400 font-semibold tracking-wide">
                    *"Every man shall give as he is able, according to the blessing of the Lord your God which He has given you."*
                  </p>
                  <p className="text-[8px] text-indigo-500 font-bold tracking-widest uppercase mt-1">Deuteronomy 16:17</p>
                </div>

              </div>
            </div>

            {/* Print Action Buttons (Hidden on Print) */}
            <div className="px-8 pb-8 flex gap-3 print:hidden relative z-20">
              <button 
                onClick={() => setReceiptToShow(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border-0"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()} 
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-slate-900/10 cursor-pointer border-0"
              >
                <span>Print</span>
              </button>
              <button 
                onClick={() => handleDownloadPDF('member-receipt-print', `Receipt_${receiptToShow.receiptId || receiptToShow.id}.pdf`)} 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/15 cursor-pointer border-0"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVENT CLOSURE REPORT MODAL */}
      {eventReportToShow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div id="member-report-print" className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 relative text-slate-900 shadow-2xl overflow-hidden print-container">
            {/* Top Accent Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-600 to-indigo-800 print:h-2" />
            
            <div className="p-8 space-y-6 relative">
              <button 
                onClick={() => setEventReportToShow(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 print:hidden cursor-pointer border-0 bg-transparent z-25 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="space-y-6 relative z-10">
                <div className="flex flex-col items-center border-b border-slate-100 pb-5 text-center">
                  <img src="/logo.png" className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 mb-2" alt="St. Francis Logo" />
                  <h3 className="font-black text-sm uppercase tracking-tight text-slate-900">St. Francis of Assisi Church</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Lusanja Parish Building Fund Committee</p>
                  <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full mt-2 uppercase tracking-wider">Fundraising Event Closure Report</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Event Name</span>
                    <span className="text-slate-800 font-extrabold mt-0.5 block">{eventReportToShow.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Linked Phase</span>
                    <span className="text-slate-800 font-extrabold mt-0.5 block">{eventReportToShow.linkedPhaseName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Event Date</span>
                    <span className="text-slate-700 font-mono mt-0.5 block">{eventReportToShow.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] font-bold block">Event Status</span>
                    <span className="text-emerald-600 uppercase font-black tracking-wider text-[10px] mt-0.5 block">★ {eventReportToShow.status} ★</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs border-y border-dashed border-slate-200 py-4 font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Target Goal Amount:</span>
                    <span className="text-slate-900 font-bold">{formatUGX(eventReportToShow.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450 font-medium">Actual Income Collected:</span>
                    <span className="text-emerald-600 font-bold">{formatUGX(eventReportToShow.income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-455 font-medium">Total Event Expenses:</span>
                    <span className="text-rose-500 font-bold">{formatUGX(eventReportToShow.expenses)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2.5">
                    <span className="text-slate-900 font-black">Net Phase Contribution:</span>
                    <span className="text-indigo-655 font-extrabold text-sm">{formatUGX(eventReportToShow.income - eventReportToShow.expenses)}</span>
                  </div>
                </div>

                {/* Financial ROI and Expense Ratio metrics */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">Accomplishment ROI</span>
                    <span className="text-lg font-black text-emerald-650 block mt-1">
                      {eventReportToShow.targetAmount > 0 ? Math.round((eventReportToShow.income / eventReportToShow.targetAmount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-2xl">
                    <span className="text-slate-500 text-[10px] block font-bold uppercase tracking-wider">Expense Ratio</span>
                    <span className="text-lg font-black text-rose-500 block mt-1">
                      {eventReportToShow.income > 0 ? Math.round((eventReportToShow.expenses / eventReportToShow.income) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase tracking-wider font-bold block">Audited Signoff</span>
                    <p className="font-serif italic font-bold text-slate-805 text-sm mt-1">Dr. Sarah Nakato (Treasurer)</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase">
                    ✓ VERIFIED REPORT
                  </div>
                </div>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="px-8 pb-8 flex gap-3 print:hidden">
              <button 
                onClick={() => setEventReportToShow(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border-0"
              >
                Close
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer border-0 flex items-center justify-center space-x-2"
              >
                <span>Print</span>
              </button>
              <button 
                onClick={() => handleDownloadPDF('member-report-print', `Event_Closure_Report_${eventReportToShow.name.replace(/\s+/g, '_')}.pdf`)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer border-0 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX */}
      {lightboxPhotos && lightboxPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center text-white px-4 py-2 z-10">
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Site Photo Lightbox</h4>
              <p className="text-[10px] text-slate-500">Image {lightboxIndex + 1} of {lightboxPhotos.length}</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLightboxZoom(prev => Math.min(prev + 0.25, 3))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setLightboxZoom(prev => Math.max(prev - 0.25, 1))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setLightboxZoom(1)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition-all cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCloseLightbox}
                className="p-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-white font-bold transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Photo Area */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {lightboxPhotos.length > 1 && (
              <button 
                onClick={handlePrevLightbox}
                className="absolute left-4 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all z-10 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div 
              className="transition-transform duration-205 ease-out"
              style={{ transform: `scale(${lightboxZoom})` }}
            >
              <img 
                src={lightboxPhotos[lightboxIndex]?.image_url} 
                alt="Construction update" 
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            </div>

            {lightboxPhotos.length > 1 && (
              <button 
                onClick={handleNextLightbox}
                className="absolute right-4 p-3 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white transition-all z-10 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Footer Info */}
          <div className="text-center text-slate-400 text-[10px] pb-4 z-10 font-semibold">
            Uploaded on {lightboxPhotos[lightboxIndex]?.created_at} • Drag or zoom to inspect details
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{previewDoc.title}</h4>
                <p className="text-[10px] text-slate-400">Secure Inline Document Viewer</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 rounded-lg text-slate-500 dark:text-slate-400 font-bold transition-all cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Frame Body */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-900 relative">
              <iframe 
                src={previewDoc.url} 
                className="w-full h-full border-0" 
                title={previewDoc.title}
              />
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC WHATSAPP/EMAIL TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-sm w-full bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 p-4 rounded-2xl shadow-2xl text-xs flex gap-3 text-slate-300">
          <div className="shrink-0">
            {toast.type === 'whatsapp' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                <Share2 className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-500">
                <Bell className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <strong className="block text-slate-100 text-[11px] mb-0.5">
              {toast.type === 'whatsapp' ? 'WhatsApp Alert Sent' : 'System Information'}
            </strong>
            <p className="text-[10px] leading-relaxed text-slate-400">{toast.message}</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body {
            visibility: hidden;
            background: transparent !important;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 50% !important;
            top: 50px !important;
            transform: translateX(-50%) !important;
            width: 6.5in !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 32px !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 24px !important;
            box-shadow: none !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container button, 
          .print-container .print\\:hidden,
          .print-container [class*="print:hidden"],
          button,
          [class*="absolute top-4 right-4"] {
            display: none !important;
          }
        }
      `}</style>

    </div>
  )
}