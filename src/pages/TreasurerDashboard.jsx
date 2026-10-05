import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { 
  useProfiles, usePhases, useContributions, useExpenses, useEvents, useAuditLogs, usePledges, useFeedback,
  useApproveContribution, useRejectContribution, useCreateExpense, useCreatePledge, useRecordPledgePayment, useCompleteEvent, useReplyFeedback,
  useCommittee, useRecordManualContribution
} from '../hooks/useData'
import { 
  LayoutDashboard, Coins, CheckSquare, 
  Activity, LogOut, Plus, Check, X,
  AlertTriangle, RefreshCw, FileSpreadsheet, Eye, Download, Search, AlertCircle,
  TrendingUp, TrendingDown, Clock, Bell, ChevronRight, CheckCircle2, ClipboardList,
  Sun, Moon, ShieldAlert, FileCheck, Key, MessageSquare, Menu, Printer,
  Loader2, SlidersHorizontal, Settings2, MessageSquareQuote,
  Database, Filter, ChevronLeft, Table, ListFilter, Sliders, Layers, FileText, Sparkles, ChevronDown
} from 'lucide-react'
import { 
  pledgeSchema, 
  contributionSchema, 
  expenseSchema, 
  feedbackReplySchema 
} from '../utils/validation'
import QRCode from 'react-qr-code'
import GlobalBudgetOverview from '../components/GlobalBudgetOverview'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts'

export default function TreasurerDashboard() {
  const { user, profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const currentUserId = user?.id || 'treasurer-uid'
  const currentUserName = profile?.full_name || user?.email || 'Dr. Sarah Nakato'
  const currentUserRole = profile?.role || 'treasurer'
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard', 'verifications', 'expenses', 'pledges', 'reconcile', 'fundraising', 'qrverify'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // React Query data hooks
  const { data: profiles = {}, isLoading: profilesLoading } = useProfiles()
  const { data: phases = [], isLoading: phasesLoading } = usePhases()
  const { data: contributions = [], isLoading: contribsLoading } = useContributions()
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses()
  const { data: events = [] } = useEvents()
  const { data: auditLogs = [] } = useAuditLogs()
  const { data: pledges = [] } = usePledges()
  const { data: feedback = [] } = useFeedback()
  const { data: committee = [] } = useCommittee()

  // React Query mutations
  const approveContributionMutation = useApproveContribution()
  const rejectContributionMutation = useRejectContribution()
  const createExpenseMutation = useCreateExpense()
  const createPledgeMutation = useCreatePledge()
  const recordPledgePaymentMutation = useRecordPledgePayment()
  const completeEventMutation = useCompleteEvent()
  const replyFeedbackMutation = useReplyFeedback()
  const recordManualContribMutation = useRecordManualContribution()

  // Manual Contribution Form State
  const [manualContrib, setManualContrib] = useState({
    userName: '',
    userId: '',
    amount: '',
    purposeType: 'phase',
    purposeName: 'Building Construction Fund',
    method: 'Cash',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [showHighValueConfirm, setShowHighValueConfirm] = useState(false)

  const handleRecordManualContributionSubmit = async (e) => {
    if (e) e.preventDefault()

    if (!manualContrib.userName || !manualContrib.amount) {
      setToast({ type: 'error', message: 'Please specify donor name and amount.' })
      return
    }

    const amt = Number(manualContrib.amount)
    if (amt > 1000000 && !showHighValueConfirm) {
      setShowHighValueConfirm(true)
      return
    }

    try {
      const newRecord = await recordManualContribMutation.mutateAsync({
        manualContribution: manualContrib,
        treasurerUser: user
      })

      setShowHighValueConfirm(false)
      setReceiptToShow(newRecord)
      setToast({ type: 'success', message: `Manual contribution recorded! Receipt: ${newRecord.receiptId || newRecord.reference}` })
      
      // Reset form
      setManualContrib({
        userName: '',
        userId: '',
        amount: '',
        purposeType: 'phase',
        purposeName: 'Building Construction Fund',
        method: 'Cash',
        reference: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Error recording manual contribution' })
    }
  }

  // UI Table states
  const [subTab, setSubTab] = useState('pending') // 'pending' or 'history'
  const [dashboardSubTab, setDashboardSubTab] = useState('analytics') // 'analytics' or 'transactions'
  const [searchQuery, setSearchQuery] = useState('')

  // System Data Hub states
  const [systemDataSubTab, setSystemDataSubTab] = useState('all') // 'all' | 'contributions' | 'expenses' | 'audit'
  const [systemDataSearch, setSystemDataSearch] = useState('')
  const [systemDataStatusFilter, setSystemDataStatusFilter] = useState('all')
  const [systemDataPhaseFilter, setSystemDataPhaseFilter] = useState('all')
  const [systemDataPage, setSystemDataPage] = useState(1)
  const [systemDataItemsPerPage, setSystemDataItemsPerPage] = useState(10)

  // Interaction states
  const [selectedContribution, setSelectedContribution] = useState(null)
  const [receiptToShow, setReceiptToShow] = useState(null)
  const [eventReportToShow, setEventReportToShow] = useState(null)
  const [clarificationText, setClarificationText] = useState('')
  const [showClarifyModal, setShowClarifyModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [toast, setToast] = useState(null)

  // QR Verify Portal State
  const [qrVerifyInput, setQrVerifyInput] = useState('')
  const [verificationResult, setVerificationResult] = useState(null)
  const [hasSearchedQR, setHasSearchedQR] = useState(false)
  
  // Pledge record state
  const [selectedPledge, setSelectedPledge] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money')
  const [paymentReference, setPaymentReference] = useState('')
  const [newPledge, setNewPledge] = useState({
    userId: 'member-uid',
    userName: 'Deacon Charles Mugisha',
    amount: '',
    purpose: 'Roofing & Trussing',
    targetDate: ''
  })
  
  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    phaseId: 'roofing',
    date: new Date().toISOString().slice(0, 10),
    category: 'Contractor Payout'
  })

  // Feedback Hub states
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyErrors, setReplyErrors] = useState(null)

  // Zod validation error states
  const [pledgeErrors, setPledgeErrors] = useState(null)
  const [paymentErrors, setPaymentErrors] = useState(null)
  const [expenseErrors, setExpenseErrors] = useState(null)

  // High-value expense confirmation states
  const [showExpenseConfirmModal, setShowExpenseConfirmModal] = useState(false)
  const [expenseConfirmInput, setExpenseConfirmInput] = useState('')
  const [pendingExpenseToCreate, setPendingExpenseToCreate] = useState(null)



  // Dark Mode support
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sfa_dark_mode') === 'true')

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleDownloadReceipt = async () => {
    if (!receiptToShow) return
    let logoBase64 = '/logo.png'
    try {
      const res = await fetch('/logo.png')
      const blob = await res.blob()
      logoBase64 = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('Failed to convert logo to base64:', e)
    }

    const qrCodeSvg = document.querySelector('.print-container svg')?.outerHTML || ''

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt_${receiptToShow.receiptId}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Outfit', sans-serif;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .font-cursive {
      font-family: 'Dancing Script', 'Great Vibes', cursive;
    }
  </style>
</head>
<body class="bg-slate-100 flex items-center justify-center min-h-screen p-4">
  <div class="bg-white rounded-3xl max-w-xl w-full border border-slate-200 relative text-slate-900 shadow-2xl overflow-hidden" style="position: relative; print-color-adjust: exact; -webkit-print-color-adjust: exact; background-color: #ffffff;">
    <!-- Top Accent Gradient Bar -->
    <div class="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500"></div>
    
    <!-- Receipt Content Container -->
    <div class="p-8 space-y-6 relative" style="position: relative;">
      <!-- Background Watermark -->
      <div 
        style="position: absolute; inset: 0; background-image: url('${logoBase64}'); background-repeat: no-repeat; background-position: center; opacity: 0.02; pointer-events: none; background-size: 240px;"
      ></div>
      
      <div class="relative z-10 space-y-6" style="position: relative; z-index: 10;">
        <!-- Header: Logo & Title (Invoice Style) -->
        <div class="flex justify-between items-start pb-6 border-b border-slate-200 gap-4" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 1.5rem;">
          <div class="flex items-center gap-4 text-left" style="display: flex; align-items: center; gap: 1rem;">
            <img src="${logoBase64}" class="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100" style="width: 4rem; height: 4rem; border-radius: 1rem; border: 1px solid #f1f5f9; object-fit: cover;" alt="St. Francis Logo" />
            <div style="text-align: left;">
              <h3 class="font-extrabold text-base tracking-tight text-slate-900 uppercase" style="font-weight: 800; font-size: 1rem; margin: 0; text-transform: uppercase;">St. Francis of Assisi Church</h3>
              <p class="text-[10px] text-indigo-600 font-bold uppercase tracking-wider" style="font-size: 10px; color: #4f46e5; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin: 2px 0 0 0;">Lusanja Parish Building Fund</p>
              <p class="text-[9px] text-slate-400 font-semibold mt-0.5" style="font-size: 9px; color: #94a3b8; font-weight: 600; margin: 2px 0 0 0;">Kampala, Uganda • Tel: +256 700 000000</p>
            </div>
          </div>
          
          <!-- Receipt Meta -->
          <div class="text-right" style="text-align: right;">
            <h2 class="text-2xl font-black tracking-widest text-slate-900 uppercase" style="font-size: 1.5rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; margin: 0;">RECEIPT</h2>
            <div class="inline-block bg-emerald-500/10 text-emerald-700 font-black text-[10px] tracking-widest px-3 py-1 rounded-full uppercase border border-emerald-500/25 mt-2" style="display: inline-block; background-color: rgba(16, 185, 129, 0.1); color: #047857; font-weight: 900; font-size: 10px; letter-spacing: 0.1em; px: 12px; py: 4px; border-radius: 9999px; border: 1px solid rgba(16, 185, 129, 0.25); text-transform: uppercase; margin-top: 8px;">
              ★ PAID ★
            </div>
          </div>
        </div>

        <!-- Receipt Grid Details (Invoice Style) -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-xs py-6 border-b border-slate-200 text-left" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem 1.5rem; font-size: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-top: 1.5rem; padding-bottom: 1.5rem; text-align: left;">
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Receipt Number:</span>
            <span class="font-mono font-black text-slate-900 text-sm mt-1 block" style="font-family: monospace; font-weight: 900; font-size: 0.875rem; margin-top: 4px; display: block;">${receiptToShow.receiptId}</span>
          </div>
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Date:</span>
            <span class="font-mono font-bold text-slate-900 text-sm mt-1 block" style="font-family: monospace; font-weight: 700; font-size: 0.875rem; margin-top: 4px; display: block;">${receiptToShow.date}</span>
          </div>
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Contributor:</span>
            <span class="font-extrabold text-slate-900 text-sm mt-1 block" style="font-weight: 800; font-size: 0.875rem; margin-top: 4px; display: block;">${receiptToShow.userName}</span>
          </div>
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Purpose / Phase:</span>
            <span class="font-bold text-slate-900 text-sm mt-1 block" style="font-weight: 700; font-size: 0.875rem; margin-top: 4px; display: block;">${receiptToShow.purposeName}</span>
          </div>
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Payment Method:</span>
            <span class="font-bold text-slate-900 text-sm mt-1 block" style="font-weight: 700; margin-top: 4px; display: block;">${receiptToShow.method}</span>
          </div>
          <div>
            <span class="text-slate-400 font-bold uppercase text-[9px] tracking-wider block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em;">Contribution ID:</span>
            <span class="font-mono text-slate-500 text-[11px] mt-1 block" style="font-family: monospace; color: #64748b; font-size: 11px; margin-top: 4px; display: block;">${receiptToShow.id}</span>
          </div>
        </div>

        <!-- Transaction Financial Area -->
        <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4" style="background-color: #f8fafc; border-radius: 1rem; border: 1px solid #f1f5f9; padding: 1.25rem;">
          <div class="flex justify-between items-center text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-3" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #64748b; font-weight: 600; border-bottom: 1px solid rgba(226, 232, 240, 0.6); padding-bottom: 0.75rem;">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div class="flex justify-between items-center text-xs" style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; text-align: left;">
            <div style="text-align: left;">
              <p class="font-bold text-slate-800" style="font-weight: 700; color: #1e293b; margin: 0;">Building Fund Contribution</p>
              <p class="text-[10px] text-slate-400 mt-0.5" style="font-size: 10px; color: #94a3b8; margin: 2px 0 0 0;">Thank you for your partnership in construction</p>
            </div>
            <span class="font-bold text-slate-800" style="font-weight: 700; color: #1e293b;">${formatUGX(receiptToShow.amount)}</span>
          </div>
          
          <!-- Total Highlight -->
          <div class="flex justify-between items-center border-t border-emerald-100 pt-4 bg-emerald-50/50" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(16, 185, 129, 0.1); padding-top: 1rem; background-color: rgba(236, 253, 245, 0.5);">
            <div style="text-align: left;">
              <span class="text-slate-500 font-extrabold uppercase text-[9px] tracking-wider block" style="color: #64748b; font-weight: 800; font-size: 9px; text-transform: uppercase;">Total Amount Received</span>
              <span class="text-[10px] text-emerald-700 font-bold mt-0.5 block italic" style="font-size: 10px; color: #047857; font-weight: 750; font-style: italic; margin-top: 2px; display: block;">Payment in full</span>
            </div>
            <div style="text-align: right;">
              <span class="text-emerald-700 font-black text-xl tracking-tight block" style="color: #047857; font-weight: 900; font-size: 1.25rem; display: block;">${formatUGX(receiptToShow.amount)} UGX</span>
            </div>
          </div>
        </div>

        <!-- Signatures & QR Code Section -->
        <div class="flex justify-between items-end pt-4 gap-4" style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 1rem; gap: 1rem;">
          <!-- Official Stamp & Sign -->
          <div class="text-left" style="text-align: left;">
            <div>
              <div>
                <span class="text-slate-400 text-[9px] uppercase tracking-wider font-bold block" style="color: #94a3b8; font-weight: 700; font-size: 9px; text-transform: uppercase;">Authorized Sign-off:</span>
                <div style="position: relative; display: inline-block; margin-top: 8px;">
                  <p class="font-cursive italic font-bold text-slate-800 text-3xl select-none tracking-wide" style="color: #1e293b; font-size: 1.875rem; margin: 0; z-index: 10; position: relative; padding-left: 8px;">
                    ${receiptToShow.signature || profile?.full_name || "Dr. Sarah Nakato"}
                  </p>
                  <!-- SVG Stamp -->
                  <svg style="position: absolute; top: -24px; right: -48px; width: 80px; height: 80px; color: rgba(5, 150, 105, 0.15); pointer-events: none; z-index: 0; transform: rotate(12deg);" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 3" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1.5" />
                    <text x="50" y="32" text-anchor="middle" font-size="6.5" font-weight="bold" fill="currentColor" letter-spacing="0.5">SFA CHURCH</text>
                    <text x="50" y="52" text-anchor="middle" font-size="12" font-weight="black" fill="currentColor" letter-spacing="1">PAID</text>
                    <text x="50" y="70" text-anchor="middle" font-size="6.5" font-weight="bold" fill="currentColor" letter-spacing="0.5">OFFICIAL SEAL</text>
                  </svg>
                </div>
                <span class="text-[8px] text-slate-400 block font-bold mt-1 uppercase tracking-wider" style="font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-top: 4px; display: block;">Lusanja Parish Treasurer</span>
              </div>
            </div>
          </div>

          <!-- QR Verification -->
          <div class="flex flex-col items-center gap-1.5 shrink-0 bg-white p-2 border border-slate-150 rounded-2xl shadow-sm" style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; background-color: #ffffff; padding: 8px; border: 1px solid #e2e8f0; border-radius: 1rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
            <div class="w-20 h-20 flex items-center justify-center" style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center;">
              ${qrCodeSvg}
            </div>
            <span class="text-[7px] font-black text-slate-400 tracking-widest uppercase" style="font-size: 7px; font-weight: 900; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase;">SCAN TO VERIFY</span>
          </div>
        </div>

        <!-- Decorative cut-out bottom border for paper look -->
        <div class="border-t border-dashed border-slate-200 pt-4 text-center" style="border-top: 1px dashed #e2e8f0; padding-top: 1rem; text-align: center;">
          <p class="text-[9px] text-slate-400 font-semibold tracking-wide" style="font-size: 9px; color: #94a3b8; font-weight: 600; margin: 0; font-style: italic;">
            *"Every man shall give as he is able, according to the blessing of the Lord your God which He has given you."*
          </p>
          <p class="text-[8px] text-indigo-500 font-bold tracking-widest uppercase mt-1" style="font-size: 8px; color: #6366f1; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 4px 0 0 0;">Deuteronomy 16:17</p>
        </div>

      </div>
    </div>
  </div>
</body>
</html>`

    const element = document.createElement('a')
    const file = new Blob([htmlContent], { type: 'text/html' })
    element.href = URL.createObjectURL(file)
    element.download = `SFA_Receipt_${receiptToShow.receiptId}.html`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Load database - maps to invalidateQueries
  const loadData = useCallback(() => {
    queryClient.invalidateQueries()
  }, [queryClient])

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
    const profileList = Object.values(profiles)
    if (profileList.length > 0) {
      setNewPledge(prev => {
        if (prev.userId === 'member-uid') {
          return {
            ...prev,
            userId: profileList[0].id,
            userName: profileList[0].full_name || profileList[0].email
          }
        }
        return prev
      })
    }
  }, [profiles])

  useEffect(() => {
    if (phases.length > 0) {
      setNewPledge(prev => {
        if (!prev.purpose || prev.purpose === 'Roofing & Trussing') {
          return {
            ...prev,
            purpose: phases[0].name
          }
        }
        return prev
      })
    }
  }, [phases])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // Approve Contribution & Auto-generate receipt
  const handleApproveContribution = useCallback((id) => {
    const txn = contributions.find(c => c.id === id)
    if (!txn) return

    const receiptNum = `REC-2026-${Math.floor(100 + Math.random() * 900)}`
    const qrText = `${receiptNum}|${txn.userName}|${txn.amount}|${txn.purposeName}|${new Date().toISOString().slice(0, 10)}`
    
    approveContributionMutation.mutate({
      id,
      signature: profile?.full_name || 'Treasurer',
      receiptId: receiptNum,
      receipt_qr_code: qrText,
      user,
      profile
    }, {
      onSuccess: () => {
        // Dispatch SMS Notification simulation
        setToast({
          type: 'sms',
          message: `SMS message dispatched to ${txn.userName}: "Payment verified successfully. Receipt ${receiptNum} issued."`
        })
        setSelectedContribution(null)
        setTimeout(() => setToast(null), 5000)
      }
    })
  }, [contributions, approveContributionMutation, profile, user])

  // Reject with clarification request
  const handleRejectContribution = () => {
    if (!selectedContribution) return

    rejectContributionMutation.mutate({
      id: selectedContribution.id,
      reason: clarificationText,
      user,
      profile
    }, {
      onSuccess: () => {
        setShowClarifyModal(false)
        setClarificationText('')
        setSelectedContribution(null)
      }
    })
  }

  // Confirm and Create Outflow Expense
  const confirmAndCreateExpense = (expenseData) => {
    const amountNum = expenseData.amount
    const phase = phases.find(p => p.id === expenseData.phaseId)
    
    // Auto flag status: Expenses > 3,700,000 UGX go to Pending Admin Approval, otherwise Approved
    const isSensitive = amountNum >= 3700000
    const expenseStatus = isSensitive ? 'Pending_Approval' : 'Approved'

    const expenseEntry = {
      id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      phaseId: expenseData.phaseId,
      phaseName: phase ? phase.name : 'Unknown',
      description: expenseData.description,
      amount: amountNum,
      category: expenseData.category || 'Contractor Payout',
      status: expenseStatus,
      submittedBy: profile?.full_name || 'Treasurer',
      approvedBy: isSensitive ? '' : (profile?.full_name || 'Treasurer'),
      date: expenseData.date || new Date().toISOString().slice(0, 10)
    }

    createExpenseMutation.mutate({
      expense: expenseEntry,
      user,
      profile
    }, {
      onSuccess: () => {
        setNewExpense({
          description: '',
          amount: '',
          phaseId: phases[0]?.id || 'roofing',
          date: new Date().toISOString().slice(0, 10),
          category: 'Contractor Payout'
        })
        setShowExpenseModal(false)
        setShowExpenseConfirmModal(false)
        setPendingExpenseToCreate(null)
        setExpenseConfirmInput('')
      }
    })
  }

  // Create new expense outflow
  const handleCreateExpense = (e) => {
    e.preventDefault()
    setExpenseErrors(null)

    const validationResult = expenseSchema.safeParse({
      description: newExpense.description,
      amount: newExpense.amount,
      category: newExpense.category,
      phaseId: newExpense.phaseId
    })

    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setExpenseErrors(formattedErrors)
      return
    }

    const validatedData = {
      ...validationResult.data,
      date: newExpense.date
    }

    // Intercept if over 5,000,000 UGX
    if (validatedData.amount > 5000000) {
      setPendingExpenseToCreate(validatedData)
      setShowExpenseConfirmModal(true)
      setExpenseConfirmInput('')
      setShowExpenseModal(false)
      return
    }

    confirmAndCreateExpense(validatedData)
  }

  // Create new member pledge
  const handleCreatePledge = (e) => {
    e.preventDefault()
    setPledgeErrors(null)

    const validationResult = pledgeSchema.safeParse({
      amount: newPledge.amount,
      purpose: newPledge.purpose,
      targetDate: newPledge.targetDate
    })

    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setPledgeErrors(formattedErrors)
      return
    }

    const validatedData = validationResult.data
    const amountNum = validatedData.amount

    const pledgeEntry = {
      id: `PLG-${Math.floor(100 + Math.random() * 900)}`,
      userId: newPledge.userId,
      userName: newPledge.userName,
      amount: amountNum,
      amountPaid: 0,
      targetDate: validatedData.targetDate,
      purpose: validatedData.purpose,
      status: 'Active'
    }

    createPledgeMutation.mutate({
      pledge: pledgeEntry,
      user,
      profile
    }, {
      onSuccess: () => {
        const profileList = Object.values(profiles)
        setNewPledge({
          userId: profileList.length > 0 ? profileList[0].id : 'member-uid',
          userName: profileList.length > 0 ? (profileList[0].full_name || profileList[0].email) : 'Deacon Charles Mugisha',
          amount: '',
          purpose: phases[0]?.name || 'Roofing & Trussing',
          targetDate: ''
        })
      }
    })
  }

  // Record payment against pledge
  const handleRecordPledgePayment = (e) => {
    e.preventDefault()
    if (!selectedPledge) return
    setPaymentErrors(null)

    const validationResult = contributionSchema.safeParse({
      amount: paymentAmount,
      purposeType: 'phase',
      purposeName: selectedPledge.purpose,
      method: paymentMethod,
      reference: paymentReference
    })

    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setPaymentErrors(formattedErrors)
      return
    }

    const validatedData = validationResult.data
    const amountNum = validatedData.amount

    const receiptNum = `REC-2026-${Math.floor(100 + Math.random() * 900)}`
    const qrText = `${receiptNum}|${selectedPledge.userName}|${amountNum}|${selectedPledge.purpose}|${new Date().toISOString().slice(0, 10)}`
    
    const txn = {
      userId: selectedPledge.userId,
      userName: selectedPledge.userName,
      amount: amountNum,
      purposeType: 'phase',
      purposeName: selectedPledge.purpose,
      method: validatedData.method,
      reference: validatedData.reference,
      date: new Date().toISOString(),
      status: 'Approved',
      receiptId: receiptNum,
      receipt_qr_code: qrText,
      signature: profile?.full_name || 'Treasurer'
    }

    const newPaid = selectedPledge.amountPaid + amountNum
    const newStatus = newPaid >= selectedPledge.amount ? 'Completed' : 'Active'

    recordPledgePaymentMutation.mutate({
      pledgeId: selectedPledge.id,
      amountPaid: newPaid,
      status: newStatus,
      user,
      profile,
      contribution: txn
    }, {
      onSuccess: () => {
        setShowRecordPaymentModal(false)
        setSelectedPledge(null)
        setPaymentAmount('')
        setPaymentReference('')
      }
    })
  }

  // Close Event and trigger final report
  const handleCloseEvent = (eventId) => {
    const eventObj = events.find(e => e.id === eventId)
    if (!eventObj) return

    completeEventMutation.mutate({
      id: eventId,
      user,
      profile,
      eventName: eventObj.name,
      income: eventObj.income,
      expenses: eventObj.expenses
    })
  }

  // Perform QR/Receipt Verification Search
  const handleVerifyQRReceipt = (e) => {
    e.preventDefault()
    setHasSearchedQR(true)
    const cleanQuery = qrVerifyInput.trim()

    // 1. Search directly by receiptId
    let receipt = contributions.find(c => c.receiptId === cleanQuery || c.id === cleanQuery || c.reference === cleanQuery)

    // 2. Search by raw QR data splitting
    if (!receipt && cleanQuery.includes('|')) {
      const parts = cleanQuery.split('|')
      const receiptId = parts[0]
      receipt = contributions.find(c => c.receiptId === receiptId)
    }

    setVerificationResult(receipt)
  }

  // Duplicate Reference Check (Excludes official batch ledger file headers, checks pending deposits)
  const checkDuplicates = () => {
    const references = contributions
      .filter(c => c.status === 'Pending' && c.reference && !c.reference.startsWith('Ledger File') && !c.reference.toLowerCase().includes('ledger'))
      .map(c => c.reference.trim())
    const duplicates = references.filter((item, index) => references.indexOf(item) !== index)
    return [...new Set(duplicates)]
  }
  const duplicateRefs = checkDuplicates()

  // Export to Excel / CSV with Excel UTF-8 BOM compatibility
  const handleExportCSV = () => {
    const headers = ['Date', 'Member Name', 'Amount UGX', 'Phase/Purpose', 'Status']
    const rows = contributions.map(c => [
      c.date,
      c.userName,
      c.amount,
      `${c.purposeType || ''}: ${c.purposeName || ''}`,
      c.status
    ])

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `SFA_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Financial Calculations wrapped in useMemo for performance
  const approvedTx = useMemo(() => contributions.filter(c => c.status === 'Approved'), [contributions])
  const totalCollected = useMemo(() => approvedTx.reduce((sum, c) => sum + c.amount, 0), [approvedTx])
  const pendingTx = useMemo(() => contributions.filter(c => c.status === 'Pending'), [contributions])
  const pendingTxCount = useMemo(() => pendingTx.length, [pendingTx])
  
  const totalSpent = useMemo(() => expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0), [expenses])
  
  // Month-to-Date Collections (June 2026 in dummy data timeline)
  const mtdTx = useMemo(() => approvedTx.filter(c => c.date && c.date.startsWith('2026-06')), [approvedTx])
  const mtdTotal = useMemo(() => mtdTx.reduce((sum, c) => sum + c.amount, 0), [mtdTx])

  // Search filter implementation
  const filteredContributions = useMemo(() => {
    return contributions.filter(c => {
      const query = (searchQuery || '').toLowerCase()
      const userName = (c.userName || '').toLowerCase()
      const reference = (c.reference || '').toLowerCase()
      const matchesQuery = userName.includes(query) || reference.includes(query)
      
      if (subTab === 'pending') {
        return matchesQuery && c.status === 'Pending'
      } else {
        return matchesQuery && c.status !== 'Pending'
      }
    })
  }, [contributions, searchQuery, subTab])

  // Gateway Reconciled Sums
  const bankReconciledSum = useMemo(() => {
    return approvedTx.filter(c => (c.method || '').includes('Bank')).reduce((sum, c) => sum + (c.amount || 0), 0)
  }, [approvedTx])

  const mtnReconciledSum = useMemo(() => {
    return approvedTx.filter(c => (c.method || '').includes('Money')).reduce((sum, c) => sum + (c.amount || 0), 0)
  }, [approvedTx])

  // Pledge Metrics
    const pledgeMetrics = useMemo(() => {
    const totalPledged = pledges.reduce((sum, p) => sum + p.amount, 0)
    const totalPaid = pledges.reduce((sum, p) => sum + p.amountPaid, 0)
    return {
      totalPledged,
      totalPaid,
      outstanding: Math.max(0, totalPledged - totalPaid)
    }
  }, [pledges])

  // System Data Page filtering and pagination
  const filteredRawContributions = useMemo(() => {
    return contributions.filter(c => {
      const q = (systemDataSearch || '').toLowerCase().trim()
      const matchesSearch = !q || 
        (c.userName && String(c.userName).toLowerCase().includes(q)) ||
        (c.purposeName && String(c.purposeName).toLowerCase().includes(q)) ||
        (c.method && String(c.method).toLowerCase().includes(q)) ||
        (c.reference_number && String(c.reference_number).toLowerCase().includes(q)) ||
        (c.reference && String(c.reference).toLowerCase().includes(q)) ||
        String(c.amount || '').includes(q)
      
      const filterStatus = String(systemDataStatusFilter || 'all').toLowerCase()
      const matchesStatus = filterStatus === 'all' || 
        (c.status && String(c.status).toLowerCase() === filterStatus)

      return matchesSearch && matchesStatus
    })
  }, [contributions, systemDataSearch, systemDataStatusFilter])

  const filteredRawExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = (systemDataSearch || '').toLowerCase().trim()
      const matchesSearch = !q ||
        (e.description && String(e.description).toLowerCase().includes(q)) ||
        (e.phaseName && String(e.phaseName).toLowerCase().includes(q)) ||
        (e.submittedBy && String(e.submittedBy).toLowerCase().includes(q)) ||
        (e.voucher_number && String(e.voucher_number).toLowerCase().includes(q)) ||
        String(e.amount || '').includes(q)

      const filterStatus = String(systemDataStatusFilter || 'all').toLowerCase()
      const matchesStatus = filterStatus === 'all' ||
        (e.status && String(e.status).toLowerCase().includes(filterStatus))

      return matchesSearch && matchesStatus
    })
  }, [expenses, systemDataSearch, systemDataStatusFilter])

  const filteredRawAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      const q = (systemDataSearch || '').toLowerCase().trim()
      const rawDetails = l.details || l.description || ''
      const detailsStr = typeof rawDetails === 'object' && rawDetails !== null ? JSON.stringify(rawDetails) : String(rawDetails)
      return !q ||
        (l.action && String(l.action).toLowerCase().includes(q)) ||
        (detailsStr && detailsStr.toLowerCase().includes(q)) ||
        (l.user_email && String(l.user_email).toLowerCase().includes(q)) ||
        (l.entity_type && String(l.entity_type).toLowerCase().includes(q))
    })
  }, [auditLogs, systemDataSearch])

  // Paginated Slices
  const paginatedRawContributions = useMemo(() => {
    const start = (systemDataPage - 1) * systemDataItemsPerPage
    return filteredRawContributions.slice(start, start + systemDataItemsPerPage)
  }, [filteredRawContributions, systemDataPage, systemDataItemsPerPage])

  const totalContributionPages = Math.max(1, Math.ceil(filteredRawContributions.length / systemDataItemsPerPage))

  const paginatedRawExpenses = useMemo(() => {
    const start = (systemDataPage - 1) * systemDataItemsPerPage
    return filteredRawExpenses.slice(start, start + systemDataItemsPerPage)
  }, [filteredRawExpenses, systemDataPage, systemDataItemsPerPage])

  const totalExpensePages = Math.max(1, Math.ceil(filteredRawExpenses.length / systemDataItemsPerPage))

  const paginatedRawAuditLogs = useMemo(() => {
    const start = (systemDataPage - 1) * systemDataItemsPerPage
    return filteredRawAuditLogs.slice(start, start + systemDataItemsPerPage)
  }, [filteredRawAuditLogs, systemDataPage, systemDataItemsPerPage])

  const totalAuditPages = Math.max(1, Math.ceil(filteredRawAuditLogs.length / systemDataItemsPerPage))

  const netBalance = useMemo(() => totalCollected - totalSpent, [totalCollected, totalSpent])

  // Financial Reports Filter & Customizer States
  const [reportYear, setReportYear] = useState('all')
  const [reportMonth, setReportMonth] = useState('all')
  const [reportItem, setReportItem] = useState('all')
  const [showReportConfigConsole, setShowReportConfigConsole] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [reportConfig, setReportConfig] = useState({
    showSummary: true,
    showIncome: true,
    showExpenditure: true,
    showPhaseBreakdown: true,
    showRemarks: true,
    showSignatures: true,
    customTitle: 'St. Francis of Assisi Church - Lusanja',
    treasurerRemarks: 'All periodic contributions and project expenditures have been verified against parish bank deposits and ledger receipts. Phase 3 roofing trussing allocation is approved.'
  })

  const toggleReportSection = (key) => {
    setReportConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDownloadStatementPDF = async () => {
    try {
      setIsGeneratingPDF(true)
      const element = document.getElementById('printable-report')
      if (!element) {
        window.print()
        return
      }

      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`St_Francis_Church_Financial_Statement_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error('PDF generation error, opening browser print dialog:', err)
      window.print()
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const reportFilteredContributions = useMemo(() => {
    let list = contributions.filter(c => c.status === 'Approved')
    if (reportYear !== 'all') {
      list = list.filter(c => {
        if (!c.date) return false
        const yr = new Date(c.date).getUTCFullYear().toString()
        return yr === reportYear
      })
    }
    if (reportMonth !== 'all') {
      list = list.filter(c => {
        if (!c.date) return false
        const mo = new Date(c.date).getUTCMonth().toString()
        return mo === reportMonth
      })
    }
    if (reportItem !== 'all') {
      list = list.filter(c => c.purposeName === reportItem)
    }
    return list
  }, [contributions, reportYear, reportMonth, reportItem])

  const reportFilteredExpenses = useMemo(() => {
    let list = expenses.filter(e => e.status === 'Approved')
    if (reportYear !== 'all') {
      list = list.filter(e => {
        if (!e.date) return false
        const yr = new Date(e.date).getUTCFullYear().toString()
        return yr === reportYear
      })
    }
    if (reportMonth !== 'all') {
      list = list.filter(e => {
        if (!e.date) return false
        const mo = new Date(e.date).getUTCMonth().toString()
        return mo === reportMonth
      })
    }
    if (reportItem !== 'all') {
      list = list.filter(e => e.phaseName === reportItem)
    }
    return list
  }, [expenses, reportYear, reportMonth, reportItem])

  const reportTotalCollected = useMemo(() => {
    return reportFilteredContributions.reduce((sum, c) => sum + c.amount, 0)
  }, [reportFilteredContributions])

  const reportTotalSpent = useMemo(() => {
    return reportFilteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [reportFilteredExpenses])

  const reportNetBalance = useMemo(() => {
    return reportTotalCollected - reportTotalSpent
  }, [reportTotalCollected, reportTotalSpent])

  const contributionsGrouped = useMemo(() => {
    const groups = {}
    reportFilteredContributions.forEach(c => {
      const groupName = c.purposeType === 'event' ? `Event: ${c.purposeName}` : `Phase: ${c.purposeName}`
      if (!groups[groupName]) {
        groups[groupName] = { items: [], subtotal: 0 }
      }
      groups[groupName].items.push(c)
      groups[groupName].subtotal += c.amount
    })
    return groups
  }, [reportFilteredContributions])

  const expensesGrouped = useMemo(() => {
    const groups = {}
    reportFilteredExpenses.forEach(e => {
      const phaseName = e.phaseName || 'Unknown Phase'
      if (!groups[phaseName]) {
        groups[phaseName] = { items: [], subtotal: 0 }
      }
      groups[phaseName].items.push(e)
      groups[phaseName].subtotal += e.amount
    })
    return groups
  }, [reportFilteredExpenses])

  const phaseBudgetVsActual = useMemo(() => {
    return phases.map(p => {
      const collected = reportFilteredContributions
        .filter(c => c.purposeType === 'phase' && c.purposeName === p.name)
        .reduce((sum, c) => sum + c.amount, 0)
      const spent = reportFilteredExpenses
        .filter(e => e.phaseId === p.id)
        .reduce((sum, e) => sum + e.amount, 0)
      return {
        id: p.id,
        name: p.name,
        budget: p.budget,
        collected,
        spent,
        progress: p.progress
      }
    })
  }, [phases, reportFilteredContributions, reportFilteredExpenses])


  const cumulativeChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthlySums = months.map(() => 0)

    approvedTx.forEach(c => {
      if (c.date) {
        const dateObj = new Date(c.date)
        const monthIndex = dateObj.getMonth()
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlySums[monthIndex] += Number(c.amount)
        }
      }
    })

    let cumulative = 0
    return months.map((m, index) => {
      cumulative += monthlySums[index]
      return { name: m, Amount: cumulative }
    })
  }, [approvedTx])

  const CustomAreaTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl shadow-2xl space-y-1 text-xs">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Cumulative Collections</p>
          <p className="text-base font-black text-amber-500">{formatUGX(value)}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Approved transactions grow path</p>
        </div>
      )
    }
    return null
  }

  const CustomFundraisingTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const target = data.targetAmount || 0
      const income = data.income || 0
      const percentVal = target > 0 ? ((income / target) * 100).toFixed(1) : 0
      return (
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-xl space-y-1 text-xs">
          <p className="font-extrabold text-indigo-455 text-indigo-400 text-sm mb-1">{data.name}</p>
          <div className="flex justify-between space-x-8">
            <span className="text-slate-400">Target Goal:</span>
            <span className="font-bold">{formatUGX(target)}</span>
          </div>
          <div className="flex justify-between space-x-8">
            <span className="text-slate-400">Income Raised:</span>
            <span className="font-bold text-emerald-400">{formatUGX(income)}</span>
          </div>
          <div className="flex justify-between space-x-8 border-t border-slate-800 pt-1 mt-1">
            <span className="text-slate-400">Completion:</span>
            <span className={`font-black ${parseFloat(percentVal) >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {percentVal}% achieved
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex font-sans transition-colors duration-200">
      
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-25 lg:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 z-30 lg:relative lg:translate-x-0 lg:flex h-full flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 rounded-xl object-cover shadow-md" alt="SFA Logo" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">SFA Church</h2>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">Treasurer Dept</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button 
              onClick={() => { setActiveTab('manual_contribution'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'manual_contribution' 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Record Contribution</span>
            </button>

            <button 
              onClick={() => { setActiveTab('contributions_ledger'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'contributions_ledger' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Coins className="w-4 h-4 text-indigo-500" />
              <span>Contributions Ledger</span>
            </button>

            <button 
              onClick={() => { setActiveTab('financials'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'financials' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Financial Reports</span>
            </button>

            <button 
              onClick={() => { setActiveTab('system_data'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'system_data' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>System Data Hub</span>
            </button>

            <button 
              onClick={() => { setActiveTab('verifications'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'verifications' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CheckSquare className="w-4 h-4" />
                <span>Verify Payments</span>
              </div>
              {pendingTxCount > 0 && (
                <span className="bg-indigo-650 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {pendingTxCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('expenses'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'expenses' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Project Outflows</span>
            </button>

            <button 
              onClick={() => { setActiveTab('fundraising'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'fundraising' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Fundraising Events</span>
            </button>

            <button 
              onClick={() => { setActiveTab('pledges'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'pledges' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pledge Tracker</span>
            </button>

            <button 
              onClick={() => { setActiveTab('feedback'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'feedback' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-4 h-4" />
                <span>Feedback Inbox</span>
              </div>
              {feedback.filter(f => f.status === 'Pending').length > 0 && (
                <span className="bg-indigo-650 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {feedback.filter(f => f.status === 'Pending').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('qrverify'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all font-semibold cursor-pointer ${
                activeTab === 'qrverify' 
                  ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>QR Verification</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              TR
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-250 leading-none truncate">{profile?.full_name}</p>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Chief Treasurer</span>
            </div>
          </div>

          <button 
            onClick={() => { signOut(); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 text-slate-500 dark:text-slate-450 hover:text-rose-600 text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {activeTab === 'dashboard' ? 'Financial Hub Overview' : 
               activeTab === 'manual_contribution' ? 'Record Manual / Offline Contribution' :
               activeTab === 'contributions_ledger' ? 'Master Contributions Ledger' :
               activeTab === 'financials' ? 'Audited Financial Statements' :
               activeTab === 'system_data' ? 'System Data & Raw Audit Records' :
               activeTab === 'verifications' ? 'Payment Verification Center' : 
               activeTab === 'expenses' ? 'Outflow Expense Manager' : 
               activeTab === 'pledges' ? 'Pledge Tracking System' :
               activeTab === 'fundraising' ? 'Event Fundraising Operations' :
               activeTab === 'qrverify' ? 'QR Code Receipt Verification' :
               activeTab === 'feedback' ? 'Member Feedback Inbox Hub' :
               'Master Contributions Ledger'}
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
            <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-700 hidden sm:inline-block">
              Uganda Shilling (UGX) Portal
            </span>
          </div>
        </header>

        {/* Outer Dashboard Scrollable Body */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in">

          {/* Metric Grid */}
          {(activeTab === 'dashboard' || activeTab === 'verifications' || activeTab === 'expenses' || activeTab === 'fundraising') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Total Verified Funds */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Verified Funds</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{formatUGX(totalCollected)}</h3>
                  <div className="flex items-center mt-1 text-[11px]">
                    <span className="text-emerald-600 font-bold flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +12%
                    </span>
                    <span className="text-slate-400 ml-1.5 font-semibold">this month</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Pending Verifications */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Verifications</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pendingTxCount > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-slate-50 text-slate-400'}`}>
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{pendingTxCount} Pending</h3>
                  <div className="flex items-center mt-1 text-[11px]">
                    {pendingTxCount > 0 ? (
                      <>
                        <span className="text-amber-600 font-bold flex items-center">
                          <AlertCircle className="w-3 h-3 mr-0.5" /> Action Req.
                        </span>
                        <span className="text-slate-400 ml-1.5 font-semibold">Requires verification</span>
                      </>
                    ) : (
                      <span className="text-emerald-600 font-bold">All cleared</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Total Project Outflows */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Project Outflows</span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <TrendingDown className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{formatUGX(totalSpent)}</h3>
                  <div className="flex items-center mt-1 text-[11px]">
                    <span className="text-rose-600 font-bold flex items-center">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> +8%
                    </span>
                    <span className="text-slate-400 ml-1.5 font-semibold">this month</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Month-to-Date Collections */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month-to-Date Collections</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center">
                    <Coins className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-2.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{formatUGX(mtdTotal)}</h3>
                  <div className="flex items-center mt-1 text-[11px]">
                    <span className="text-emerald-600 font-bold flex items-center">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> +22%
                    </span>
                    <span className="text-slate-400 ml-1.5 font-semibold">vs last month</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <>
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
                    <div key={member.id} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-105 dark:border-slate-800 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {member.fullName.charAt(0)}
                      </div>
                      <div className="truncate text-xs font-semibold">
                        <p className="text-slate-800 dark:text-slate-200 truncate" title={member.fullName}>{member.fullName}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-400 truncate">{member.roleTitle}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate references warning */}
              {duplicateRefs.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-850 rounded-2xl p-5 flex items-center space-x-4 shadow-sm">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">Fraud Protection Audit Warning</h4>
                    <p className="text-xs text-rose-700 mt-1 font-semibold">
                       Duplicate reference numbers detected on pending deposits: <strong className="font-mono text-rose-950">{duplicateRefs.join(', ')}</strong>. Verify slips immediately to block duplicate receipt logs.
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs Switcher Container */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-md w-full">
                <button
                  onClick={() => setDashboardSubTab('analytics')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all border-0 cursor-pointer ${
                    dashboardSubTab === 'analytics'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
                  }`}
                >
                  Financial Analytics
                </button>
                <button
                  onClick={() => setDashboardSubTab('transactions')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all border-0 cursor-pointer ${
                    dashboardSubTab === 'transactions'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent'
                  }`}
                >
                  Recent Transactions
                </button>
              </div>

              {/* TAB CONTENT: FINANCIAL ANALYTICS */}
              {dashboardSubTab === 'analytics' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Uganda Shilling (UGX) Collections Growth</h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Approved contributions cumulative track (2026)</p>
                  </div>
                  
                  <div className="h-72 text-xs mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeChartData}>
                        <defs>
                          <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.01}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip content={<CustomAreaTooltip />} />
                        <Area type="monotone" dataKey="Amount" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: RECENT TRANSACTIONS */}
              {dashboardSubTab === 'transactions' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Quick Table View for Fast Check */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Recent Contributions Awaiting Check</h4>
                      <button 
                        onClick={() => setActiveTab('verifications')} 
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-0.5 cursor-pointer bg-transparent border-0"
                      >
                        <span>Verification Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                            <th className="pb-3.5 font-bold">Transaction</th>
                            <th className="pb-3.5 font-bold">Donor</th>
                            <th className="pb-3.5 font-bold">Amount (UGX)</th>
                            <th className="pb-3.5 font-bold">Payment Method</th>
                            <th className="pb-3.5 font-bold">Reference Code</th>
                            <th className="pb-3.5 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-slate-700 dark:text-slate-305">
                          {contributions.slice(0, 4).map(c => (
                            <tr key={c.id} className="text-slate-750 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 font-mono text-slate-400 font-bold">{c.id}</td>
                              <td className="py-3.5 font-bold text-slate-850 dark:text-slate-200">{c.userName}</td>
                              <td className="py-3.5 font-bold text-slate-900 dark:text-white">{formatUGX(c.amount)}</td>
                              <td className="py-3.5">{c.method}</td>
                              <td className="py-3.5 font-mono text-[11px] text-slate-500">{c.reference}</td>
                              <td className="py-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  c.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  c.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Audit Logs Sidebar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center text-slate-800 dark:text-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider">Church Audit History</h4>
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:rotate-180 transition-all duration-300" onClick={loadData} />
                    </div>
                    
                    <div className="space-y-4 overflow-y-auto pr-1 flex-1 mt-4 max-h-60">
                      {auditLogs.slice(0, 5).map(log => (
                        <div key={log.id} className="text-xs border-b border-slate-50 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0 leading-snug">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{log.action}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{log.details}</p>
                          <p className="text-slate-400 font-mono text-[9px] mt-1">{log.date}</p>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setActiveTab('reconcile')}
                      className="w-full text-center py-2 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-indigo-650 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all mt-4 cursor-pointer"
                    >
                      View Reconciliations Gateways
                    </button>
                  </div>

                </div>
              )}
            </>
          )}

          {/* TAB: VERIFICATIONS (Smart Data Table Pane) */}
          {activeTab === 'verifications' && (
            <div className="space-y-6">
              
              {/* Financial Actions Action Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex flex-wrap gap-3 items-center justify-between">
                <div className="flex items-center space-x-2.5 shrink-0">
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Financial Operations</span>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <button 
                    onClick={handleExportCSV}
                    className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export to Excel (.csv)</span>
                  </button>

                  <button 
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                    <span>Generate Monthly Report</span>
                  </button>

                  <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Log Outflow/Expense</span>
                  </button>
                </div>
              </div>

              {/* Data Table Workspace */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                
                {/* Table search, duplicate warning status, and Tabs */}
                <div className="p-6 border-b border-slate-105 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Tab Switcher */}
                  <div className="flex bg-slate-105 dark:bg-slate-800 p-1 rounded-lg w-fit shrink-0">
                    <button
                      onClick={() => setSubTab('pending')}
                      className={`px-4 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                        subTab === 'pending'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Pending Verifications ({pendingTxCount})
                    </button>
                    <button
                      onClick={() => setSubTab('history')}
                      className={`px-4 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                        subTab === 'history'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Verification History
                    </button>
                  </div>

                  {/* Real-time search bar */}
                  <div className="relative max-w-sm w-full font-medium">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input 
                      type="text"
                      placeholder="Search member name or Reference ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 placeholder-slate-450 text-slate-700"
                    />
                  </div>
                </div>

                {/* Mobile Stacked Data Cards View (<768px) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/80 p-4 space-y-4">
                  {filteredContributions.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No contributions found matching the query or filter tab.
                    </div>
                  ) : (
                    filteredContributions.map(c => {
                      const isDuplicate = duplicateRefs.includes(c.reference)
                      return (
                        <div key={c.id} className="pt-3 first:pt-0 space-y-2.5 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-mono text-[10px] text-slate-400 font-bold block">{c.id}</span>
                              <h5 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{c.userName}</h5>
                              <p className="text-[11px] text-slate-500 font-medium">{c.purposeName}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                                {formatUGX(c.amount)}
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 ${
                                c.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                c.status === 'Pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                                'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                            <span>Method: <strong className="text-slate-700 dark:text-slate-300">{c.method}</strong></span>
                            <span>Ref: <strong className="text-indigo-600 dark:text-indigo-400">{c.reference}</strong></span>
                          </div>

                          {isDuplicate && (
                            <div className="flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold p-2 rounded-xl border border-rose-200 dark:border-rose-900">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>Duplicate Reference Code Detected</span>
                            </div>
                          )}

                          {c.status === 'Pending' && (
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                onClick={() => handleApproveContribution(c.id)}
                                className="flex-1 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 touch-active cursor-pointer shadow-sm"
                              >
                                <Check className="w-4 h-4" />
                                <span>Verify & Issue Receipt</span>
                              </button>
                              <button
                                onClick={() => { setSelectedContribution(c); setShowClarifyModal(true); }}
                                className="py-2.5 px-3.5 min-h-[44px] bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 touch-active cursor-pointer border border-rose-500/20"
                              >
                                <X className="w-4 h-4" />
                                <span>Clarify</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Desktop Table View (>=768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 font-extrabold uppercase">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Member Name</th>
                        <th className="p-4">Amount (UGX)</th>
                        <th className="p-4">Payment Method</th>
                        <th className="p-4">Reference ID</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {filteredContributions.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-12 text-center text-slate-450 font-medium">
                            No contributions found matching the query or filter tab.
                          </td>
                        </tr>
                      ) : (
                        filteredContributions.map(c => {
                          const isDuplicate = duplicateRefs.includes(c.reference)
                          return (
                            <tr 
                              key={c.id} 
                              onClick={() => setSelectedContribution(c)}
                              className="text-slate-705 dark:text-slate-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors border-l-2 border-transparent hover:border-indigo-500"
                            >
                              <td className="p-4 font-mono text-slate-400 font-bold">{c.id}</td>
                              <td className="p-4 font-extrabold text-slate-900 dark:text-white">{c.userName}</td>
                              <td className="p-4 font-extrabold text-slate-900 dark:text-white">{formatUGX(c.amount)}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  c.method === 'Mobile Money' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900' :
                                  c.method === 'Bank Transfer' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900' :
                                  'bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                                }`}>
                                  {c.method}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-slate-650 dark:text-slate-350 flex items-center space-x-2">
                                <span>{c.reference}</span>
                                {isDuplicate && (
                                  <span className="flex items-center space-x-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-450 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 shrink-0">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-650 animate-pulse" />
                                    <span>Duplicate Code</span>
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-slate-400 font-mono text-[11px]">{c.date}</td>
                              <td className="p-4 text-right">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-block ${
                                  c.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  c.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RECORD MANUAL CONTRIBUTION */}
          {activeTab === 'manual_contribution' && (
            <div className="max-w-4xl mx-auto space-y-6 text-left">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-indigo-950 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      Record Manual / Offline Contribution
                      <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Instant Approval & Receipting</span>
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 font-medium">
                      Input offline cash gifts, Sunday offertory collections, direct bank deposits, cheque donations, tithes, and envelope contributions directly into the parish ledger.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('contributions_ledger')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border border-white/20 cursor-pointer shrink-0"
                >
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>View Contributions Ledger</span>
                </button>
              </div>

              {/* Form Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <form onSubmit={handleRecordManualContributionSubmit} className="space-y-6">
                  
                  {/* Grid Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold">
                    
                    {/* Contributor Name */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Contributor / Donor Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="Search parishioner name or enter walk-in donor (e.g. Mukasa Joseph / Sunday Offertory)"
                          value={manualContrib.userName}
                          onChange={e => setManualContrib({ ...manualContrib, userName: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Purpose / Building Phase */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Contribution Purpose / Project <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={manualContrib.purposeName}
                        onChange={e => setManualContrib({ ...manualContrib, purposeName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="Building Construction Fund">Building Construction Fund</option>
                        <option value="Sunday Offertory Collection">Sunday Offertory Collection</option>
                        <option value="Parish Building Envelope">Parish Building Envelope</option>
                        <option value="Monthly Tithe Payout">Monthly Tithe Payout</option>
                        <option value="Roofing & Trussing Fund">Roofing & Trussing Fund</option>
                        <option value="Plastering & Finishes">Plastering & Finishes</option>
                        <option value="Special Fundraising Pledge">Special Fundraising Pledge</option>
                      </select>
                    </div>

                    {/* Amount UGX */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Amount (UGX) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1000"
                          placeholder="e.g. 500000"
                          value={manualContrib.amount}
                          onChange={e => setManualContrib({ ...manualContrib, amount: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-black text-emerald-600 dark:text-emerald-400 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      {manualContrib.amount && (
                        <p className="text-[11px] text-slate-400 font-mono font-bold">
                          Formatted: <span className="text-emerald-600 dark:text-emerald-400">{formatUGX(manualContrib.amount)}</span>
                        </p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Payment Channel / Method <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={manualContrib.method}
                        onChange={e => setManualContrib({ ...manualContrib, method: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="Cash">Cash Handover</option>
                        <option value="Direct Bank Deposit">Direct Bank Deposit (Centenary)</option>
                        <option value="Cheque">Cheque Payout</option>
                        <option value="Mobile Money">Mobile Money (MTN/Airtel)</option>
                      </select>
                    </div>

                    {/* Reference Number */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Reference / Bank Deposit / Slip No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. SLIP-884920 or CHQ-00492 (Optional)"
                        value={manualContrib.reference}
                        onChange={e => setManualContrib({ ...manualContrib, reference: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Date */}
                    <div className="space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Contribution Date
                      </label>
                      <input
                        type="date"
                        value={manualContrib.date}
                        onChange={e => setManualContrib({ ...manualContrib, date: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Notes / Remarks */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        Treasurer Audit Notes / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Collected during 2nd Mass Sunday Service envelope collection"
                        value={manualContrib.notes}
                        onChange={e => setManualContrib({ ...manualContrib, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                  </div>

                  {/* High Value Confirmation Notice */}
                  {showHighValueConfirm && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-600 dark:text-amber-400 text-xs font-semibold space-y-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                        <div>
                          <strong className="block font-black text-slate-900 dark:text-white text-sm">High-Value Cash Confirmation</strong>
                          <span>You are recording a manual contribution exceeding UGX 1,000,000. Please confirm that physical cash or bank confirmation has been verified.</span>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-1">
                        <button
                          type="button"
                          onClick={handleRecordManualContributionSubmit}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm"
                        >
                          Confirm & Record UGX {formatUGX(manualContrib.amount)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowHighValueConfirm(false)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={recordManualContribMutation.isPending}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer touch-active border-0"
                  >
                    {recordManualContribMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Recording Contribution...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Record Manual Contribution & Generate Receipt</span>
                      </>
                    )}
                  </button>

                </form>
              </div>
            </div>
          )}

          {/* TAB: UNIFIED CONTRIBUTIONS LEDGER */}
          {activeTab === 'contributions_ledger' && (
            <div className="space-y-6 text-left">
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      Master Contributions Ledger
                      <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Online & Manual Offline Unified</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Inspect all contributions made across the parish system — online mobile money payments, bank transfers, Sunday offertory collections, and manual treasurer entries.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('manual_contribution')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Manual Contribution</span>
                </button>
              </div>

              {/* Ledger Table & Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative max-w-md w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="Search donor name, receipt #, reference, or purpose..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Stacked Data Cards View (<768px) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
                  {contributions
                    .filter(c => {
                      const query = (searchQuery || '').toLowerCase().trim()
                      return !query || (
                        (c.userName && String(c.userName).toLowerCase().includes(query)) ||
                        (c.reference && String(c.reference).toLowerCase().includes(query)) ||
                        (c.receiptId && String(c.receiptId).toLowerCase().includes(query)) ||
                        (c.purposeName && String(c.purposeName).toLowerCase().includes(query))
                      )
                    })
                    .map(c => (
                      <div key={c.id} className="pt-3 first:pt-0 space-y-2.5 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">{c.receiptId || c.id}</span>
                            <h5 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{c.userName}</h5>
                            <p className="text-[11px] text-slate-500 font-medium">{c.purposeName}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                              {formatUGX(c.amount)}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 ${
                              c.entrySource === 'Manual Treasurer Entry' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' :
                              'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {c.entrySource || 'Online Member Payment'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                          <span>Method: <strong className="text-slate-700 dark:text-slate-300">{c.method}</strong></span>
                          <span>Ref: <strong className="text-indigo-600 dark:text-indigo-400">{c.reference}</strong></span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-slate-400 text-[10px] font-mono">{c.date}</span>
                          <button
                            onClick={() => setReceiptToShow(c)}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            View Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Desktop Table View (>=768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 font-extrabold uppercase">
                        <th className="p-4">Receipt #</th>
                        <th className="p-4">Donor Name</th>
                        <th className="p-4">Amount (UGX)</th>
                        <th className="p-4">Purpose / Phase</th>
                        <th className="p-4">Channel / Method</th>
                        <th className="p-4">Entry Source</th>
                        <th className="p-4">Date</th>
                        <th className="p-4 text-right">Receipt Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {contributions
                        .filter(c => {
                          const query = (searchQuery || '').toLowerCase().trim()
                          return !query || (
                            (c.userName && String(c.userName).toLowerCase().includes(query)) ||
                            (c.reference && String(c.reference).toLowerCase().includes(query)) ||
                            (c.receiptId && String(c.receiptId).toLowerCase().includes(query)) ||
                            (c.purposeName && String(c.purposeName).toLowerCase().includes(query))
                          )
                        })
                        .map(c => (
                          <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 font-mono font-extrabold text-indigo-600 dark:text-indigo-400">{c.receiptId || c.id}</td>
                            <td className="p-4 font-extrabold text-slate-900 dark:text-white">{c.userName}</td>
                            <td className="p-4 font-black text-emerald-600 dark:text-emerald-400">{formatUGX(c.amount)}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-300">{c.purposeName}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {c.method}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                c.entrySource === 'Manual Treasurer Entry'
                                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {c.entrySource || 'Online Member Payment'}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-[11px] text-slate-400">{c.date}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setReceiptToShow(c)}
                                className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors"
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FINANCIAL REPORTS */}
          {activeTab === 'financials' && (
            <div className="space-y-6">
              
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl print:hidden shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Audited Financial Statements</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Generate, customize, and export certified parish statements</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => setShowReportConfigConsole(!showReportConfigConsole)}
                    className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                    <span>{showReportConfigConsole ? 'Hide Customizer' : 'Customize Report'}</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleDownloadStatementPDF}
                    disabled={isGeneratingPDF}
                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-white" />
                    )}
                    <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black transition-all shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Statement</span>
                  </button>
                </div>
              </div>

              {/* REPORT CUSTOMIZER & TREASURER REMARKS CONSOLE */}
              {showReportConfigConsole && (
                <div className="print:hidden bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5 text-left animate-fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <Settings2 className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Treasurer's Report Builder & Addendum Drawer</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Changes update report preview instantly</span>
                  </div>

                  {/* Section Checkboxes */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Include / Exclude Statement Sections</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-bold">
                      {[
                        { key: 'showSummary', label: '1. Summary Balance Sheet' },
                        { key: 'showIncome', label: '2. Income Statement' },
                        { key: 'showExpenditure', label: '3. Expenditure Statement' },
                        { key: 'showPhaseBreakdown', label: '4. Budget vs. Actual' },
                        { key: 'showRemarks', label: '5. Treasurer Remarks' },
                        { key: 'showSignatures', label: '6. Signatures & Sign-off' }
                      ].map(item => (
                        <label 
                          key={item.key} 
                          className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                            reportConfig[item.key]
                              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                              : 'bg-slate-950/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={reportConfig[item.key]}
                            onChange={() => toggleReportSection(item.key)}
                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Inputs for Title and Remarks */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">Report Title Header</label>
                      <input
                        type="text"
                        value={reportConfig.customTitle}
                        onChange={e => setReportConfig({ ...reportConfig, customTitle: e.target.value })}
                        placeholder="Statement header title..."
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block flex items-center gap-1.5">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-400" />
                        Treasurer's Official Remarks & Audit Directives
                      </label>
                      <textarea
                        rows={2}
                        value={reportConfig.treasurerRemarks}
                        onChange={e => setReportConfig({ ...reportConfig, treasurerRemarks: e.target.value })}
                        placeholder="Add official notes, audit comments, or directives for this statement..."
                        className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Report Filter Bar */}
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl print:hidden flex flex-wrap gap-4 items-end text-left">
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Filter by Year</label>
                  <select
                    value={reportYear}
                    onChange={e => setReportYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Years</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[150px]">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Filter by Month</label>
                  <select
                    value={reportMonth}
                    onChange={e => setReportMonth(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Filter by Component / Item</label>
                  <select
                    value={reportItem}
                    onChange={e => setReportItem(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="all">All Components</option>
                    {phases.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { setReportYear('all'); setReportMonth('all'); setReportItem('all'); }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border-0 cursor-pointer h-[42px] flex items-center justify-center shadow-sm"
                >
                  Reset Filters
                </button>
              </div>

              {/* AUDITED STATEMENT SHEET WITH SAINT FRANCIS WATERMARK & HIGH CONTRAST */}
              <div 
                id="printable-report" 
                className="relative print-container bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 md:p-12 text-slate-900 dark:text-slate-100 leading-relaxed font-sans overflow-hidden"
              >
                {/* SAINT FRANCIS WATERMARK BACKGROUND OVERLAY */}
                <div 
                  className="absolute inset-0 bg-no-repeat bg-center opacity-[0.04] dark:opacity-[0.035] pointer-events-none mix-blend-multiply dark:mix-blend-overlay bg-contain rounded-2xl z-0"
                  style={{ backgroundImage: "url('/images/st_francis_of_assisi.png')" }}
                />

                <div className="relative z-10 space-y-8">

                  {/* Cover Header Section with St. Francis Emblem */}
                  <div className="border-b-4 border-slate-800 dark:border-slate-200 pb-6 mb-8 text-left">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center space-x-4">
                        <img 
                          src="/images/st_francis_of_assisi.png" 
                          className="w-16 h-16 object-cover rounded-xl shadow-md border-2 border-amber-300 dark:border-amber-500 shrink-0" 
                          alt="Saint Francis Emblem" 
                        />
                        <div>
                          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white uppercase">{reportConfig.customTitle}</h1>
                          <p className="text-xs font-black tracking-widest text-slate-600 dark:text-slate-300 uppercase mt-1">Construction Committee Treasury Department</p>
                        </div>
                      </div>
                      <div className="text-left md:text-right text-xs text-slate-600 dark:text-slate-300 space-y-1 font-semibold">
                        <p className="font-black text-slate-950 dark:text-white">Date Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p>Prepared by: <span className="font-black text-slate-950 dark:text-white">{profile?.full_name || 'Kiyimba Paul'} ({profile?.role || 'treasurer'})</span></p>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                      <div>
                        <h2 className="text-base font-black text-slate-950 dark:text-white tracking-tight uppercase">Construction Fund Financial Statement</h2>
                        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 uppercase mt-0.5 block">
                          Period: {reportYear === 'all' ? 'All Years' : reportYear}
                          {reportMonth !== 'all' ? ` - ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(reportMonth)]}` : ''}
                          {reportItem !== 'all' ? ` | Component: ${reportItem}` : ''}
                        </span>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 bg-slate-900 text-white font-black uppercase tracking-wider rounded">Audited Statement</span>
                    </div>
                  </div>

                  {/* Treasurer Official Remarks Display Block */}
                  {reportConfig.showRemarks && reportConfig.treasurerRemarks && (
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-1 text-left">
                      <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider flex items-center gap-1.5">
                        <MessageSquareQuote className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Treasurer's Official Remarks & Audit Directives
                      </span>
                      <p className="text-xs font-extrabold text-slate-950 dark:text-white leading-relaxed">
                        "{reportConfig.treasurerRemarks}"
                      </p>
                    </div>
                  )}

                  {/* Section 1: Summary of Funds */}
                  {reportConfig.showSummary && (
                    <div className="space-y-4 mb-8 page-break-avoid text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">1. Summary of Funds (Balance Sheet Style)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black uppercase text-[11px] tracking-wider">
                              <th className="pb-3">Description</th>
                              <th className="pb-3 text-right">Amount (UGX)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-900 dark:text-slate-100">
                            <tr>
                              <td className="py-3.5 text-sm font-bold">Total Contributions Received (Approved)</td>
                              <td className="py-3.5 text-right font-mono font-black text-base text-emerald-600 dark:text-emerald-400">{formatUGX(reportTotalCollected)}</td>
                            </tr>
                            <tr>
                              <td className="py-3.5 text-sm font-bold">Total Expenses Disbursed (Approved)</td>
                              <td className="py-3.5 text-right font-mono font-black text-base text-rose-600 dark:text-rose-400">({formatUGX(reportTotalSpent)})</td>
                            </tr>
                            <tr className="font-black text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-800/40">
                              <td className="py-3.5 pl-3 text-sm font-black uppercase">Net Treasury Balance</td>
                              <td className={`py-3.5 pr-3 text-right font-mono font-black text-base border-t-2 border-b-2 border-slate-400 dark:border-slate-600 ${
                                reportNetBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                {formatUGX(reportNetBalance)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3.5 text-sm font-bold">Pledges Outstanding (Total Pledged - Paid)</td>
                              <td className="py-3.5 text-right font-mono font-black text-base text-amber-600 dark:text-amber-400">{formatUGX(pledgeMetrics.outstanding)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Section 2: Income Statement */}
                  {reportConfig.showIncome && (
                    <div className="space-y-4 mb-8 page-break-avoid text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">2. Income Statement (Contributions Summary by Category)</h3>
                      <div className="space-y-4">
                        {Object.keys(contributionsGrouped).length === 0 ? (
                          <p className="text-slate-400 italic text-xs">No approved contributions found for selected filters.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black uppercase text-[10px] tracking-wider">
                                  <th className="pb-2.5 w-10">#</th>
                                  <th className="pb-2.5">Income Category / Contribution Purpose</th>
                                  <th className="pb-2.5 text-center">Approved Transactions</th>
                                  <th className="pb-2.5 text-right">Category Subtotal (UGX)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                                {Object.entries(contributionsGrouped).map(([groupName, groupData], idx) => (
                                  <tr key={groupName} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold">{idx + 1}</td>
                                    <td className="py-3 font-black text-slate-950 dark:text-white text-sm">{groupName}</td>
                                    <td className="py-3 text-center text-xs font-mono font-extrabold text-slate-600 dark:text-slate-300">{groupData.items.length} records</td>
                                    <td className="py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatUGX(groupData.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Grand Total Income Row */}
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl flex justify-between items-center font-black text-sm text-slate-950 dark:text-white border-2 border-slate-300 dark:border-slate-700 mt-2">
                          <span>GRAND TOTAL INCOME (APPROVED CONTRIBUTIONS)</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base font-black">{formatUGX(reportTotalCollected)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 3: Expenditure Statement */}
                  {reportConfig.showExpenditure && (
                    <div className="space-y-4 mb-8 page-break-avoid text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">3. Expenditure Statement (Outflow Summary by Phase)</h3>
                      <div className="space-y-4">
                        {Object.keys(expensesGrouped).length === 0 ? (
                          <p className="text-slate-400 italic text-xs">No approved expenses found for selected filters.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                              <thead>
                                <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black uppercase text-[10px] tracking-wider">
                                  <th className="pb-2.5 w-10">#</th>
                                  <th className="pb-2.5">Construction Phase / Outflow Category</th>
                                  <th className="pb-2.5 text-center">Voucher Count</th>
                                  <th className="pb-2.5 text-right">Phase Subtotal (UGX)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                                {Object.entries(expensesGrouped).map(([phaseName, phaseData], idx) => (
                                  <tr key={phaseName} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="py-3 text-slate-500 dark:text-slate-400 font-mono text-xs font-bold">{idx + 1}</td>
                                    <td className="py-3 font-black text-slate-950 dark:text-white text-sm">{phaseName}</td>
                                    <td className="py-3 text-center text-xs font-mono font-extrabold text-slate-600 dark:text-slate-300">{phaseData.items.length} vouchers</td>
                                    <td className="py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">({formatUGX(phaseData.subtotal)})</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {/* Grand Total Expenditure Row */}
                        <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl flex justify-between items-center font-black text-sm text-slate-950 dark:text-white border-2 border-slate-300 dark:border-slate-700 mt-2">
                          <span>GRAND TOTAL EXPENDITURE (APPROVED EXPENSES)</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 text-base font-black">({formatUGX(reportTotalSpent)})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Construction Phase Budget vs. Actual */}
                  {reportConfig.showPhaseBreakdown && (
                    <div className="space-y-4 mb-8 page-break-avoid text-left">
                      <h3 className="text-sm font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b pb-2">4. Construction Phase Budget vs. Actual</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-black uppercase text-[10px] tracking-wider">
                              <th className="pb-2">Phase</th>
                              <th className="pb-2 text-right">Budget (UGX)</th>
                              <th className="pb-2 text-right">Collected (UGX)</th>
                              <th className="pb-2 text-right">Spent (UGX)</th>
                              <th className="pb-2 text-right">Balance (UGX)</th>
                              <th className="pb-2 text-right">Progress %</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-bold text-slate-900 dark:text-slate-100">
                            {phaseBudgetVsActual.map((item) => {
                              let rowColorClass
                              if (item.spent > item.budget) {
                                const overspentPercent = ((item.spent - item.budget) / item.budget) * 100
                                if (overspentPercent > 20) {
                                  rowColorClass = 'bg-rose-500/10 text-rose-800 dark:text-rose-300 font-bold'
                                } else {
                                  rowColorClass = 'bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                                }
                              } else {
                                rowColorClass = 'bg-emerald-500/5 text-slate-900 dark:text-white'
                              }
                              return (
                                <tr key={item.id} className={rowColorClass}>
                                  <td className="py-3 font-black pl-2">{item.name}</td>
                                  <td className="py-3 text-right font-mono font-bold">{formatUGX(item.budget)}</td>
                                  <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatUGX(item.collected)}</td>
                                  <td className="py-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">{formatUGX(item.spent)}</td>
                                  <td className="py-3 text-right font-mono font-black">{formatUGX(item.collected - item.spent)}</td>
                                  <td className="py-3 text-right font-mono font-black pr-2">{item.progress}%</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Section 5: Footer & Signatures */}
                  {reportConfig.showSignatures && (
                    <div className="mt-16 pt-8 border-t-2 border-slate-400 dark:border-slate-700 space-y-8 page-break-avoid">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-xs">
                        <div className="space-y-4">
                          <div className="border-b-2 border-slate-400 dark:border-slate-600 h-10 flex items-end justify-center">
                            <span className="font-cursive-signature text-base text-indigo-700 dark:text-indigo-300 font-bold">{profile?.role === 'treasurer' ? (profile?.full_name || 'Kiyimba Paul') : 'Kiyimba Paul'}</span>
                          </div>
                          <p className="font-black text-slate-950 dark:text-white">Treasurer Signature</p>
                          <p className="text-[10px] text-slate-500 font-semibold">Date: ________________________</p>
                        </div>
                        <div className="space-y-4">
                          <div className="border-b-2 border-slate-400 dark:border-slate-600 h-10 flex items-end justify-center">
                            <span className="font-cursive-signature text-base text-indigo-700 dark:text-indigo-300 font-bold">{profile?.role === 'admin' ? profile?.full_name : ''}</span>
                          </div>
                          <p className="font-black text-slate-950 dark:text-white">Admin/Chairperson Signature</p>
                          <p className="text-[10px] text-slate-500 font-semibold">Date: ________________________</p>
                        </div>
                        <div className="space-y-4">
                          <div className="border-b-2 border-slate-400 dark:border-slate-600 h-10 flex items-end justify-center">
                            <span className="text-slate-500 italic font-semibold">Name: ______________________</span>
                          </div>
                          <p className="font-black text-slate-950 dark:text-white">Auditor Signature</p>
                          <p className="text-[10px] text-slate-500 font-semibold">Date: ________________________</p>
                        </div>
                      </div>

                      <div className="text-center pt-8 border-t border-dashed border-slate-300 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 space-y-1 font-bold">
                        <p className="font-black uppercase tracking-wider text-slate-950 dark:text-white">Statement Notice</p>
                        <p className="italic">"This is an official audited financial statement of the St. Francis of Assisi Church Construction Committee"</p>
                        <p className="font-mono mt-4 text-slate-950 dark:text-white font-bold">Page 1 of 1</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* TAB: DEDICATED SYSTEM DATA HUB */}
          {activeTab === 'system_data' && (
            <div className="space-y-6 text-left">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      System Data Core & Raw Audit Records
                      <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold">Raw Database Inspection</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-medium">
                      Inspect, search, filter, and paginate un-aggregated raw system data, contribution transactions, outflow expense vouchers, and immutable audit logs.
                    </p>
                  </div>
                </div>

                {/* Sub-Tab Navigation Bar */}
                <div className="flex flex-wrap items-center bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold shrink-0">
                  {[
                    { key: 'all', label: 'All Raw Data', icon: Layers },
                    { key: 'contributions', label: `Contributions (${filteredRawContributions.length})`, icon: Coins },
                    { key: 'expenses', label: `Expense Vouchers (${filteredRawExpenses.length})`, icon: FileText },
                    { key: 'audit', label: `Audit Trail (${filteredRawAuditLogs.length})`, icon: ClipboardList }
                  ].map(tab => {
                    const IconComp = tab.icon
                    const isSelected = systemDataSubTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => {
                          setSystemDataSubTab(tab.key)
                          setSystemDataPage(1)
                        }}
                        className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md font-black'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Global Search & Filter Console */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Search Input */}
                  <div className="md:col-span-5 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={systemDataSearch}
                      onChange={e => {
                        setSystemDataSearch(e.target.value)
                        setSystemDataPage(1)
                      }}
                      placeholder="Search contributor, ref #, voucher #, description, user email..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={systemDataStatusFilter}
                      onChange={e => {
                        setSystemDataStatusFilter(e.target.value)
                        setSystemDataPage(1)
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending Verification</option>
                      <option value="Rejected">Rejected / Flagged</option>
                    </select>
                  </div>

                  {/* Items Per Page Selector */}
                  <div className="md:col-span-2">
                    <select
                      value={systemDataItemsPerPage}
                      onChange={e => {
                        setSystemDataItemsPerPage(Number(e.target.value))
                        setSystemDataPage(1)
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>

                  {/* Reset Button */}
                  <div className="md:col-span-2">
                    <button
                      onClick={() => {
                        setSystemDataSearch('')
                        setSystemDataStatusFilter('all')
                        setSystemDataPhaseFilter('all')
                        setSystemDataPage(1)
                      }}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>

              {/* RAW DATA TABLES */}

              {/* SECTION 1: Raw Contribution Transactions */}
              {(systemDataSubTab === 'all' || systemDataSubTab === 'contributions') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Raw Income Contributions Table</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Unfiltered transaction-level receipt logs ({filteredRawContributions.length} records)</p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer self-start sm:self-auto"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Export Raw CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                          <th className="pb-3 pl-2">#</th>
                          <th className="pb-3">Contributor</th>
                          <th className="pb-3">Purpose / Item</th>
                          <th className="pb-3">Payment Method</th>
                          <th className="pb-3">Ref / Tx ID</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Amount (UGX)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                        {paginatedRawContributions.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-slate-400 italic text-xs">
                              No raw contribution records match your search query or status filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedRawContributions.map((c, idx) => (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 pl-2 text-slate-400 font-mono text-[11px]">
                                {(systemDataPage - 1) * systemDataItemsPerPage + idx + 1}
                              </td>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {c.userName}
                              </td>
                              <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">
                                {c.purposeName}
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-400">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px]">
                                  {c.method}
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                                {c.reference_number || c.reference || 'N/A'}
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[11px]">
                                {c.date ? new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  c.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                  c.status === 'Pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                                  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                                {formatUGX(c.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Contributions Pagination Bar */}
                  {filteredRawContributions.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-bold gap-3">
                      <span>
                        Showing {Math.min((systemDataPage - 1) * systemDataItemsPerPage + 1, filteredRawContributions.length)} to {Math.min(systemDataPage * systemDataItemsPerPage, filteredRawContributions.length)} of {filteredRawContributions.length} raw contributions
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={systemDataPage === 1}
                          onClick={() => setSystemDataPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Previous
                        </button>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">Page {systemDataPage} of {totalContributionPages}</span>
                        <button
                          disabled={systemDataPage >= totalContributionPages}
                          onClick={() => setSystemDataPage(p => Math.min(totalContributionPages, p + 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: Raw Outflow Expense Vouchers */}
              {(systemDataSubTab === 'all' || systemDataSubTab === 'expenses') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Raw Outflow Expense Vouchers Table</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Unfiltered construction disbursement vouchers ({filteredRawExpenses.length} records)</p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer self-start sm:self-auto"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-rose-500" />
                      <span>Export Raw CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                          <th className="pb-3 pl-2">Voucher #</th>
                          <th className="pb-3">Construction Phase</th>
                          <th className="pb-3">Description / Purpose</th>
                          <th className="pb-3">Submitted By</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Amount (UGX)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                        {paginatedRawExpenses.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-slate-400 italic text-xs">
                              No raw expense voucher records match your search query or status filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedRawExpenses.map((e, idx) => (
                            <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 pl-2 font-mono font-bold text-amber-600 dark:text-amber-400 text-[11px]">
                                {e.voucher_number || `VOUCH-${100 + idx}`}
                              </td>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {e.phaseName}
                              </td>
                              <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                                {e.description}
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-400">
                                {e.submittedBy || 'Treasurer'}
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[11px]">
                                {e.date ? new Date(e.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  e.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                  e.status === 'Pending' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                                  'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                }`}>
                                  {e.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 pr-2 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
                                ({formatUGX(e.amount)})
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Expenses Pagination Bar */}
                  {filteredRawExpenses.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-bold gap-3">
                      <span>
                        Showing {Math.min((systemDataPage - 1) * systemDataItemsPerPage + 1, filteredRawExpenses.length)} to {Math.min(systemDataPage * systemDataItemsPerPage, filteredRawExpenses.length)} of {filteredRawExpenses.length} raw expense vouchers
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={systemDataPage === 1}
                          onClick={() => setSystemDataPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Previous
                        </button>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">Page {systemDataPage} of {totalExpensePages}</span>
                        <button
                          disabled={systemDataPage >= totalExpensePages}
                          onClick={() => setSystemDataPage(p => Math.min(totalExpensePages, p + 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: System Audit Logs */}
              {(systemDataSubTab === 'all' || systemDataSubTab === 'audit') && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Raw System Audit Logs Table</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Immutable system activity & access security logs ({filteredRawAuditLogs.length} records)</p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                          <th className="pb-3 pl-2">Timestamp</th>
                          <th className="pb-3">Actor / User</th>
                          <th className="pb-3">Action Type</th>
                          <th className="pb-3">Module / Context</th>
                          <th className="pb-3">Log Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
                        {paginatedRawAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-slate-400 italic text-xs">
                              No raw audit log entries recorded or matching search filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedRawAuditLogs.map((l, idx) => (
                            <tr key={l.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 pl-2 font-mono text-[11px] text-slate-500">
                                {l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A'}
                              </td>
                              <td className="py-3 font-bold text-slate-900 dark:text-white">
                                {l.user_email || l.actor || 'System'}
                              </td>
                              <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {l.action || 'ACTIVITY'}
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-400">
                                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                                  {l.entity_type || 'General'}
                                </span>
                              </td>
                              <td className="py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                {l.details || 'System activity event executed.'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Audit Logs Pagination Bar */}
                  {filteredRawAuditLogs.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-bold gap-3">
                      <span>
                        Showing {Math.min((systemDataPage - 1) * systemDataItemsPerPage + 1, filteredRawAuditLogs.length)} to {Math.min(systemDataPage * systemDataItemsPerPage, filteredRawAuditLogs.length)} of {filteredRawAuditLogs.length} audit log entries
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          disabled={systemDataPage === 1}
                          onClick={() => setSystemDataPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Previous
                        </button>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">Page {systemDataPage} of {totalAuditPages}</span>
                        <button
                          disabled={systemDataPage >= totalAuditPages}
                          onClick={() => setSystemDataPage(p => Math.min(totalAuditPages, p + 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: OUTFLOW EXPENSES MANAGER */}
          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Record Outflow expense card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Record Project Outflow</h4>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">Submit new materials, labor, contractor, and supplier payouts from building treasury</p>
                </div>
                
                <form onSubmit={handleCreateExpense} className="space-y-4 text-xs font-semibold">
                  {expenseErrors && (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                      {Object.entries(expenseErrors).map(([key, msg]) => (
                        <div key={key}>&bull; {msg}</div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Outflow Description</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 10 tonnes clay bricks transport"
                      value={newExpense.description}
                      onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Outflow Category</label>
                    <select
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                    >
                      <option value="Contractor Payout">Contractor Payout</option>
                      <option value="Labor Payout">Labor Payout</option>
                      <option value="Material Purchase">Material Purchase</option>
                      <option value="Supplier Payment">Supplier Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Amount (UGX)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="e.g. 5000000"
                        value={newExpense.amount}
                        onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-55 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Linked Construction Phase</label>
                    <select
                      value={newExpense.phaseId}
                      onChange={e => setNewExpense({...newExpense, phaseId: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                    >
                      {phases.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {newExpense.amount >= 3700000 && (
                    <div className="bg-amber-50 dark:bg-amber-955/40 border border-amber-250 dark:border-amber-900 text-amber-700 dark:text-amber-405 p-3 rounded-xl flex items-start space-x-2 leading-relaxed font-semibold">
                      <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 text-amber-650 text-amber-600" />
                      <span>Note: Outflows exceeding UGX 3,700,000 require final administrative signoff from Rev. Fr. Joseph Mukasa before dispatching.</span>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-extrabold transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer border-0"
                  >
                    <Plus className="w-4.5 h-4.5" />
                    <span>Record Outflow Payout</span>
                  </button>
                </form>
              </div>

              {/* Expense history */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Project Outflow Ledger Logs</h4>

                {/* Mobile Stacked Data Cards View (<768px) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                  {expenses.map((e) => (
                    <div key={e.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 font-bold block">{e.id}</span>
                          <h5 className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">{e.description}</h5>
                          <p className="text-[11px] text-slate-500 font-medium">{e.phaseName}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm block">
                            ({formatUGX(e.amount)})
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1 ${
                            e.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                            e.status === 'Pending_Approval' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' :
                            'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}>
                            {e.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                        <span>Category: <strong className="text-slate-700 dark:text-slate-300">{e.category || 'Contractor Payout'}</strong></span>
                        <span>Approver: <strong className="text-indigo-600 dark:text-indigo-400">{e.approvedBy || 'Pending Admin'}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View (>=768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="pb-3.5">ID</th>
                        <th className="pb-3.5">Description</th>
                        <th className="pb-3.5">Category</th>
                        <th className="pb-3.5">Phase Link</th>
                        <th className="pb-3.5">Amount (UGX)</th>
                        <th className="pb-3.5">Status</th>
                        <th className="pb-3.5">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {expenses.map((e) => (
                        <tr key={e.id} className="text-slate-755 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 font-mono text-slate-400 font-bold">{e.id}</td>
                          <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">{e.description}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              e.category === 'Contractor Payout' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              e.category === 'Labor Payout' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              e.category === 'Material Purchase' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                              e.category === 'Supplier Payment' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {e.category || 'Contractor Payout'}
                            </span>
                          </td>
                          <td className="py-3.5">{e.phaseName}</td>
                          <td className="py-3.5 font-bold text-rose-605 text-rose-600">{formatUGX(e.amount)}</td>
                          <td className="py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              e.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              e.status === 'Pending_Approval' ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {e.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-400 font-semibold">{e.approvedBy || 'Pending Admin'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: FUNDRAISING MANAGER (New Event Fundraising Dashboard) */}
          {activeTab === 'fundraising' && (
            <div className="space-y-6">
              
              {/* Full Width visual comparison */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Fundraising Target vs Income Accomplishments</h4>
                  <p className="text-xs text-slate-400 font-semibold">Visual comparison of event target budgets against actual collections.</p>
                </div>
                
                <div className="h-72 text-xs mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={events} margin={{ bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                      <XAxis dataKey="name" stroke="#64748b" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 9 }} tickFormatter={(n) => n.substring(0, 15)} />
                      <YAxis stroke="#64748b" tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value} />
                      <Tooltip content={<CustomFundraisingTooltip />} />
                      <Legend wrapperStyle={{ pt: 10 }} />
                      <Bar dataKey="targetAmount" fill="#3b5bdb" name="Target Goal (UGX)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="income" fill="#10b981" name="Income Raised (UGX)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bottom Event Audit Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Events Financial Performance</h4>
                </div>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-450 font-extrabold uppercase">
                        <th className="p-4">Event Details</th>
                        <th className="p-4">Linked Phase</th>
                        <th className="p-4">Target Amount</th>
                        <th className="p-4">Collected Income</th>
                        <th className="p-4">Budget / Expenses</th>
                        <th className="p-4">Performance Rate</th>
                        <th className="p-4 text-right">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {events.map((ev) => {
                        const progress = ev.targetAmount > 0 ? Math.round((ev.income / ev.targetAmount) * 100) : 0
                        return (
                          <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-4">
                              <span className="font-extrabold text-slate-900 dark:text-white block">{ev.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{ev.date} &bull; Status: {ev.status}</span>
                            </td>
                            <td className="p-4">{ev.linkedPhaseName}</td>
                            <td className="p-4 font-bold text-slate-850 dark:text-slate-200">{formatUGX(ev.targetAmount)}</td>
                            <td className="p-4 font-extrabold text-emerald-600">{formatUGX(ev.income)}</td>
                            <td className="p-4 text-slate-500">
                              <span>Budget: {formatUGX(ev.budget)}</span>
                              <span className="block text-[10px] text-rose-500">Spent: {formatUGX(ev.expenses)}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                </div>
                                <span className="font-mono text-[10px] text-indigo-650 dark:text-indigo-400">{progress}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              {ev.status === 'Active' ? (
                                <button
                                  onClick={() => handleCloseEvent(ev.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all cursor-pointer shadow-sm"
                                >
                                  Close & Audited Signoff
                                </button>
                              ) : (
                                <button
                                  onClick={() => setEventReportToShow(ev)} // reused event reports modal
                                  className="text-indigo-550 hover:text-indigo-650 text-[10px] font-extrabold flex items-center justify-end gap-1 border-0 bg-transparent cursor-pointer"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>View final report</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: RECONCILIATION GATEWAY */}
          {activeTab === 'reconcile' && (
            <div className="space-y-6">
              
              {/* Reconciliation Gateways */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Church Reconciliation Ledger Gateways</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time matching of member payment tokens against active ledgers</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-800 dark:text-slate-200">
                  {/* Centenary Bank Gateway */}
                  <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-slate-850 dark:text-slate-200 uppercase tracking-wider">Centenary Bank Gateway</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded font-mono">A/C: 31000847362</span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-1.5 font-semibold">
                        <span className="text-slate-400">Connection Status:</span>
                        <span className="text-emerald-600 font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse"></span>
                          <span>Connected (Active)</span>
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-400">Reconciled Sum:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatUGX(approvedTx.filter(c => c.method.includes('Bank')).reduce((sum, c) => sum + c.amount, 0))}</span>
                      </div>
                    </div>
                  </div>

                  {/* MTN Mobile Money Gateway */}
                  <div className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-slate-850 dark:text-slate-200 uppercase tracking-wider">MTN Mobile Money API</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded font-mono">Code: SFA-5566</span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200/50 dark:border-slate-800 pb-1.5 font-semibold">
                        <span className="text-slate-455">Connection Status:</span>
                        <span className="text-emerald-600 font-bold flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-pulse"></span>
                          <span>Connected (Active)</span>
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-450">Reconciled Sum:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatUGX(approvedTx.filter(c => c.method.includes('Money')).reduce((sum, c) => sum + c.amount, 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fraud prevention checker auditor */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-105 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Fraud & Double-Spend Auditor</h4>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Real-time Check</span>
                </div>

                {duplicateRefs.length === 0 ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-xs flex items-center space-x-2 font-semibold">
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                    <span>No duplicate reference numbers or signature conflicts detected. All tokens are verified.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-rose-50 dark:bg-rose-955/30 border border-rose-200 dark:border-rose-900 text-rose-750 p-4 rounded-xl text-xs flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-bold text-rose-950 dark:text-rose-200">Duplicate References Found!</p>
                        <p className="mt-1 text-rose-700 dark:text-rose-400 leading-relaxed font-semibold">
                          The reference token(s) <strong className="font-mono text-rose-900 dark:text-rose-300">{duplicateRefs.join(', ')}</strong> are associated with multiple contributions. Please cross-examine with the depositors in person.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: PLEDGE TRACKER */}
          {activeTab === 'pledges' && (
            <div className="space-y-6">
              {/* Pledge metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Pledged */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pledged Commitments</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center">
                      <ClipboardList className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {formatUGX(pledges.reduce((sum, p) => sum + p.amount, 0))}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">From active and completed pledges</p>
                  </div>
                </div>

                {/* Total Paid */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pledge Funds Redeemed</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {formatUGX(pledges.reduce((sum, p) => sum + p.amountPaid, 0))}
                    </h3>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-bold">
                      {pledges.length > 0 
                        ? Math.round((pledges.reduce((sum, p) => sum + p.amountPaid, 0) / pledges.reduce((sum, p) => sum + p.amount, 0)) * 100) 
                        : 0}% Completion rate
                    </p>
                  </div>
                </div>

                {/* Outstanding Pledges */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-32 hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Commitments</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-4.5 h-4.5" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {formatUGX(pledges.reduce((sum, p) => sum + (p.amount - p.amountPaid), 0))}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Remaining balance to collect</p>
                  </div>
                </div>
              </div>

              {/* Main split grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800 dark:text-slate-200">
                
                {/* Pledge Logs Table */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Active Pledge Ledger</h4>
                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900">
                      {pledges.length} Total Pledges
                    </span>
                  </div>

                  <div className="overflow-x-auto text-slate-800 dark:text-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                          <th className="pb-3.5">Member Name</th>
                          <th className="pb-3.5">Purpose / Phase</th>
                          <th className="pb-3.5">Pledged (UGX)</th>
                          <th className="pb-3.5">Paid (UGX)</th>
                          <th className="pb-3.5">Outstanding (UGX)</th>
                          <th className="pb-3.5">Target Date</th>
                          <th className="pb-3.5">Status</th>
                          <th className="pb-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-305">
                        {pledges.map((p) => {
                          const outstanding = p.amount - p.amountPaid
                          return (
                            <tr key={p.id} className="text-slate-755 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 font-bold text-slate-850 dark:text-slate-200">{p.userName}</td>
                              <td className="py-3.5">{p.purpose}</td>
                              <td className="py-3.5 text-slate-900 dark:text-white">{formatUGX(p.amount)}</td>
                              <td className="py-3.5 text-emerald-600">{formatUGX(p.amountPaid)}</td>
                              <td className="py-3.5 text-rose-600 font-bold">{formatUGX(outstanding)}</td>
                              <td className="py-3.5 font-mono text-slate-400">{p.targetDate}</td>
                              <td className="py-3.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  p.status === 'Completed' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                {p.status !== 'Completed' && (
                                  <button
                                    onClick={() => {
                                      setSelectedPledge(p)
                                      setPaymentAmount(outstanding.toString())
                                      setPaymentReference('')
                                      setShowRecordPaymentModal(true)
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm border-0"
                                  >
                                    Record Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Log New Pledge Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Create Member Pledge</h4>
                    <p className="text-xs text-slate-400 mt-0.5 font-semibold">Record a new commitment from a church member</p>
                  </div>
                  
                  <form onSubmit={handleCreatePledge} className="space-y-4 text-xs font-semibold">
                    {pledgeErrors && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                        {Object.entries(pledgeErrors).map(([key, msg]) => (
                          <div key={key}>&bull; {msg}</div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Donor / Member</label>
                      <select
                        value={`${newPledge.userId}|${newPledge.userName}`}
                        onChange={e => {
                          const [userId, userName] = e.target.value.split('|')
                          setNewPledge({
                            ...newPledge,
                            userId,
                            userName
                          })
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      >
                        {Object.values(profiles).length > 0 ? (
                          Object.values(profiles).map(p => (
                            <option key={p.id} value={`${p.id}|${p.full_name || p.email}`}>
                              {p.full_name || p.email} ({p.role})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="member-uid|Deacon Charles Mugisha">Deacon Charles Mugisha</option>
                            <option value="member-uid|Mrs. Florence Nsubuga">Mrs. Florence Nsubuga</option>
                            <option value="member-uid|Mr. Aloysius Mukasa">Mr. Aloysius Mukasa</option>
                            <option value="member-uid|Ms. Babirye Ritah">Ms. Babirye Ritah</option>
                            <option value="member-uid|Mr. James Kato">Mr. James Kato</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Pledge Purpose (Linked Phase)</label>
                      <select
                        value={newPledge.purpose}
                        onChange={e => setNewPledge({...newPledge, purpose: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                      >
                        {phases.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Target Amount (UGX)</label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="e.g. 10000000"
                          value={newPledge.amount}
                          onChange={e => setNewPledge({...newPledge, amount: e.target.value})}
                          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Target Fulfilment Date</label>
                      <input
                        type="date"
                        required
                        value={newPledge.targetDate}
                        onChange={e => setNewPledge({...newPledge, targetDate: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-150 font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-650 hover:bg-indigo-700 text-white py-3 rounded-xl font-extrabold transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer border-0"
                    >
                      <Plus className="w-4.5 h-4.5" />
                      <span>Register Pledge Commitment</span>
                    </button>
                  </form>
                </div>

              </div>
            </div>
          )}

          {/* TAB: QR RECEIPT VERIFICATION PORTAL */}
          {activeTab === 'qrverify' && (
            <div className="space-y-6 max-w-xl mx-auto text-slate-850 dark:text-slate-200">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto border border-indigo-500/20">
                    <Key className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">QR & Receipt Code Auditor</h3>
                  <p className="text-xs text-slate-405 dark:text-slate-400">
                    Paste the raw receipt QR code string or search directly by Receipt Number (e.g. `REC-2026-001`) to audit the church ledger.
                  </p>
                </div>

                <form onSubmit={handleVerifyQRReceipt} className="space-y-4 font-semibold text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Receipt ID or QR Text</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. REC-2026-001 or copy QR string"
                      value={qrVerifyInput}
                      onChange={e => setQrVerifyInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQrVerifyInput('')
                        setVerificationResult(null)
                        setHasSearchedQR(false)
                      }}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-205 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-xl font-bold text-center cursor-pointer"
                    >
                      Clear Search
                    </button>
                    
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold shadow-sm text-center cursor-pointer border-0"
                    >
                      Verify Token
                    </button>
                  </div>
                </form>
              </div>

              {/* Output Results Certificate */}
              {hasSearchedQR && (
                <div className="animate-fade-in space-y-4">
                  {verificationResult ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-6 shadow-sm text-slate-900 dark:text-slate-100 space-y-4 relative">
                      <div className="flex justify-between items-center pb-2 border-b border-emerald-100 dark:border-emerald-900/40">
                        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-4 h-4" /> Valid Receipt Verification
                        </span>
                        <span className="font-mono text-xs text-slate-400">{verificationResult.receiptId}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div>
                          <span className="text-slate-400 uppercase tracking-wide text-[9px] block">Depositor Donor</span>
                          <span className="text-slate-800 dark:text-slate-200 block text-sm mt-0.5">{verificationResult.userName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wide text-[9px] block">Redeemed Amount</span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold block mt-0.5">{formatUGX(verificationResult.amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wide text-[9px] block">Purpose</span>
                          <span className="text-slate-850 dark:text-slate-200 block mt-0.5">{verificationResult.purposeName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wide text-[9px] block">Deposit Date</span>
                          <span className="text-slate-850 dark:text-slate-200 block font-mono mt-0.5">{verificationResult.date}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center text-[10px] text-slate-400">
                        <span>Signature: <strong>{verificationResult.signature}</strong></span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">LEDGER CONFIRMED</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-50 dark:bg-rose-955/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 shadow-sm text-rose-700 dark:text-rose-400 flex gap-3.5 items-start">
                      <ShieldAlert className="w-8 h-8 text-rose-600 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <strong className="text-rose-950 dark:text-rose-200 block text-sm">INVALID RECEIPT TOKEN</strong>
                        <p className="mt-1 leading-relaxed text-rose-700 dark:text-rose-400 text-xs font-semibold">
                          Warning: The receipt signature or transaction reference code you queried was not found in the active building fund ledger registry. Verify that the receipt is not counterfeit or double-logged.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* TAB: FEEDBACK INBOX */}
          {activeTab === 'feedback' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs animate-fade-in">
              
              {/* Left/Middle Column: List of Feedback */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Member Questions & Support Requests</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">Respond to congregation feedback and resolve project inquiries.</p>
                    </div>
                    <span className="bg-amber-500/10 text-amber-500 font-bold px-3 py-1 rounded-xl text-[10px] animate-pulse">
                      {feedback.filter(f => f.status === 'Pending').length} Pending Review
                    </span>
                  </div>

                  <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
                    {feedback.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic">No feedback entries available.</div>
                    ) : (
                      feedback.map(f => (
                        <div 
                          key={f.id} 
                          onClick={() => {
                            if (f.status === 'Pending') {
                              setSelectedFeedback(f)
                              setReplyMessage('')
                              setReplyErrors(null)
                            }
                          }}
                          className={`p-4 border rounded-2xl transition-all ${
                            f.status === 'Pending' 
                              ? 'border-amber-200 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-955/10 hover:border-indigo-400 cursor-pointer' 
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20'
                          } ${selectedFeedback?.id === f.id ? 'ring-2 ring-indigo-500' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 text-xs block">{f.subject}</strong>
                              <span className="text-[10px] text-slate-450 mt-0.5 block">From: {f.memberName || "Parish Member"} • {f.created_at}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              f.status === 'Replied'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>

                          <p className="text-slate-700 dark:text-slate-300 mt-2.5 leading-relaxed font-semibold">
                            {f.message}
                          </p>

                          {f.status === 'Replied' && f.reply_message && (
                            <div className="mt-3.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                Official Reply (by: {profiles[f.replied_by]?.full_name || (f.replied_by === profile?.id ? (profile?.full_name || 'Treasurer') : 'Staff')})
                              </span>
                              <p className="text-slate-850 dark:text-slate-200 italic font-medium leading-relaxed">
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

              {/* Right Column: Slide-out drawer / reply composer */}
              <div className="lg:col-span-1">
                {selectedFeedback ? (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-indigo-500/30 bg-indigo-500/5 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Compose Response</h4>
                      <button 
                        onClick={() => setSelectedFeedback(null)}
                        className="text-slate-404 dark:text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Original Question</span>
                      <strong className="block text-slate-800 dark:text-slate-200 mt-1 font-bold">{selectedFeedback.subject}</strong>
                      <p className="text-slate-600 dark:text-slate-400 mt-1.5 italic font-medium">"{selectedFeedback.message}"</p>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault()
                        setReplyErrors(null)

                        const validationResult = feedbackReplySchema.safeParse({
                          replyMessage: replyMessage
                        })

                        if (!validationResult.success) {
                          const formattedErrors = {}
                          validationResult.error.issues.forEach(issue => {
                            formattedErrors[issue.path[0]] = issue.message
                          })
                          setReplyErrors(formattedErrors)
                          return
                        }

                        const validatedData = validationResult.data

                        // Update feedback item in Supabase via mutation
                        replyFeedbackMutation.mutate({
                          id: selectedFeedback.id,
                          replyMessage: validatedData.replyMessage,
                          repliedBy: profile.id,
                          user,
                          profile
                        })

                        setSelectedFeedback(null)
                        setReplyMessage('')
                        loadData()
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Reply Message</label>
                        <textarea
                          rows="6"
                          required
                          placeholder="Type your official reply here (min 5 characters)..."
                          value={replyMessage}
                          onChange={e => setReplyMessage(e.target.value)}
                          className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-200 ${
                            replyErrors?.replyMessage ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                          }`}
                        />
                        {replyErrors?.replyMessage && (
                          <span className="text-rose-500 text-[10px] block mt-1 font-semibold">{replyErrors.replyMessage}</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>Send Response</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="h-48 rounded-2xl border border-dashed border-slate-205 dark:border-slate-800 flex items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-950/20 text-slate-450 italic">
                    Select a pending feedback card from the list to compose a reply.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>

      {/* ----------------- SIDE-PANEL PROOF VERIFICATION (Sheet Drawer) ----------------- */}
      <div 
        onClick={() => setSelectedContribution(null)}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          selectedContribution ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
      />

      <div className={`fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out transform ${
        selectedContribution ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedContribution && (
          <>
            {/* Sheet Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950">
              <div>
                <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                  {selectedContribution.id} Verification
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mt-1">Verification Sheet</h3>
              </div>
              <button 
                onClick={() => setSelectedContribution(null)} 
                className="text-slate-405 dark:text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-lg transition-all border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Top Half: Proof Document */}
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Uploaded Proof Receipt</span>
                {selectedContribution.screenshotUrl ? (
                  <div className="border border-slate-200 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 h-56 flex items-center justify-center relative group shadow-inner">
                    <img 
                      src={selectedContribution.screenshotUrl} 
                      alt="Payment Slip Proof" 
                      className="w-full h-full object-contain"
                    />
                    <a 
                      href={selectedContribution.screenshotUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-[10px] font-extrabold flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Zoom Proof</span>
                    </a>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl h-56 bg-slate-50 dark:bg-slate-950/20 flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2 shadow-inner">
                    <AlertCircle className="w-8 h-8 text-slate-350" />
                    <span className="text-xs font-bold text-slate-500">No Image Slip Attached</span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-normal">
                      Direct cash donation or manual confirmation reference. Verify reference code via Centenary ledger manually.
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Half: Formatted Transaction Details */}
              <div className="space-y-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-2">Deposit Properties</span>
                
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Depositor Member</span>
                    <strong className="text-slate-900 dark:text-white text-sm">{selectedContribution.userName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Amount in UGX</span>
                    <strong className="text-slate-905 dark:text-white text-sm text-emerald-600 font-extrabold">{formatUGX(selectedContribution.amount)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Method</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{selectedContribution.method}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Reference ID</span>
                    <code className="font-mono text-slate-800 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800 px-2 py-0.5 rounded mt-0.5 block w-fit">{selectedContribution.reference}</code>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Link Purpose</span>
                    <span className="font-bold text-slate-850 dark:text-slate-200 mt-0.5 block text-slate-800 dark:text-slate-200">{selectedContribution.purposeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[9px] tracking-wide">Deposit Time</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 block mt-0.5">{selectedContribution.date}</span>
                  </div>
                </div>

                {selectedContribution.status === 'Approved' && selectedContribution.receiptId && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs shadow-sm">
                    <div>
                      <span className="font-bold text-emerald-950 dark:text-emerald-200 block">Official Receipt Generated</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-450 text-[10px] font-bold block mt-0.5">{selectedContribution.receiptId}</span>
                    </div>
                    <button 
                      onClick={() => setReceiptToShow(selectedContribution)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3.5 py-2.5 rounded-lg transition-all cursor-pointer border-0 shadow-sm"
                    >
                      View Receipt Document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Area Bottom */}
            {selectedContribution.status === 'Pending' && (
              <div className="p-6 border-t border-slate-105 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center space-x-3 shrink-0">
                <button 
                  onClick={() => setShowClarifyModal(true)}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Reject & Request</span>
                </button>
                <button 
                  onClick={() => handleApproveContribution(selectedContribution.id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Sign</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ----------------- POPUP MODAL: CLARIFICATION NOTE ----------------- */}
      {showClarifyModal && selectedContribution && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-850 shadow-2xl animate-fade-in text-slate-850 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Request Clarification</h4>
              <button onClick={() => setShowClarifyModal(false)} className="text-slate-400 hover:text-slate-655 border-0 bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              State why the receipt was flagged. {selectedContribution.userName} will see this message on their donor portal to re-submit details.
            </p>

            <textarea 
              rows="3"
              placeholder="e.g. Transaction ID was not found on Centenary Bank Ledger. Please re-confirm reference or upload screenshot."
              value={clarificationText}
              onChange={e => setClarificationText(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 font-semibold"
            />

            <div className="flex justify-end space-x-2 pt-2 text-xs font-bold">
              <button 
                onClick={() => setShowClarifyModal(false)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-4.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectContribution}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4.5 py-2.5 rounded-xl shadow-sm cursor-pointer border-0"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL: RECORD EXPORTING REPORT ----------------- */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-fade-in text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm uppercase">Generate Treasury Ledger Report</h4>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Generate a monthly audited report of all transactions from Mobile Money APIs and Centenary accounts.
            </p>

            <div className="space-y-2 text-xs font-bold">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-450">Active Period:</span>
                <span>June 2026 (Month-to-Date)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-450">Total Collections:</span>
                <span className="text-emerald-600">{formatUGX(mtdTotal)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-450">Pending Releases:</span>
                <span className="text-amber-500">{pendingTxCount} Deposits</span>
              </div>
            </div>

            <div className="flex space-x-2 pt-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  window.print()
                  setShowReportModal(false)
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-900/10 cursor-pointer border-0"
              >
                Print PDF Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL: LOG OUTFLOW EXPENSE ----------------- */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-slate-850 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm">Log Project Outflow</h4>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-404 dark:text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs font-semibold">
              {expenseErrors && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                  {Object.entries(expenseErrors).map(([key, msg]) => (
                    <div key={key}>&bull; {msg}</div>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Description</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Purchase of plumbing materials"
                  value={newExpense.description}
                  onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Amount (UGX)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="e.g. 5000000"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                  >
                    <option value="Contractor Payout">Contractor Payout</option>
                    <option value="Labor Payout">Labor Payout</option>
                    <option value="Material Purchase">Material Purchase</option>
                    <option value="Supplier Payment">Supplier Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Link Phase</label>
                <select
                  value={newExpense.phaseId}
                  onChange={e => setNewExpense({...newExpense, phaseId: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                >
                  {phases.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-3">
                <button 
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer border-0"
                >
                  Submit Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL: RECORD PLEDGE PAYMENT ----------------- */}
      {showRecordPaymentModal && selectedPledge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-855 shadow-2xl animate-fade-in text-slate-850 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm">Record Payment for {selectedPledge.userName}</h4>
              <button onClick={() => { setShowRecordPaymentModal(false); setSelectedPledge(null); }} className="text-slate-404 dark:text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPledgePayment} className="space-y-4 text-xs font-semibold">
              {paymentErrors && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                  {Object.entries(paymentErrors).map(([key, msg]) => (
                    <div key={key}>&bull; {msg}</div>
                  ))}
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Payment Amount (UGX)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000000"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100"
                  >
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wide text-[9px]">Reference Code</label>
                  <input
                    type="text"
                    required
                    placeholder="Ref ID"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowRecordPaymentModal(false); setSelectedPledge(null); }}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 font-bold animate-fade-in"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer border-0"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* RECEIPT VIEW AUDIT MODAL */}
      {receiptToShow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            id="treasurer-receipt-print"
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
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 print:hidden cursor-pointer border-0 bg-transparent z-25 p-1 rounded-full hover:bg-slate-100 transition-colors"
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
                      <p className="text-[10px] text-indigo-650 font-bold uppercase tracking-wider">Lusanja Parish Building Fund</p>
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
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Payment Date:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-1 block">{receiptToShow.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Contributor:</span>
                    <span className="font-extrabold text-slate-900 text-sm mt-1 block">{receiptToShow.userName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Purpose / Phase:</span>
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
                          {receiptToShow.signature || profile?.full_name || "Dr. Sarah Nakato"}
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
                      <span className="text-[8px] text-slate-400 block font-bold mt-1 uppercase tracking-wider block mt-1">Lusanja Parish Treasurer</span>
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer border-0"
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
                onClick={() => handleDownloadPDF('treasurer-receipt-print', `Receipt_${receiptToShow.receiptId || receiptToShow.id}.pdf`)} 
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
          <div id="treasurer-report-print" className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 relative text-slate-900 shadow-2xl overflow-hidden print-container">
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
                    <span className="text-indigo-650 font-extrabold text-sm">{formatUGX(eventReportToShow.income - eventReportToShow.expenses)}</span>
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
                    <p className="font-serif italic font-bold text-slate-800 text-sm mt-1">Dr. Sarah Nakato (Treasurer)</p>
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
                onClick={() => handleDownloadPDF('treasurer-report-print', `Event_Closure_Report_${eventReportToShow.name.replace(/\s+/g, '_')}.pdf`)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/15 cursor-pointer border-0 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC TEXT NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-sm w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl text-xs flex gap-3 text-slate-350">
          <div className="shrink-0">
            <Bell className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center text-indigo-500" />
          </div>
          <div>
            <strong className="block text-slate-100 text-[11px] mb-0.5">SMS Broadcast Alert Dispatched</strong>
            <p className="text-[10px] leading-relaxed text-slate-400">{toast.message}</p>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL: HIGH-VALUE EXPENSE CONFIRMATION ----------------- */}
      {showExpenseConfirmModal && pendingExpenseToCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in text-slate-850 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-455 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                <span>High-Value Expense Confirmation</span>
              </h4>
              <button 
                onClick={() => {
                  setShowExpenseConfirmModal(false)
                  setPendingExpenseToCreate(null)
                  setExpenseConfirmInput('')
                }} 
                className="text-slate-404 dark:text-slate-400 hover:text-slate-605 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl text-xs space-y-2 text-rose-800 dark:text-rose-300 font-semibold leading-relaxed">
              <p>
                WARNING: You are registering a high-value project outflow expense that exceeds <strong>5,000,000 UGX</strong>:
              </p>
              <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-rose-105 border-rose-100 dark:border-rose-950/60 text-slate-850 dark:text-slate-200 mt-2 space-y-1">
                <p><strong>Description:</strong> {pendingExpenseToCreate.description}</p>
                <p><strong>Amount:</strong> <span className="text-rose-650 font-bold">{formatUGX(pendingExpenseToCreate.amount)}</span></p>
                <p><strong>Category:</strong> {pendingExpenseToCreate.category}</p>
              </div>
              <p className="mt-2 text-[11px]">
                To proceed, please type <strong className="font-mono text-rose-950 dark:text-white select-all bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">APPROVE</strong> in the input field below to confirm you have verified the invoices.
              </p>
            </div>

            <div>
              <input 
                type="text" 
                placeholder="Type APPROVE to confirm"
                value={expenseConfirmInput}
                onChange={e => setExpenseConfirmInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-850 dark:text-slate-100 placeholder-slate-400 font-bold"
              />
            </div>

            <div className="flex space-x-2 pt-1.5 text-xs font-bold">
              <button 
                type="button"
                onClick={() => {
                  setShowExpenseConfirmModal(false)
                  setPendingExpenseToCreate(null)
                  setExpenseConfirmInput('')
                }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={expenseConfirmInput !== 'APPROVE'}
                onClick={() => confirmAndCreateExpense(pendingExpenseToCreate)}
                className={`flex-1 py-2.5 text-white rounded-xl shadow-sm cursor-pointer border-0 ${
                  expenseConfirmInput === 'APPROVE' 
                    ? 'bg-rose-650 hover:bg-rose-700' 
                    : 'bg-rose-400 cursor-not-allowed opacity-50'
                }`}
              >
                Confirm Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* print styles */}
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