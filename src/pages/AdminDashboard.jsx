import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  useProfiles, usePhases, useContributions, useExpenses, useEvents, useAuditLogs, useFeedback,
  useApproveExpense, useRejectExpense, useReplyFeedback, usePledges,
  useCommittee, useCreateCommitteeMember, useUpdateCommitteeMember, useDeleteCommitteeMember
} from '../hooks/useData'
import { 
  LayoutDashboard, Coins, Hammer, CheckSquare, Users, 
  Activity, Sun, Moon, LogOut, DollarSign, TrendingUp, Check, X,
  Shield, ClipboardList, Download, Upload, AlertCircle, AlertTriangle, Key, MessageSquare, Menu, Printer,
  FileSpreadsheet, Loader2, SlidersHorizontal, Settings2, MessageSquareQuote,
  Database, Layers, FileText, Search, ChevronLeft, Megaphone
} from 'lucide-react'
import { feedbackReplySchema, committeeMemberSchema } from '../utils/validation'
import GlobalBudgetOverview from '../components/GlobalBudgetOverview'
import AdManager from '../components/dashboard/admin/AdManager'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

export default function AdminDashboard() {
  const { user, profile, signOut, createUserByAdmin } = useAuth()
  const queryClient = useQueryClient()
  const currentUserId = user?.id || 'admin-uid'
  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  const [activeTab, setActiveTab] = useState('dashboard')
  const [dashboardSubTab, setDashboardSubTab] = useState('analytics') // 'analytics' or 'transactions'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sfa_dark_mode') === 'true')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(() => localStorage.getItem('sfa_2fa_enabled') === 'true')
  
  // React Query data hook integration
  const { data: profiles = {}, isLoading: profilesLoading } = useProfiles()
  const { data: phases = [], isLoading: phasesLoading } = usePhases()
  const { data: contributions = [], isLoading: contribsLoading } = useContributions()
  const { data: expenses = [], isLoading: expensesLoading } = useExpenses()
  const { data: events = [] } = useEvents()
  const { data: auditLogs = [] } = useAuditLogs()
  const { data: feedback = [] } = useFeedback()
  const { data: pledges = [] } = usePledges()
  const { data: committee = [], isLoading: committeeLoading } = useCommittee()

  const createCommitteeMemberMutation = useCreateCommitteeMember()
  const updateCommitteeMemberMutation = useUpdateCommitteeMember()
  const deleteCommitteeMemberMutation = useDeleteCommitteeMember()

  // Building Committee Form States
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRoleTitle, setNewMemberRoleTitle] = useState('Member')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberDisplayOrder, setNewMemberDisplayOrder] = useState('0')
  const [newMemberIsActive, setNewMemberIsActive] = useState(true)
  const [editingMember, setEditingMember] = useState(null)
  const [committeeErrors, setCommitteeErrors] = useState(null)

  const [supabaseAuditLogs, setSupabaseAuditLogs] = useState([])

  // UI states
  const [searchUser, setSearchUser] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [logActionFilter, setLogActionFilter] = useState('all')
  const [logSearchText, setLogSearchText] = useState('')

  // Create User Form States
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('coordinator')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  
  // Feedback states
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyErrors, setReplyErrors] = useState(null)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmType, setConfirmType] = useState('') // 'DELETE' or 'UPDATE'
  const [confirmInput, setConfirmInput] = useState('')
  const [pendingUserAction, setPendingUserAction] = useState(null) // { type, userId, newRole, userName }

  const handleExportCSV = useCallback(() => {
    const headers = ['Date', 'Contributor', 'Amount UGX', 'Purpose', 'Status']
    const rows = (contributions || []).map(c => [
      c.date || c.createdAt || '',
      c.userName || '',
      c.amount || 0,
      `${c.purposeType || ''}: ${c.purposeName || ''}`,
      c.status || ''
    ])

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `SFA_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report exported to CSV successfully!')
  }, [contributions])

  const fetchSupabaseAuditLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) {
        const formattedLogs = data.map(log => {
          let userName = 'System'
          let role = 'system'
          let details = log.description
          try {
            const parsedDesc = JSON.parse(log.description)
            if (parsedDesc && typeof parsedDesc === 'object') {
              userName = parsedDesc.userName || 'System'
              role = parsedDesc.role || 'system'
              details = parsedDesc.details || log.description
            }
          } catch {
            // Not JSON
          }
          return {
            id: log.id,
            userName,
            role,
            action: log.action_type,
            details,
            date: new Date(log.created_at).toLocaleString()
          }
        })
        setSupabaseAuditLogs(formattedLogs)
      } else if (error) {
        console.warn('Failed to load Supabase audit logs:', error.message)
      }
    } catch (err) {
      console.warn('Supabase audit logs fetch exception:', err)
    }
  }, [])
  
  useEffect(() => {
    fetchSupabaseAuditLogs()
    
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode, fetchSupabaseAuditLogs])

  const approveExpenseMutation = useApproveExpense()
  const rejectExpenseMutation = useRejectExpense()
  const replyFeedbackMutation = useReplyFeedback()

  const handleToggle2FA = async () => {
    const newValue = !twoFactorEnabled
    setTwoFactorEnabled(newValue)
    localStorage.setItem('sfa_2fa_enabled', String(newValue))
    
    try {
      await supabase.from('audit_logs').insert([{
        user_id: currentUserId,
        action_type: 'Toggle 2FA Requirement',
        description: JSON.stringify({
          userName: profile?.full_name || 'Admin',
          role: 'admin',
          details: `${newValue ? 'Activated' : 'Deactivated'} system-wide Two-Factor Authentication (2FA) requirement`
        })
      }])
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    } catch (err) {
      console.warn("Failed to log 2FA toggle:", err)
    }
  }

  // Handle Approving large expenses (> $1000 or final payout)
  const handleApproveExpense = (expenseId) => {
    approveExpenseMutation.mutate({
      id: expenseId,
      approvedBy: profile?.full_name || 'Admin',
      user,
      profile
    })
  }

  const handleRejectExpense = (expenseId) => {
    rejectExpenseMutation.mutate({
      id: expenseId,
      user,
      profile
    })
  }

  // Execution helpers (secured behind typing confirmation)
  const executeUpdateRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
      if (error) throw error

      toast.success("User role updated successfully!")
      
      // Log audit
      await supabase.from('audit_logs').insert([{
        user_id: currentUserId,
        action_type: 'Update User Role',
        description: JSON.stringify({
          userName: profile?.full_name || 'Admin',
          role: 'admin',
          details: `Changed role of user "${profiles[userId]?.full_name || 'User'}" to "${newRole}"`
        })
      }])
      
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    } catch (err) {
      toast.error(`Update failed: ${err.message}`)
    }
  }

  const executeDeleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      if (error) throw error

      toast.success("User account deleted successfully!")

      // Log audit
      await supabase.from('audit_logs').insert([{
        user_id: currentUserId,
        action_type: 'Delete User Account',
        description: JSON.stringify({
          userName: profile?.full_name || 'Admin',
          role: 'admin',
          details: `Deleted user account for "${profiles[userId]?.full_name || 'User'}"`
        })
      }])

      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    } catch (err) {
      toast.error(`Deletion failed: ${err.message}`)
    }
  }

  // Handle User role editing
  const handleUpdateRole = (userId, newRole) => {
    const targetUser = profiles[userId]
    setPendingUserAction({
      type: 'update_role',
      userId,
      newRole,
      userName: targetUser ? targetUser.full_name : 'User'
    })
    setConfirmType('UPDATE')
    setConfirmInput('')
    setShowConfirmModal(true)
  }

  // Handle User deletion
  const handleDeleteUser = (userId) => {
    const targetUser = profiles[userId]
    setPendingUserAction({
      type: 'delete_user',
      userId,
      userName: targetUser ? targetUser.full_name : 'User'
    })
    setConfirmType('DELETE')
    setConfirmInput('')
    setShowConfirmModal(true)
  }

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)
    setFormSuccess(null)

    try {
      await createUserByAdmin(newUserEmail, newUserPassword, newUserName, newUserPhone, newUserRole)
      setFormSuccess(`Successfully created ${newUserRole} account: ${newUserEmail}!`)
      
      // Clear inputs
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPhone('')
      setNewUserPassword('')
      
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    } catch (err) {
      let errMsg = err.message || 'Failed to create account.'
      if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('rate_limit')) {
        errMsg = "Email rate limit exceeded. Please disable 'Confirm Email' under Auth -> Providers -> Email in your Supabase Dashboard to bypass email sending limits completely."
      }
      setFormError(errMsg)
    } finally {
      setFormLoading(false)
    }
  }

  const handleCommitteeSubmit = async (e) => {
    e.preventDefault()
    setCommitteeErrors(null)

    const payload = {
      fullName: newMemberName,
      roleTitle: newMemberRoleTitle,
      phone: newMemberPhone,
      email: newMemberEmail,
      displayOrder: Number(newMemberDisplayOrder),
      isActive: newMemberIsActive
    }

    const validationResult = committeeMemberSchema.safeParse(payload)
    if (!validationResult.success) {
      const errors = {}
      validationResult.error.issues.forEach(issue => {
        errors[issue.path[0]] = issue.message
      })
      setCommitteeErrors(errors)
      return
    }

    const validatedData = validationResult.data

    if (editingMember) {
      updateCommitteeMemberMutation.mutate({
        id: editingMember.id,
        member: validatedData,
        user,
        profile
      }, {
        onSuccess: () => {
          cancelEditingCommittee()
        }
      })
    } else {
      createCommitteeMemberMutation.mutate({
        member: validatedData,
        user,
        profile
      }, {
        onSuccess: () => {
          setNewMemberName('')
          setNewMemberRoleTitle('Member')
          setNewMemberPhone('')
          setNewMemberEmail('')
          setNewMemberDisplayOrder('0')
          setNewMemberIsActive(true)
        }
      })
    }
  }

  const startEditCommittee = (member) => {
    setEditingMember(member)
    setNewMemberName(member.fullName)
    setNewMemberRoleTitle(member.roleTitle)
    setNewMemberPhone(member.phone || '')
    setNewMemberEmail(member.email || '')
    setNewMemberDisplayOrder(String(member.displayOrder))
    setNewMemberIsActive(member.isActive)
    setCommitteeErrors(null)
  }

  const cancelEditingCommittee = () => {
    setEditingMember(null)
    setNewMemberName('')
    setNewMemberRoleTitle('Member')
    setNewMemberPhone('')
    setNewMemberEmail('')
    setNewMemberDisplayOrder('0')
    setNewMemberIsActive(true)
    setCommitteeErrors(null)
  }

  const handleDeleteCommittee = (member) => {
    if (window.confirm(`Are you sure you want to remove ${member.fullName} from the committee?`)) {
      deleteCommitteeMemberMutation.mutate({
        id: member.id,
        fullName: member.fullName,
        user,
        profile
      })
    }
  }

  const handleMoveOrder = async (member, direction) => {
    const currentIndex = committee.findIndex(m => m.id === member.id)
    if (currentIndex === -1) return
    const targetIndex = currentIndex + direction
    if (targetIndex < 0 || targetIndex >= committee.length) return

    const targetMember = committee[targetIndex]
    const currentOrder = member.displayOrder
    const targetOrder = targetMember.displayOrder

    const updatedMember1 = {
      fullName: member.fullName,
      roleTitle: member.roleTitle,
      phone: member.phone,
      email: member.email,
      displayOrder: targetOrder,
      isActive: member.isActive
    }
    const updatedMember2 = {
      fullName: targetMember.fullName,
      roleTitle: targetMember.roleTitle,
      phone: targetMember.phone,
      email: targetMember.email,
      displayOrder: currentOrder,
      isActive: targetMember.isActive
    }

    try {
      await updateCommitteeMemberMutation.mutateAsync({
        id: member.id,
        member: updatedMember1,
        user,
        profile
      })
      await updateCommitteeMemberMutation.mutateAsync({
        id: targetMember.id,
        member: updatedMember2,
        user,
        profile
      })
      toast.success("Display order adjusted!")
    } catch (err) {
      console.error("Reordering failed:", err)
    }
  }

  const handleExportLogsCSV = () => {
    const headers = ['Log ID', 'User ID', 'Name', 'Role', 'Action', 'Details', 'Date']
    const rows = auditLogs.map(log => [
      log.id || '',
      log.userId || '',
      log.userName || 'System',
      log.role || 'system',
      log.action || log.actionType || '',
      (log.details || log.description || '').replace(/"/g, '""'),
      log.date || ''
    ])
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `sfa_audit_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 border border-slate-800 text-white p-3.5 rounded-xl shadow-2xl space-y-1.5 text-xs">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{label}</p>
          {payload.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-4">
              <span className="font-semibold" style={{ color: item.color }}>{item.name}:</span>
              <span className="font-black text-amber-500">{formatUGX(item.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const handleExportContributionsCSV = () => {
    const headers = ['Date', 'Member Name', 'Amount UGX', 'Phase/Purpose', 'Status']
    const rows = contributions.map(c => [
      c.date,
      c.userName,
      c.amount,
      c.purposeName,
      c.status
    ])
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `sfa_contributions_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportExpensesCSV = () => {
    const headers = ['Expense ID', 'Description', 'Phase Name', 'Amount (UGX)', 'Submitted By', 'Approved By', 'Date', 'Status']
    const rows = expenses.map(e => [
      e.id,
      e.description,
      e.phaseName,
      e.amount,
      e.submittedBy,
      e.approvedBy || 'N/A',
      e.date,
      e.status
    ])
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `sfa_expenses_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculations wrapped in useMemo for performance
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

  const handleDownloadPDF = async () => {
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

  const filteredContributions = useMemo(() => {
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

  const filteredExpenses = useMemo(() => {
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
    return filteredContributions.reduce((sum, c) => sum + c.amount, 0)
  }, [filteredContributions])

  const reportTotalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [filteredExpenses])

  const reportNetBalance = useMemo(() => {
    return reportTotalCollected - reportTotalSpent
  }, [reportTotalCollected, reportTotalSpent])

  const approvedContributions = useMemo(() => contributions.filter(c => c.status === 'Approved'), [contributions])
  const totalCollected = useMemo(() => approvedContributions.reduce((sum, c) => sum + c.amount, 0), [approvedContributions])
  const totalSpent = useMemo(() => expenses.filter(e => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0), [expenses])
  const netBalance = useMemo(() => totalCollected - totalSpent, [totalCollected, totalSpent])
  const highValueTransactions = useMemo(() => approvedContributions.filter(c => c.amount >= 1000000), [approvedContributions])

  const totalPhaseBudget = useMemo(() => phases.reduce((sum, p) => sum + p.budget, 0), [phases])
  const percentCollected = useMemo(() => totalPhaseBudget > 0 ? Math.round((totalCollected / totalPhaseBudget) * 100) : 0, [totalCollected, totalPhaseBudget])

  const pledgesOutstanding = useMemo(() => {
    return pledges.reduce((sum, p) => sum + (Number(p.amount) - Number(p.fulfilledAmount || p.amountPaid || 0)), 0)
  }, [pledges])

  const contributionsGrouped = useMemo(() => {
    const groups = {}
    filteredContributions.forEach(c => {
      const groupName = c.purposeType === 'event' ? `Event: ${c.purposeName}` : `Phase: ${c.purposeName}`
      if (!groups[groupName]) {
        groups[groupName] = { items: [], subtotal: 0 }
      }
      groups[groupName].items.push(c)
      groups[groupName].subtotal += c.amount
    })
    return groups
  }, [filteredContributions])

  const expensesGrouped = useMemo(() => {
    const groups = {}
    filteredExpenses.forEach(e => {
      const phaseName = e.phaseName || 'Unknown Phase'
      if (!groups[phaseName]) {
        groups[phaseName] = { items: [], subtotal: 0 }
      }
      groups[phaseName].items.push(e)
      groups[phaseName].subtotal += e.amount
    })
    return groups
  }, [filteredExpenses])

  const phaseBudgetVsActual = useMemo(() => {
    return phases.map(p => {
      const collected = filteredContributions
        .filter(c => c.purposeType === 'phase' && c.purposeName === p.name)
        .reduce((sum, c) => sum + c.amount, 0)
      const spent = filteredExpenses
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
  }, [phases, filteredContributions, filteredExpenses])

  const monthlyChartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const chartData = months.map(m => ({ name: m, Contributions: 0, Expenses: 0 }))

    approvedContributions.forEach(c => {
      if (c.date) {
        const dateObj = new Date(c.date)
        const monthIndex = dateObj.getMonth()
        if (monthIndex >= 0 && monthIndex < 12) {
          chartData[monthIndex].Contributions += Number(c.amount)
        }
      }
    })

    const approvedExpenses = expenses.filter(e => e.status === 'Approved')
    approvedExpenses.forEach(e => {
      if (e.date) {
        const dateObj = new Date(e.date)
        const monthIndex = dateObj.getMonth()
        if (monthIndex >= 0 && monthIndex < 12) {
          chartData[monthIndex].Expenses += Number(e.amount)
        }
      }
    })

    return chartData
  }, [approvedContributions, expenses])

  const pendingApprovals = useMemo(() => expenses.filter(e => e.status === 'Pending_Approval'), [expenses])

  // Fraud detection calculations (Excludes official batch ledger file headers)
  const duplicates = useMemo(() => {
    const counts = {}
    contributions.forEach(c => {
      if (c.reference && c.status === 'Pending' && !c.reference.startsWith('Ledger File') && !c.reference.toLowerCase().includes('ledger')) {
        const ref = c.reference.trim().toUpperCase()
        counts[ref] = (counts[ref] || 0) + 1
      }
    })
    return contributions.filter(c => c.reference && c.status === 'Pending' && !c.reference.startsWith('Ledger File') && !c.reference.toLowerCase().includes('ledger') && counts[c.reference.trim().toUpperCase()] > 1)
  }, [contributions])

  if (profilesLoading || phasesLoading || contribsLoading || expensesLoading) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
        <div className="max-w-7xl w-full space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-2">
              <div className="h-6 w-48 bg-slate-300 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
            </div>
            <div className="h-10 w-24 bg-slate-300 dark:bg-slate-800 rounded-xl"></div>
          </div>
          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6"></div>
            ))}
          </div>
          {/* Large Card Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-905 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
            <div className="h-96 bg-slate-200 dark:bg-slate-905 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    )
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
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lusanja Project</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard Overview</span>
            </button>

            <button 
              onClick={() => { setActiveTab('financials'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'financials' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Financial Reports</span>
            </button>

            <button 
              onClick={() => { setActiveTab('system_data'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'system_data' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-5 h-5" />
              <span>Contributions & System Data</span>
            </button>

            <button 
              onClick={() => { setActiveTab('projects'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'projects' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Hammer className="w-5 h-5" />
              <span>Phases & Progress</span>
            </button>

            <button 
              onClick={() => { setActiveTab('approvals'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'approvals' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <CheckSquare className="w-5 h-5" />
                <span>Sensitive Approvals</span>
              </div>
              {pendingApprovals.length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingApprovals.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'users' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </button>

            <button 
              onClick={() => { setActiveTab('committee'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'committee' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Building Committee</span>
            </button>

            <button 
              onClick={() => { setActiveTab('feedback'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'feedback' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5" />
                <span>Feedback Inbox</span>
              </div>
              {feedback.filter(f => f.status === 'Pending').length > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {feedback.filter(f => f.status === 'Pending').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('ads'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'ads' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Megaphone className="w-5 h-5" />
              <span>Ad & Directory Hub</span>
            </button>

            <button 
              onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'security' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Security & Backups</span>
            </button>

            <button 
              onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'logs' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span>Audit Logs</span>
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              AD
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-none truncate">{profile?.full_name}</p>
              <span className="text-[10px] text-emerald-500 font-semibold dark:text-emerald-400">Admin oversight</span>
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 capitalize truncate">
              {activeTab === 'security' ? 'Security Settings' : activeTab === 'ads' ? 'Ad Management & Directory' : `${activeTab.replace('_', ' ')} Panel`}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => {
                const newMode = !darkMode
                setDarkMode(newMode)
                localStorage.setItem('sfa_dark_mode', String(newMode))
              }}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in">
          
          {/* TAB: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <>
              <GlobalBudgetOverview />

              {/* Duplicate Reference Fraud Alert Panel */}
              {duplicates.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/25 rounded-2xl p-5 mb-6 text-rose-700 dark:text-rose-400 animate-pulse flex items-start space-x-3.5">
                  <AlertTriangle className="w-5.5 h-5.5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <h4 className="font-bold text-sm text-rose-950 dark:text-rose-250">Critical Fraud Alert: Duplicate payment reference detected!</h4>
                    <p className="text-xs text-rose-700 dark:text-rose-450">Multiple contributions have been submitted using identical payment reference strings. This may indicate duplicate receipt fraud or re-submission of older slips.</p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px] text-rose-900 dark:text-rose-350">
                        <thead>
                          <tr className="border-b border-rose-500/20 pb-1 uppercase font-bold text-rose-600 dark:text-rose-400">
                            <th className="pb-1.5">Tx ID</th>
                            <th className="pb-1.5">Submitted By</th>
                            <th className="pb-1.5">Reference ID</th>
                            <th className="pb-1.5">Amount</th>
                            <th className="pb-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicates.map(d => (
                            <tr key={d.id} className="border-t border-rose-500/10">
                              <td className="py-1 text-slate-500 dark:text-slate-400 font-mono">{d.id}</td>
                              <td className="py-1 font-semibold">{d.userName}</td>
                              <td className="py-1 font-mono text-rose-600 dark:text-rose-400">{d.reference}</td>
                              <td className="py-1 font-bold">${d.amount.toLocaleString()}</td>
                              <td className="py-1">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  d.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600' :
                                  d.status === 'Pending' ? 'bg-amber-500/15 text-amber-600 animate-pulse' :
                                  'bg-slate-400/15 text-slate-500'
                                }`}>
                                  {d.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Financial Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-2xl">
                    <Coins className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Collected</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatUGX(totalCollected)}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Goal: {formatUGX(totalPhaseBudget)} ({percentCollected}%)</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-rose-500/10 dark:bg-rose-400/10 rounded-2xl">
                    <Coins className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Disbursed</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatUGX(totalSpent)}</h3>
                    <span className="text-[10px] text-emerald-500 font-medium mt-1 block">100% Audit Cleared</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-2xl">
                    <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Net Balance</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatUGX(netBalance)}</h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">In Project Bank & MOMO</span>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 glow-primary flex items-center space-x-4">
                  <div className="p-3.5 bg-amber-500/10 dark:bg-amber-400/10 rounded-2xl">
                    <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Active Fundraisers</span>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {events.filter(e => e.status === 'Active').length} Active
                    </h3>
                    <span className="text-[10px] text-slate-400 mt-1 block">Targeting Roofing/Walling</span>
                  </div>
                </div>
              </div>

              {/* Tabs Switcher Container */}
              <div className="flex bg-slate-105 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-md w-full">
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Bar Chart Column */}
                  <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Contributions vs Expenses Analysis</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Comparing approved monthly collections and expense outflows</p>
                      </div>
                    </div>
                    <div className="h-80 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChartData} margin={{ bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                          <XAxis dataKey="name" stroke="#64748b" />
                          <YAxis stroke="#64748b" tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value} />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Legend wrapperStyle={{ pt: 10 }} />
                          <Bar dataKey="Contributions" name="Collections (UGX)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Expenses" name="Outflows (UGX)" fill="#d97706" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Donut Chart Column */}
                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Fundraising Events Target Accomplishment</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Overview of income vs targets</p>
                    </div>
                    <div className="h-60 w-full flex items-center justify-center relative">
                      <div className="absolute flex flex-col items-center justify-center text-center z-10 pointer-events-none">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Total Income</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white leading-none mt-1">
                          {formatUGX(events.reduce((sum, e) => sum + e.income, 0))}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={events}
                            dataKey="income"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                          >
                            {events.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#1e3a8a', '#2563eb', '#ca8a04', '#3b82f6', '#d97706', '#0f172a'][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [formatUGX(value), 'Income']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <div>
                        <p className="text-slate-400 dark:text-slate-500 font-semibold">Total Target</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {formatUGX(events.reduce((sum, e) => sum + e.targetAmount, 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-slate-500 font-semibold">Total Income</p>
                        <p className="font-bold text-emerald-500">
                          {formatUGX(events.reduce((sum, e) => sum + e.income, 0))}
                        </p>
                      </div>
                    </div>
                    
                    {/* Detailed Legend */}
                    <div className="mt-4 max-h-36 overflow-y-auto space-y-2 text-xs border-t border-slate-105 dark:border-slate-800 pt-3">
                      {events.map((event, index) => {
                        const totalIncome = events.reduce((sum, e) => sum + e.income, 0) || 1;
                        const percent = ((event.income / totalIncome) * 100).toFixed(0);
                        const color = ['#1e3a8a', '#2563eb', '#ca8a04', '#3b82f6', '#d97706', '#0f172a'][index % 6];
                        return (
                          <div key={event.id} className="flex items-center justify-between text-slate-700 dark:text-slate-350">
                            <div className="flex items-center space-x-2 truncate">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="truncate font-semibold">{event.name}</span>
                            </div>
                            <span className="font-bold shrink-0 pl-2 text-slate-900 dark:text-white">
                              {percent}% ({formatUGX(event.income)})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: RECENT TRANSACTIONS (Audit Trail) */}
              {dashboardSubTab === 'transactions' && (
                <div className="glass-card rounded-2xl p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Audit Trail</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Real-time immutable security & audit logs</p>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto pr-2 space-y-4">
                    {((supabaseAuditLogs.length > 0) ? supabaseAuditLogs : auditLogs.map(log => ({
                      id: log.id,
                      userName: log.userName || 'System',
                      role: log.role || 'system',
                      action: log.action || 'Modify',
                      details: log.details || '',
                      date: log.date || ''
                    }))).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-405 dark:text-slate-400">
                        No audit logs recorded yet.
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 pl-6 space-y-6">
                        {((supabaseAuditLogs.length > 0) ? supabaseAuditLogs : auditLogs.map(log => ({
                          id: log.id,
                          userName: log.userName || 'System',
                          role: log.role || 'system',
                          action: log.action || 'Modify',
                          details: log.details || '',
                          date: log.date || ''
                        }))).map((log) => (
                          <div key={log.id} className="relative group">
                            {/* Timeline Dot */}
                            <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-950 group-hover:bg-indigo-400 transition-colors animate-pulse" />
                            
                            {/* Log Content */}
                            <div className="space-y-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {log.userName}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold capitalize ${
                                    log.role === 'admin' ? 'bg-rose-500/10 text-rose-500' :
                                    log.role === 'treasurer' ? 'bg-amber-500/10 text-amber-500' :
                                    log.role === 'coordinator' ? 'bg-sky-500/10 text-sky-400' :
                                    'bg-indigo-500/10 text-indigo-400'
                                  }`}>
                                    {log.role}
                                  </span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                                    [{log.action}]
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  {log.date}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                                {log.details}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pending Approvals quick alert */}
              {pendingApprovals.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Pending Sensitive Transaction Approvals</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        There are {pendingApprovals.length} transaction requests awaiting your final authorization.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('approvals')}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-amber-500/10 transition-colors"
                  >
                    View & Approve
                  </button>
                </div>
              )}

              {/* Construction Phases Mini Progress Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Construction Phase Status Tracker</h4>
                  <button onClick={() => setActiveTab('projects')} className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">
                    View detailed phases &rarr;
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {phases.slice(0, 6).map(p => (
                    <div key={p.id} className="glass-card rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{p.name}</h5>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">Contractor: {p.contractorName}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          p.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500 animate-pulse' :
                          'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      {/* Photo indicator */}
                      {p.sitePhotos && p.sitePhotos.length > 0 ? (
                        <div className="h-28 rounded-xl overflow-hidden relative">
                          <img src={p.sitePhotos[0]} alt={p.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                            <span className="text-[10px] text-white font-medium">Site photo updated</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-28 bg-slate-100 dark:bg-slate-800/50 rounded-xl flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400">No site photo uploaded</span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          <span>Progress</span>
                          <span>{p.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${p.progress}%` }}></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-[10px] border-t border-slate-105 dark:border-slate-800 pt-3">
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 font-semibold">Collected</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{formatUGX(p.amountCollected)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-slate-500 font-semibold">Spent</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{formatUGX(p.amountSpent)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
                    onClick={handleDownloadPDF}
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
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-400">Financial Report Customizer & Addendum Drawer</span>
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
                        { key: 'showRemarks', label: '5. Remarks & Directives' },
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
                        Executive Remarks & Audit Directives
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
                        <p>Prepared by: <span className="font-black text-slate-950 dark:text-white">{profile?.full_name || 'Kiyimba Paul'} ({profile?.role || 'admin'})</span></p>
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
                        Executive Remarks & Audit Directives
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
                              <td className="py-3.5 text-right font-mono font-black text-base text-amber-600 dark:text-amber-400">{formatUGX(pledgesOutstanding)}</td>
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
                            <span className="font-cursive-signature text-base text-indigo-700 dark:text-indigo-300 font-bold">{profile?.role === 'admin' ? (profile?.full_name || 'Administrator') : 'Administrator'}</span>
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

          {/* TAB: PHASES & PROGRESS */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {phases.map((p) => (
                <div key={p.id} className="glass-card rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{p.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{p.description}</p>
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                      p.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500 animate-pulse' :
                      'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Contractor & Engineer */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 font-semibold">Contractor Details</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{p.contractorName}</p>
                      <p className="text-[10px] text-slate-400">{p.contractorEmail}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 font-semibold">Project Engineer</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{p.engineerName}</p>
                    </div>
                  </div>

                  {/* Materials & Timeline */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 font-semibold">Required Materials</p>
                      <p className="text-slate-600 dark:text-slate-400 mt-0.5 truncate" title={p.requiredMaterials}>
                        {p.requiredMaterials}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 dark:text-slate-500 font-semibold">Target Completion</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{p.completionDate}</p>
                    </div>
                  </div>

                  {/* Budget & Progress */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-400 dark:text-slate-500 font-semibold">Collected</p>
                        <p className="font-bold text-emerald-500">{formatUGX(p.amountCollected)}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-slate-400 dark:text-slate-500 font-semibold">Spent</p>
                        <p className="font-bold text-rose-500">{formatUGX(p.amountSpent)}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        <span>Progress</span>
                        <span>{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${p.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB: SENSITIVE APPROVALS */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sensitive & High-Value Expenses Waiting Approval</h4>
                    <p className="text-xs text-slate-405">Transactions exceeding UGX 3,700,000 or requiring administrative release</p>
                  </div>
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    Oversight Role Required
                  </span>
                </div>

                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">All Clear!</h5>
                    <p className="text-xs text-slate-400">There are no pending sensitive approvals at this time.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApprovals.map((exp) => (
                      <div key={exp.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2.5">
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                              {exp.id}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">Submitted on {exp.date}</span>
                          </div>
                          <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{exp.description}</h5>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                            <span>Phase: <strong className="text-slate-500">{exp.phaseName}</strong></span>
                            <span>&bull;</span>
                            <span>Requested By: <strong className="text-slate-500">{exp.submittedBy}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Amount</span>
                            <span className="text-xl font-bold text-rose-500">{formatUGX(exp.amount)}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleApproveExpense(exp.id)}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors shadow-md shadow-emerald-500/10"
                              title="Approve Transaction"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleRejectExpense(exp.id)}
                              className="bg-rose-500 hover:bg-rose-600 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors shadow-md shadow-rose-500/10"
                              title="Reject Transaction"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create Staff / User Account Form Card (1/3 width) */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <span>Create User Account</span>
                  </h4>
                  <p className="text-xs text-slate-405 mt-1">
                    Deploy new administrative credentials. Created accounts bypass verification and can be logged into instantly.
                  </p>
                </div>
                
                <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Eng. Sarah Nakazibwe"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Email Address</label>
                    <input 
                      type="email"
                      required
                      placeholder="staff@sfa.org"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Phone */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Phone Number</label>
                    <input 
                      type="text"
                      placeholder="+256 700 000000"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Password</label>
                    <input 
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Role Select */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Account Role</label>
                    <select 
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="coordinator">Project Coordinator</option>
                      <option value="treasurer">Church Treasurer</option>
                      <option value="admin">System Administrator</option>
                      <option value="member">Congregation Member</option>
                    </select>
                  </div>

                  {formError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  
                  {formSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center space-x-2">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-500 hover:to-indigo-550 text-white rounded-xl font-bold shadow-md shadow-primary-500/15 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {formLoading ? 'Creating User...' : 'Create Account'}
                  </button>
                </form>
              </div>

              {/* User Management List Card (2/3 width) */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">System User Management</h4>
                    <p className="text-xs text-slate-400 mt-1">Control system-wide roles and configuration access</p>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex items-center space-x-3 text-xs">
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchUser}
                      onChange={(e) => setSearchUser(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                    <select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                    <option value="admin">Admin</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="member">Member</option>
                    </select>
                  </div>
                </div>

                {/* Mobile Stacked Data Cards View (<768px) */}
                <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                  {Object.values(profiles)
                    .filter(p => {
                      const s = (searchUser || '').toLowerCase()
                      const matchesSearch = !s || (p.full_name && p.full_name.toLowerCase().includes(s)) || (p.email && p.email.toLowerCase().includes(s))
                      const matchesRole = roleFilter === 'all' || p.role === roleFilter
                      return matchesSearch && matchesRole
                    })
                    .map((usr) => (
                      <div key={usr.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white text-sm">{usr.full_name}</h5>
                            <p className="text-[11px] text-slate-400 font-mono">{usr.email}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            usr.role === 'admin' ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' :
                            usr.role === 'treasurer' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' :
                            usr.role === 'coordinator' ? 'bg-sky-500/15 text-sky-500 border border-sky-500/30' :
                            'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30'
                          }`}>
                            {usr.role}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-500">Change Role:</span>
                          <select 
                            value={usr.role}
                            onChange={(e) => handleUpdateRole(usr.id, e.target.value)}
                            className="px-2.5 py-1.5 min-h-[36px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            <option value="coordinator">Coordinator</option>
                            <option value="treasurer">Treasurer</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Desktop Table View (>=768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                        <th className="pb-3">User ID</th>
                        <th className="pb-3">Full Name</th>
                        <th className="pb-3">Email</th>
                        <th className="pb-3">Phone</th>
                        <th className="pb-3">Role Badge</th>
                        <th className="pb-3 text-right">Assign Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {Object.values(profiles)
                        .filter(p => {
                          const s = (searchUser || '').toLowerCase()
                          const matchesSearch = !s || (p.full_name && p.full_name.toLowerCase().includes(s)) || (p.email && p.email.toLowerCase().includes(s))
                          const matchesRole = roleFilter === 'all' || p.role === roleFilter
                          return matchesSearch && matchesRole
                        })
                        .map((usr) => (
                          <tr key={usr.id} className="text-slate-700 dark:text-slate-300">
                            <td className="py-4 font-mono text-slate-400 truncate max-w-[120px]" title={usr.id}>{usr.id}</td>
                            <td className="py-4 font-medium">{usr.full_name}</td>
                            <td className="py-4">{usr.email}</td>
                            <td className="py-4 text-slate-400">{usr.phone || 'N/A'}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                usr.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                usr.role === 'treasurer' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                usr.role === 'coordinator' ? 'bg-sky-500/10 text-sky-500 border border-sky-500/20' :
                                'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                              }`}>
                                {usr.role}
                              </span>
                            </td>
                            <td className="py-4 text-right flex justify-end items-center space-x-2">
                              <select 
                                value={usr.role}
                                onChange={(e) => handleUpdateRole(usr.id, e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-primary-500 text-[10px] font-semibold text-slate-600 dark:text-slate-300"
                              >
                                <option value="admin">Make Admin</option>
                                <option value="treasurer">Make Treasurer</option>
                                <option value="coordinator">Make Coordinator</option>
                                <option value="member">Make Member</option>
                              </select>
                              {usr.id !== profile.id && (
                                <button
                                  onClick={() => handleDeleteUser(usr.id)}
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500 hover:text-rose-600 rounded transition-colors cursor-pointer animate-hover"
                                  title="Delete User Account"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: BUILDING COMMITTEE MANAGEMENT */}
          {activeTab === 'committee' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Create/Edit Committee Member Form (1/3 width) */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    <span>{editingMember ? 'Edit Committee Member' : 'Add Committee Member'}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {editingMember ? 'Modify active member details' : 'Register a new member to the building committee.'}
                  </p>
                </div>
                
                <form onSubmit={handleCommitteeSubmit} className="space-y-4 text-xs font-semibold">
                  {committeeErrors && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl space-y-1">
                      {Object.entries(committeeErrors).map(([key, msg]) => (
                        <div key={key}>&bull; {msg}</div>
                      ))}
                    </div>
                  )}

                  {/* Full Name */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Deacon Charles Mugisha"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Role Title */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Role / Title</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Chairperson, Secretary, Treasurer, Member"
                      value={newMemberRoleTitle}
                      onChange={(e) => setNewMemberRoleTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  
                  {/* Phone */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Phone Number</label>
                    <input 
                      type="text"
                      placeholder="+256772123456"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Email Address</label>
                    <input 
                      type="email"
                      placeholder="member@sfa.org"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Display Order */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Display Order</label>
                    <input 
                      type="number"
                      min="0"
                      value={newMemberDisplayOrder}
                      onChange={(e) => setNewMemberDisplayOrder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Active Member</span>
                    <button
                      type="button"
                      onClick={() => setNewMemberIsActive(!newMemberIsActive)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        newMemberIsActive ? 'bg-indigo-650 font-semibold' : 'bg-slate-300 dark:bg-slate-850'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          newMemberIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="submit"
                      disabled={createCommitteeMemberMutation.isPending || updateCommitteeMemberMutation.isPending}
                      className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-500 hover:to-indigo-550 text-white rounded-xl font-bold shadow-md shadow-primary-500/15 transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                    >
                      <span>{editingMember ? 'Update Member' : 'Add Member'}</span>
                    </button>
                    {editingMember && (
                      <button
                        type="button"
                        onClick={cancelEditingCommittee}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold transition-all cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Committee Members list (2/3 width) */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Committee Directory</h4>
                  <p className="text-xs text-slate-400 mt-1">Configure hierarchy, display order, and roles</p>
                </div>

                {committeeLoading ? (
                  <div className="text-center py-12 text-xs text-slate-405">Loading committee...</div>
                ) : committee.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl italic text-xs text-slate-400">
                    Committee not yet formed. Configure members above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                          <th className="pb-3 w-12">Order</th>
                          <th className="pb-3">Full Name</th>
                          <th className="pb-3">Role / Badge</th>
                          <th className="pb-3">Contact</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold">
                        {committee.map((member, index) => (
                          <tr key={member.id} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                            <td className="py-4">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-slate-400">{member.displayOrder}</span>
                                <div className="flex flex-col space-y-0.5">
                                  <button
                                    onClick={() => handleMoveOrder(member, -1)}
                                    disabled={index === 0}
                                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 disabled:opacity-30 rounded border-0 bg-transparent cursor-pointer"
                                  >
                                    &and;
                                  </button>
                                  <button
                                    onClick={() => handleMoveOrder(member, 1)}
                                    disabled={index === committee.length - 1}
                                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 disabled:opacity-30 rounded border-0 bg-transparent cursor-pointer"
                                  >
                                    &or;
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                                  {member.fullName.charAt(0)}
                                </div>
                                <span className="text-slate-800 dark:text-slate-200">{member.fullName}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 rounded-full text-[10px]">
                                {member.roleTitle}
                              </span>
                            </td>
                            <td className="py-4">
                              <div className="text-[10px] space-y-0.5 text-slate-500">
                                <div>P: {member.phone || 'N/A'}</div>
                                <div>E: {member.email || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${member.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-400/10 text-slate-505'}`}>
                                {member.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-4 text-right space-x-2">
                              <button
                                onClick={() => startEditCommittee(member)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 font-bold transition-all border-0 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCommittee(member)}
                                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 rounded font-bold transition-all border-0 cursor-pointer"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: SECURITY & BACKUPS */}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: 2FA Security Control */}
              <div className="glass-card rounded-2xl p-6 space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Multi-Factor Authentication (2FA)</h4>
                    <p className="text-xs text-slate-400">Enforce secondary login verification checks</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <div className="space-y-1 pr-4">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Force system-wide 2FA at Login</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        When enabled, all users logging in must enter a simulated OTP passcode (e.g. 123456) to complete authentication.
                      </p>
                    </div>
                    
                    {/* Toggle Switch */}
                    <button
                      onClick={handleToggle2FA}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        twoFactorEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-850'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-xs text-indigo-750 dark:text-indigo-300">
                    <Shield className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h5 className="font-bold">System Security Level: {twoFactorEnabled ? 'High (2FA Enforced)' : 'Standard'}</h5>
                      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-indigo-400/80">
                        Our mock 2FA is currently active for all seeded administrative emails (Admin, Treasurer, Coordinator, Member) when enabled. Disabling it allows bypassing OTP verification for quick testing.
                      </p>
                    </div>
                  </div>
                </div>
                </div>

              {/* Fraud Alert Board */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Security & Fraud Board</h4>
                    <p className="text-xs text-slate-400">Detecting double submissions and outlier activities</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  {/* Left Column: Duplicate Payments */}
                  <div className="space-y-4">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Duplicate Reference Fraud Check</h5>
                    {duplicates.length === 0 ? (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-slate-500 text-center italic">
                        No duplicate payment references found. Ledger is clean.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold animate-pulse">
                          ⚠️ WARNING: {duplicates.length} records sharing duplicate bank reference codes!
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {duplicates.map(d => (
                            <div key={d.id} className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-700 dark:text-slate-350">{d.userName}</span>
                                <span className="text-rose-500">{formatUGX(d.amount)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-450">
                                <span>Ref: <strong className="font-mono text-rose-600 dark:text-rose-400">{d.reference}</strong></span>
                                <span>Date: {d.date}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: High Value Transactions */}
                  <div className="space-y-4">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">High-Value Audit Check</h5>
                    {highValueTransactions.length === 0 ? (
                      <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 rounded-2xl text-slate-500 text-center italic">
                        No high-value transactions logged.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-400">
                          Transactions exceeding UGX 7,400,000 requiring careful manual audit of deposit slips.
                        </p>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {highValueTransactions.map(h => (
                            <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-xl space-y-1">
                              <div className="flex justify-between font-bold">
                                <span className="text-slate-700 dark:text-slate-300">{h.userName}</span>
                                <span className="text-indigo-500 font-bold">{formatUGX(h.amount)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Purpose: {h.purposeName}</span>
                                <span>Status: <strong className={h.status === 'Approved' ? 'text-emerald-500' : 'text-amber-500'}>{h.status}</strong></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans">System Security Audit Trail</h4>
                    <p className="text-xs text-slate-400">Complete immutable record of all administrative and financial actions</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleExportLogsCSV}
                      className="bg-indigo-650 bg-indigo-650 bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 transition-colors flex items-center space-x-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Logs (CSV)</span>
                    </button>
                    <span className="flex items-center space-x-1 text-emerald-500 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      <span>Real-time Secure Sync</span>
                    </span>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Search Details / Users</label>
                    <input 
                      type="text"
                      placeholder="Search audit trail..."
                      value={logSearchText}
                      onChange={(e) => setLogSearchText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Filter by Action</label>
                    <select
                      value={logActionFilter}
                      onChange={(e) => setLogActionFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100 font-medium"
                    >
                      <option value="all">All Actions</option>
                      {Array.from(new Set(auditLogs.map(l => l.action).filter(Boolean))).map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Filter by Role</label>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100 font-medium"
                    >
                      <option value="all">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="member">Member</option>
                    </select>
                  </div>
                </div>

                {(() => {
                  const filteredLogs = auditLogs.filter(log => {
                    const rawDetails = log.details || log.description || log.action || ''
                    const details = (typeof rawDetails === 'object' && rawDetails !== null ? JSON.stringify(rawDetails) : String(rawDetails)).toLowerCase()
                    const userName = String(log.userName || log.user_email || '').toLowerCase()
                    const q = (logSearchText || '').toLowerCase().trim()
                    const matchesSearch = !q || details.includes(q) || userName.includes(q)
                    const matchesAction = !logActionFilter || logActionFilter === 'all' || log.action === logActionFilter
                    const matchesRole = !roleFilter || roleFilter === 'all' || log.role === roleFilter
                    return matchesSearch && matchesAction && matchesRole
                  })

                  return (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                      {filteredLogs.map((log) => {
                        const rawDetails = log.details || log.description || ''
                        const detailsStr = typeof rawDetails === 'object' && rawDetails !== null ? JSON.stringify(rawDetails) : String(rawDetails)
                        return (
                          <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
                            <div className="flex items-start space-x-3.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 mt-0.5">
                                <Shield className="w-4 h-4 text-indigo-500" />
                              </div>
                              <div>
                                <p className="text-slate-800 dark:text-slate-200 font-semibold leading-tight">{log.action || log.actionType || 'System Action'}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{detailsStr}</p>
                              </div>
                            </div>

                            <div className="text-left md:text-right text-[10px] text-slate-400 pl-11 md:pl-0 space-y-0.5">
                              <p className="font-semibold text-slate-550 dark:text-slate-400 capitalize">{log.userName || 'System'} ({log.role || 'system'})</p>
                              <p className="font-mono">{log.date || ''}</p>
                            </div>
                          </div>
                        )
                      })}
                      {filteredLogs.length === 0 && (
                        <div className="text-center py-8 text-slate-450 italic">No logs found matching filters.</div>
                      )}
                    </div>
                  )
                })()}
              </div>
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
                                : 'bg-amber-50 dark:bg-amber-955/45 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>

                          <p className="text-slate-705 dark:text-slate-300 mt-2.5 leading-relaxed font-semibold">
                            {f.message}
                          </p>

                          {f.status === 'Replied' && f.reply_message && (
                            <div className="mt-3.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                Official Reply (by: {f.replied_by === profile.id ? profile.full_name : 'Staff'})
                              </span>
                              <p className="text-slate-850 dark:text-slate-205 italic font-medium leading-relaxed">
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

              {/* Right Column: Reply Composer */}
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
                      <strong className="block text-slate-805 dark:text-slate-200 mt-1 font-bold">{selectedFeedback.subject}</strong>
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

                        replyFeedbackMutation.mutate({
                          id: selectedFeedback.id,
                          replyMessage: validatedData.replyMessage,
                          repliedBy: profile.id,
                          user,
                          profile
                        }, {
                          onSuccess: () => {
                            setSelectedFeedback(null)
                            setReplyMessage('')
                          }
                        })
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
                          className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-855 dark:text-slate-205 ${
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

          {/* TAB: ADVERTISEMENTS & BUSINESS DIRECTORY */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <AdManager />
            </div>
          )}

        </div>

      {/* ----------------- POPUP MODAL: SECURITY COMPLIANCE CONFIRMATION ----------------- */}
      {showConfirmModal && pendingUserAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-850 shadow-2xl animate-fade-in text-slate-850 dark:text-white">
            <div className="flex justify-between items-center border-b border-slate-105 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-sm text-rose-600 dark:text-rose-455 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                <span>Security Action Authorization</span>
              </h4>
              <button 
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingUserAction(null)
                  setConfirmInput('')
                }} 
                className="text-slate-404 dark:text-slate-400 hover:text-slate-655 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl text-xs space-y-2 text-rose-800 dark:text-rose-350 font-semibold leading-relaxed">
              {pendingUserAction.type === 'delete_user' ? (
                <>
                  <p>
                    WARNING: You are about to permanently delete the user account for <strong className="text-slate-955 dark:text-white">{pendingUserAction.userName}</strong>.
                  </p>
                  <p>
                    This will block their access to the system immediately. This action is irreversible.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    WARNING: You are changing the authorization role of <strong className="text-slate-955 dark:text-white">{pendingUserAction.userName}</strong> to <strong className="text-indigo-600 dark:text-indigo-400">{pendingUserAction.newRole}</strong>.
                  </p>
                  <p>
                    This will grant them the security permissions and access capabilities of the new role immediately.
                  </p>
                </>
              )}
              <p className="mt-2 text-[11px]">
                To proceed, please type <strong className="font-mono text-rose-950 dark:text-white select-all bg-rose-105 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">{confirmType}</strong> in the input field below.
              </p>
            </div>

            <div>
              <input 
                type="text" 
                placeholder={`Type ${confirmType} to confirm`}
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800 dark:text-slate-105 placeholder-slate-400 font-bold"
              />
            </div>

            <div className="flex space-x-2 pt-1.5 text-xs font-bold">
              <button 
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  setPendingUserAction(null)
                  setConfirmInput('')
                }}
                className="flex-1 py-2.5 bg-slate-105 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-750"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={confirmInput !== confirmType}
                onClick={() => {
                  if (pendingUserAction.type === 'delete_user') {
                    executeDeleteUser(pendingUserAction.userId)
                  } else {
                    executeUpdateRole(pendingUserAction.userId, pendingUserAction.newRole)
                  }
                  setShowConfirmModal(false)
                  setPendingUserAction(null)
                  setConfirmInput('')
                }}
                className={`flex-1 py-2.5 text-white rounded-xl shadow-sm cursor-pointer border-0 ${
                  confirmInput === confirmType 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-rose-400 cursor-not-allowed opacity-50'
                }`}
              >
                Authorize Action
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}