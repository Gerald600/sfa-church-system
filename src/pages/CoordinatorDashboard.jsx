import { useState, useEffect, useCallback, Fragment, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { 
  useProfiles, usePhases, useExpenses, useEvents, useAnnouncements, useDocuments, useFeedback, useProcurements,
  useCreatePhase, useUpdatePhase, useCreateEvent, useUpdateEvent, useCreateAnnouncement, useUploadDocument,
  useReplyFeedback, useCreateProcurement, useUpdateProcurementStatus, useCreatePhasePhoto,
  useBOQLineItems, useCreateBOQLineItem, useUpdateBOQLineItem,
  usePaymentDetails, useCreatePaymentDetail, useUpdatePaymentDetail, useDeletePaymentDetail, useCommittee
} from '../hooks/useData'
import { 
  LayoutDashboard, Hammer, FileText, 
  Activity, Sun, Moon, LogOut, Plus, Check, Trash2,
  FileCode, Send, Calendar, ListPlus, Bell, ClipboardList,
  MessageSquare, UploadCloud, X, Menu, ChevronDown, ChevronUp, Coins
} from 'lucide-react'
import { phaseSchema, eventSchema, feedbackReplySchema, validateUploadFile, paymentDetailsSchema } from '../utils/validation'
import GlobalBudgetOverview from '../components/GlobalBudgetOverview'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'


export default function CoordinatorDashboard() {
  const { user, profile, signOut } = useAuth()
  const queryClient = useQueryClient()
  const currentUserId = user?.id || 'coordinator-uid'
  const currentUserName = profile?.full_name || user?.email || 'Eng. John Baptist Lule'
  const currentUserRole = profile?.role || 'coordinator'
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sfa_dark_mode') === 'true')
  const [newPhaseUpdate, setNewPhaseUpdate] = useState('')

  // React Query data hook integration
  const { data: profiles = {}, isLoading: profilesLoading } = useProfiles()
  const { data: phases = [], isLoading: phasesLoading } = usePhases()
  const { data: documents = [], isLoading: docsLoading } = useDocuments()
  const { data: events = [], isLoading: eventsLoading } = useEvents()
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements()
  const { data: procurements = [], isLoading: procurementsLoading } = useProcurements()
  const { data: feedback = [], isLoading: feedbackLoading } = useFeedback()
  const { data: boqLineItems = [], isLoading: boqLoading } = useBOQLineItems()
  const { data: paymentDetails = [], isLoading: paymentDetailsLoading } = usePaymentDetails()
  const { data: committee = [] } = useCommittee()

  const createPaymentMutation = useCreatePaymentDetail()
  const updatePaymentMutation = useUpdatePaymentDetail()
  const deletePaymentMutation = useDeletePaymentDetail()

  // Payment Details Form States
  const [paymentMethodType, setPaymentMethodType] = useState('Mobile Money')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [providerName, setProviderName] = useState('')
  const [paymentInstructions, setPaymentInstructions] = useState('')
  const [paymentIsActive, setPaymentIsActive] = useState(true)
  const [editingPaymentDetail, setEditingPaymentDetail] = useState(null)
  const [paymentErrors, setPaymentErrors] = useState(null)

  // Memoized aggregations for dashboard statistics and QS master ledger
  const completedMilestonesCount = useMemo(() => {
    return phases.reduce((acc, p) => acc + (p.milestones?.filter(m => m.status === 'Completed').length || 0), 0)
  }, [phases])

  const logisticsStatus = useMemo(() => {
    const ready = events.reduce((acc, e) => acc + (e.logistics?.filter(l => l.status === 'Ready').length || 0), 0)
    const total = events.reduce((acc, e) => acc + (e.logistics?.length || 0), 0)
    return { ready, total }
  }, [events])

  const phaseBudgetsSum = useMemo(() => {
    return phases.reduce((sum, p) => sum + (p.boqBudget || p.boq_budget || p.budget || 0), 0)
  }, [phases])

  const boqMetrics = useMemo(() => {
    const metrics = {}
    phases.forEach(p => {
      const phaseItems = boqLineItems.filter(item => item.phaseId === p.id)
      const totalSpent = phaseItems.reduce((sum, item) => sum + (item.actualSpent || 0), 0)
      const budget = p.boqBudget || p.boq_budget || p.budget || 0
      const variance = budget - totalSpent
      metrics[p.id] = { phaseItems, totalSpent, budget, variance }
    })
    return metrics
  }, [phases, boqLineItems])


  // Mutations
  const createPhaseMutation = useCreatePhase()
  const updatePhaseMutation = useUpdatePhase()
  const createEventMutation = useCreateEvent()
  const updateEventMutation = useUpdateEvent()
  const createAnnouncementMutation = useCreateAnnouncement()
  const uploadDocumentMutation = useUploadDocument()
  const replyFeedbackMutation = useReplyFeedback()
  const createProcurementMutation = useCreateProcurement()
  const updateProcurementStatusMutation = useUpdateProcurementStatus()
  const createPhasePhotoMutation = useCreatePhasePhoto()
  const createBOQLineItemMutation = useCreateBOQLineItem()
  const updateBOQLineItemMutation = useUpdateBOQLineItem()

  // Selection & form states
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [newDoc, setNewDoc] = useState({ title: '', category: 'plans' })
  const [previewDoc, setPreviewDoc] = useState(null)
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' })
  const [newMaterialRequest, setNewMaterialRequest] = useState({
    item: '',
    quantity: '',
    phaseId: '',
    priority: 'Medium'
  })
  const [expandedBOQPhaseId, setExpandedBOQPhaseId] = useState(null)
  const [newBOQItem, setNewBOQItem] = useState({ description: '', unit: '', quantity: '', rate: '' })
  const [updatingBOQItem, setUpdatingBOQItem] = useState(null)
  const [actualSpentInput, setActualSpentInput] = useState('')

  // Set default phaseId for procurement request once phases load
  useEffect(() => {
    if (phases.length > 0 && !newMaterialRequest.phaseId) {
      setNewMaterialRequest(prev => ({ ...prev, phaseId: phases[0].id }))
    }
  }, [phases, newMaterialRequest.phaseId])

  // Phase Creation & Detailed Updates States
  const [isCreatingPhase, setIsCreatingPhase] = useState(false)
  const [newPhase, setNewPhase] = useState({
    name: '',
    description: '',
    budget: '',
    completionDate: '',
    contractorName: '',
    contractorEmail: '',
    engineerName: '',
    requiredMaterials: '',
  })

  // Event Logistics and Committees States
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [newEvent, setNewEvent] = useState({
    name: '',
    venue: '',
    date: '',
    linkedPhaseName: 'Roofing & Trussing',
    targetAmount: '',
    budget: ''
  })
  
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDeadline, setNewMilestoneDeadline] = useState('')
  const [newLogisticsItem, setNewLogisticsItem] = useState({
    item: '',
    quantity: '',
    status: 'Needed',
    assignedCommittee: 'Logistics Committee'
  })
  const [newCommitteeAssignment, setNewCommitteeAssignment] = useState({
    name: 'Logistics Committee',
    role: ''
  })
  const [customPhotoUrl, setCustomPhotoUrl] = useState('')

  // Feedback Hub states
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyErrors, setReplyErrors] = useState(null)

  // Zod validation error states
  const [phaseErrors, setPhaseErrors] = useState(null)
  const [eventErrors, setEventErrors] = useState(null)

  // Drag-and-drop state
  const [dragActive, setDragActive] = useState(false)

  // Drag-and-drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0])
    }
  }

  const handlePhotoUpload = (file) => {
    if (!file) return
    const validation = validateUploadFile(file)
    if (!validation.success) {
      alert(validation.error)
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      
      try {
        // Upload photo row to phase_photos
        await createPhasePhotoMutation.mutateAsync({
          phaseId: selectedPhase.id,
          imageUrl: dataUrl,
          user,
          profile,
          phaseName: selectedPhase.name
        })

        // Update the sitePhotos array directly in construction_phases
        const updatedPhotos = [...(selectedPhase.sitePhotos || []), dataUrl]
        const updatedPhase = { ...selectedPhase, sitePhotos: updatedPhotos }

        await updatePhaseMutation.mutateAsync({
          id: selectedPhase.id,
          phase: { sitePhotos: updatedPhotos },
          user,
          profile,
          actionName: 'Upload Phase Photo',
          actionDetails: `Uploaded construction photo for phase "${selectedPhase.name}" (${file.name})`
        })

        setSelectedPhase(updatedPhase)
      } catch (err) {
        console.error("Photo upload handling failed:", err)
      }
    }
    reader.readAsDataURL(file)
  }

  const categoryLabels = {
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

  const formatUGX = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Predefined unsplash URLs to choose for site photos simulation
  const constructionPhotos = [
    { name: 'Foundation Work', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80' },
    { name: 'Pillar Construction', url: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80' },
    { name: 'Brick Walling', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80' },
    { name: 'Roofing Structure', url: 'https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&w=600&q=80' }
  ]

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])


  // Site log update helpers
  const handleAddPhaseUpdate = async (e, phaseId) => {
    e.preventDefault()
    if (!newPhaseUpdate.trim()) return

    const updateEntry = {
      id: `upd-${Date.now()}`,
      content: newPhaseUpdate.trim(),
      date: new Date().toISOString().slice(0, 10),
      author: profile?.full_name || 'Coordinator'
    }

    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const updatedUpdates = [updateEntry, ...(currentPhase.updates || [])]
    const updatedPhase = { ...currentPhase, updates: updatedUpdates }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { updates: updatedUpdates },
        user,
        profile,
        actionName: 'Post Phase Update',
        actionDetails: `Posted site log update on phase "${currentPhase.name}": "${updateEntry.content}"`
      })
      setSelectedPhase(updatedPhase)
      setNewPhaseUpdate('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeletePhaseUpdate = async (phaseId, updateId) => {
    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const updatedUpdates = (currentPhase.updates || []).filter(u => u.id !== updateId)
    const updatedPhase = { ...currentPhase, updates: updatedUpdates }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { updates: updatedUpdates },
        user,
        profile,
        actionName: 'Delete Phase Update',
        actionDetails: `Removed site log update on phase "${currentPhase.name}"`
      })
      setSelectedPhase(updatedPhase)
    } catch (err) {
      console.error(err)
    }
  }

  // Update Construction Phase
  const handleUpdatePhase = async (e) => {
    e.preventDefault()
    if (!selectedPhase) return

    try {
      await updatePhaseMutation.mutateAsync({
        id: selectedPhase.id,
        phase: {
          name: selectedPhase.name,
          description: selectedPhase.description,
          budget: selectedPhase.budget,
          completionDate: selectedPhase.completionDate,
          status: selectedPhase.status,
          progress: selectedPhase.progress,
          contractorName: selectedPhase.contractorName,
          engineerName: selectedPhase.engineerName,
          requiredMaterials: selectedPhase.requiredMaterials
        },
        user,
        profile,
        actionName: 'Update Construction Phase',
        actionDetails: `Updated Phase "${selectedPhase.name}": Progress ${selectedPhase.progress}%, Status "${selectedPhase.status}"`
      })
      setSelectedPhase(null)
    } catch (err) {
      console.error(err)
    }
  }

  // Create Construction Phase
  const handleCreatePhase = async (e) => {
    e.preventDefault()
    setPhaseErrors(null)

    const validationResult = phaseSchema.safeParse({
      name: newPhase.name,
      description: newPhase.description,
      budget: newPhase.budget,
      completionDate: newPhase.completionDate,
      contractorName: newPhase.contractorName,
      contractorEmail: newPhase.contractorEmail,
      engineerName: newPhase.engineerName,
      requiredMaterials: newPhase.requiredMaterials
    })

    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setPhaseErrors(formattedErrors)
      return
    }

    const validatedData = validationResult.data
    const phaseEntry = {
      id: `phase-${Date.now()}`,
      name: validatedData.name,
      description: validatedData.description,
      budget: validatedData.budget,
      amountCollected: 0,
      amountSpent: 0,
      status: 'Not Started',
      progress: 0,
      contractorName: validatedData.contractorName,
      contractorEmail: validatedData.contractorEmail,
      engineerName: validatedData.engineerName,
      requiredMaterials: validatedData.requiredMaterials,
      completionDate: validatedData.completionDate,
      sitePhotos: [],
      milestones: []
    }

    try {
      await createPhaseMutation.mutateAsync({
        phase: phaseEntry,
        user,
        profile
      })

      setNewPhase({
        name: '',
        description: '',
        budget: '',
        completionDate: '',
        contractorName: '',
        contractorEmail: '',
        engineerName: '',
        requiredMaterials: '',
      })
      setIsCreatingPhase(false)
    } catch (err) {
      console.error(err)
    }
  }

  // Payment details helpers
  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    setPaymentErrors(null)

    const payload = {
      methodType: paymentMethodType,
      accountName,
      accountNumber,
      providerName,
      instructions: paymentInstructions,
      isActive: paymentIsActive
    }

    const validationResult = paymentDetailsSchema.safeParse(payload)
    if (!validationResult.success) {
      const errors = {}
      validationResult.error.issues.forEach(issue => {
        errors[issue.path[0]] = issue.message
      })
      setPaymentErrors(errors)
      return
    }

    const validatedData = validationResult.data

    if (editingPaymentDetail) {
      updatePaymentMutation.mutate({
        id: editingPaymentDetail.id,
        paymentDetail: validatedData,
        user,
        profile
      }, {
        onSuccess: () => {
          cancelEditingPayment()
        }
      })
    } else {
      createPaymentMutation.mutate({
        paymentDetail: validatedData,
        user,
        profile
      }, {
        onSuccess: () => {
          setAccountName('')
          setAccountNumber('')
          setProviderName('')
          setPaymentInstructions('')
          setPaymentIsActive(true)
        }
      })
    }
  }

  const startEditPayment = (detail) => {
    setEditingPaymentDetail(detail)
    setPaymentMethodType(detail.methodType)
    setAccountName(detail.accountName)
    setAccountNumber(detail.accountNumber)
    setProviderName(detail.providerName || '')
    setPaymentInstructions(detail.instructions || '')
    setPaymentIsActive(detail.isActive)
    setPaymentErrors(null)
  }

  const cancelEditingPayment = () => {
    setEditingPaymentDetail(null)
    setPaymentMethodType('Mobile Money')
    setAccountName('')
    setAccountNumber('')
    setProviderName('')
    setPaymentInstructions('')
    setPaymentIsActive(true)
    setPaymentErrors(null)
  }

  const handleDeletePayment = (detail) => {
    if (window.confirm(`Are you sure you want to delete payment channel "${detail.accountName}"?`)) {
      deletePaymentMutation.mutate({
        id: detail.id,
        accountName: detail.accountName,
        user,
        profile
      })
    }
  }

  // Milestone helpers
  const handleToggleMilestone = async (phaseId, milestoneId) => {
    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const milestones = (currentPhase.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, status: m.status === 'Completed' ? 'Pending' : 'Completed' } : m
    )
    
    const completedCount = milestones.filter(m => m.status === 'Completed').length
    const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : currentPhase.progress

    const updatedPhase = { ...currentPhase, milestones, progress: progressPercent }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { milestones, progress: progressPercent },
        user,
        profile,
        actionName: 'Toggle Milestone',
        actionDetails: `Toggled milestone in phase "${currentPhase.name}". New progress: ${progressPercent}%`
      })
      if (selectedPhase?.id === phaseId) {
        setSelectedPhase(updatedPhase)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddMilestone = async (e, phaseId) => {
    e.preventDefault()
    if (!newMilestoneTitle) return

    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const milestoneEntry = {
      id: `m-${Date.now()}`,
      title: newMilestoneTitle,
      status: 'Pending',
      deadline: newMilestoneDeadline || new Date().toISOString().slice(0, 10)
    }

    const milestones = [...(currentPhase.milestones || []), milestoneEntry]
    const completedCount = milestones.filter(m => m.status === 'Completed').length
    const progressPercent = Math.round((completedCount / milestones.length) * 100)
    
    const updatedPhase = { ...currentPhase, milestones, progress: progressPercent }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { milestones, progress: progressPercent },
        user,
        profile,
        actionName: 'Add Milestone',
        actionDetails: `Added milestone "${newMilestoneTitle}" to phase "${currentPhase.name}"`
      })
      setSelectedPhase(updatedPhase)
      setNewMilestoneTitle('')
      setNewMilestoneDeadline('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMilestone = async (phaseId, milestoneId) => {
    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const milestones = (currentPhase.milestones || []).filter(m => m.id !== milestoneId)
    const completedCount = milestones.filter(m => m.status === 'Completed').length
    const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0
    
    const updatedPhase = { ...currentPhase, milestones, progress: progressPercent }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { milestones, progress: progressPercent },
        user,
        profile,
        actionName: 'Delete Milestone',
        actionDetails: `Deleted milestone from phase "${currentPhase.name}"`
      })
      setSelectedPhase(updatedPhase)
    } catch (err) {
      console.error(err)
    }
  }

  // Gallery photo helpers
  const handleAddPhotoUrl = async (e, phaseId) => {
    e.preventDefault()
    if (!customPhotoUrl) return

    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const updatedPhotos = [...(currentPhase.sitePhotos || []), customPhotoUrl]
    const updatedPhase = { ...currentPhase, sitePhotos: updatedPhotos }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { sitePhotos: updatedPhotos },
        user,
        profile,
        actionName: 'Add Photo URL',
        actionDetails: `Added site photo URL for phase "${currentPhase.name}"`
      })
      setSelectedPhase(updatedPhase)
      setCustomPhotoUrl('')
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeletePhoto = async (phaseId, photoUrl) => {
    const currentPhase = phases.find(p => p.id === phaseId)
    if (!currentPhase) return

    const updatedPhotos = (currentPhase.sitePhotos || []).filter(url => url !== photoUrl)
    const updatedPhase = { ...currentPhase, sitePhotos: updatedPhotos }

    try {
      await updatePhaseMutation.mutateAsync({
        id: phaseId,
        phase: { sitePhotos: updatedPhotos },
        user,
        profile,
        actionName: 'Delete Photo',
        actionDetails: `Deleted site photo from phase "${currentPhase.name}"`
      })
      setSelectedPhase(updatedPhase)
    } catch (err) {
      console.error(err)
    }
  }

  // Procurement detailed status helpers
  const handleUpdateProcurementStatus = async (reqId, newStatus) => {
    const req = procurements.find(r => r.id === reqId)
    if (!req) return

    try {
      await updateProcurementStatusMutation.mutateAsync({
        id: reqId,
        status: newStatus,
        item: req.item,
        user,
        profile
      })
    } catch (err) {
      console.error(err)
    }
  }


  // Event creation & Logistics helpers
  const handleCreateEvent = async (e) => {
    e.preventDefault()
    setEventErrors(null)

    const validationResult = eventSchema.safeParse({
      name: newEvent.name,
      venue: newEvent.venue,
      date: newEvent.date,
      linkedPhaseName: newEvent.linkedPhaseName,
      targetAmount: newEvent.targetAmount,
      budget: newEvent.budget
    })

    if (!validationResult.success) {
      const formattedErrors = {}
      validationResult.error.issues.forEach(issue => {
        formattedErrors[issue.path[0]] = issue.message
      })
      setEventErrors(formattedErrors)
      return
    }

    const validatedData = validationResult.data
    const eventEntry = {
      id: `ev-${Date.now()}`,
      name: validatedData.name,
      venue: validatedData.venue,
      date: validatedData.date,
      linkedPhaseName: validatedData.linkedPhaseName,
      targetAmount: validatedData.targetAmount,
      budget: validatedData.budget,
      expenses: 0,
      income: 0,
      status: 'Active',
      logistics: [],
      committees: []
    }

    try {
      await createEventMutation.mutateAsync({
        event: eventEntry,
        user,
        profile
      })

      setNewEvent({
        name: '',
        venue: '',
        date: '',
        linkedPhaseName: phases.length > 0 ? phases[0].name : 'Roofing & Trussing',
        targetAmount: '',
        budget: ''
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddLogisticsItem = async (e, eventId) => {
    e.preventDefault()
    if (!newLogisticsItem.item || !newLogisticsItem.quantity) return

    const itemEntry = {
      id: `l-${Date.now()}`,
      item: newLogisticsItem.item,
      quantity: newLogisticsItem.quantity,
      status: newLogisticsItem.status,
      assignedCommittee: newLogisticsItem.assignedCommittee
    }

    const ev = events.find(eventItem => eventItem.id === eventId)
    if (!ev) return

    const updatedLogistics = [...(ev.logistics || []), itemEntry]
    const updatedEvent = { ...ev, logistics: updatedLogistics }

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        event: { logistics: updatedLogistics },
        user,
        profile,
        actionName: 'Add Logistics Item',
        actionDetails: `Added logistics item "${newLogisticsItem.item}" for event "${ev.name}"`
      })
      setSelectedEvent(updatedEvent)
      setNewLogisticsItem({
        item: '',
        quantity: '',
        status: 'Needed',
        assignedCommittee: 'Logistics Committee'
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateLogisticsStatus = async (eventId, itemId, newStatus) => {
    const ev = events.find(eventItem => eventItem.id === eventId)
    if (!ev) return

    const logistics = (ev.logistics || []).map(item =>
      item.id === itemId ? { ...item, status: newStatus } : item
    )
    const updatedEvent = { ...ev, logistics }

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        event: { logistics },
        user,
        profile,
        actionName: 'Update Logistics Status',
        actionDetails: `Updated logistics item status in event "${ev.name}" to "${newStatus}"`
      })
      setSelectedEvent(updatedEvent)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteLogisticsItem = async (eventId, itemId) => {
    const ev = events.find(eventItem => eventItem.id === eventId)
    if (!ev) return

    const logistics = (ev.logistics || []).filter(item => item.id !== itemId)
    const updatedEvent = { ...ev, logistics }

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        event: { logistics },
        user,
        profile,
        actionName: 'Delete Logistics Item',
        actionDetails: `Deleted logistics item from event "${ev.name}"`
      })
      setSelectedEvent(updatedEvent)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCommitteeAssignment = async (e, eventId) => {
    e.preventDefault()
    if (!newCommitteeAssignment.role) return

    const assignmentEntry = {
      id: `c-${Date.now()}`,
      name: newCommitteeAssignment.name,
      role: newCommitteeAssignment.role
    }

    const ev = events.find(eventItem => eventItem.id === eventId)
    if (!ev) return

    const updatedCommittees = [...(ev.committees || []), assignmentEntry]
    const updatedEvent = { ...ev, committees: updatedCommittees }

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        event: { committees: updatedCommittees },
        user,
        profile,
        actionName: 'Assign Committee',
        actionDetails: `Assigned "${newCommitteeAssignment.name}" to event "${ev.name}"`
      })
      setSelectedEvent(updatedEvent)
      setNewCommitteeAssignment({
        name: 'Logistics Committee',
        role: ''
      })
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveCommitteeAssignment = async (eventId, assignmentId) => {
    const ev = events.find(eventItem => eventItem.id === eventId)
    if (!ev) return

    const committees = (ev.committees || []).filter(com => com.id !== assignmentId)
    const updatedEvent = { ...ev, committees }

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        event: { committees },
        user,
        profile,
        actionName: 'Remove Committee Assignment',
        actionDetails: `Removed committee assignment from event "${ev.name}"`
      })
      setSelectedEvent(updatedEvent)
    } catch (err) {
      console.error(err)
    }
  }

  const handleTriggerBroadcastShortcut = (eventObj) => {
    setNewAnnouncement({
      title: `Update on ${eventObj.name}`,
      content: `Logistics setup and committee actions for "${eventObj.name}" are moving ahead! We are planning venue logistics (Tents: ${
        (eventObj.logistics || []).filter(i => i.status === 'Ready').length
      }/${(eventObj.logistics || []).length} prepared). Come join committees to support this fundraising event scheduled on ${eventObj.date} for the ${eventObj.linkedPhaseName}!`
    })
    setActiveTab('announcements')
  }

  // Upload Document
  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!newDoc.title) return

    const docEntry = {
      title: newDoc.title,
      category: newDoc.category,
      date: new Date().toISOString().slice(0, 10),
      url: '#',
      uploadedBy: profile?.full_name || 'Coordinator'
    }

    try {
      await uploadDocumentMutation.mutateAsync({
        document: docEntry,
        user,
        profile
      })
      setNewDoc({ title: '', category: 'plans' })
    } catch (err) {
      console.error(err)
    }
  }

  // Send Announcement
  const handleSendAnnouncement = async (e) => {
    e.preventDefault()
    if (!newAnnouncement.title || !newAnnouncement.content) return

    const announcementEntry = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      date: new Date().toISOString().slice(0, 10),
      senderName: profile?.full_name || 'Coordinator'
    }

    try {
      await createAnnouncementMutation.mutateAsync({
        announcement: announcementEntry,
        user,
        profile
      })
      setNewAnnouncement({ title: '', content: '' })
    } catch (err) {
      console.error(err)
    }
  }

  // Material request creation
  const handleCreateMaterialRequest = async (e) => {
    e.preventDefault()
    if (!newMaterialRequest.item || !newMaterialRequest.quantity) return

    const phase = phases.find(p => p.id === newMaterialRequest.phaseId)
    const reqEntry = {
      id: `PROC-${Math.floor(200 + Math.random() * 800)}`,
      item: newMaterialRequest.item,
      quantity: newMaterialRequest.quantity,
      phaseId: newMaterialRequest.phaseId,
      phaseName: phase ? phase.name : 'Unknown',
      priority: newMaterialRequest.priority,
      status: 'Pending Approval',
      date: new Date().toISOString().slice(0, 10)
    }

    try {
      await createProcurementMutation.mutateAsync({
        procurement: reqEntry,
        user,
        profile
      })
      setNewMaterialRequest({
        item: '',
        quantity: '',
        phaseId: phases.length > 0 ? phases[0].id : '',
        priority: 'Medium'
      })
    } catch (err) {
      console.error(err)
    }
  }

  const officialPhases = [
    { id: 'rc_frame', name: 'R.C. Frame', description: 'Reinforced Concrete structural frame, beams, and columns', budget: 118403000, boq_budget: 118403000, status: 'In Progress', progress: 30, contractor_name: 'Atlas Engineering Ltd', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'staircase', name: 'Stair Case and Balustrading', description: 'Access staircase construction and protective balustrading', budget: 12122000, boq_budget: 12122000, status: 'Not Started', progress: 0, contractor_name: 'Atlas Engineering Ltd', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'walling', name: 'Walling', description: 'Superstructure walling with solid concrete blocks and brickwork', budget: 68650000, boq_budget: 68650000, status: 'In Progress', progress: 50, contractor_name: 'Sanyu Builders crew', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'roofing', name: 'Roof and Rain Water Disposal', description: 'Truss fabrication, sheet roofing cover, and rain water disposal piping', budget: 86978000, boq_budget: 86978000, status: 'Not Started', progress: 0, contractor_name: 'Steel Roof Specialists Ug', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'wall_finishes', name: 'Wall Finishes', description: 'Internal and external plastering, rendering, and high-quality paint finishing', budget: 98166000, boq_budget: 98166000, status: 'Not Started', progress: 0, contractor_name: 'Sanyu Builders crew', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'floor_finishes', name: 'Floor Finishes', description: 'Cement screed floor finish, ceramic tiling, and skirting', budget: 78071000, boq_budget: 78071000, status: 'Not Started', progress: 0, contractor_name: 'Lusanja Plumbers Ltd', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'ceiling_finishes', name: 'Ceiling Finishes', description: 'Suspended ceiling plaster boards and acoustic fittings', budget: 11475000, boq_budget: 11475000, status: 'Not Started', progress: 0, contractor_name: 'Sanyu Builders crew', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'doors', name: 'Doors', description: 'Main timber double doors, steel emergency exits, and internal timber panel doors', budget: 42655000, boq_budget: 42655000, status: 'Not Started', progress: 0, contractor_name: 'Sanyu Builders crew', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'windows', name: 'Windows', description: 'Glazed aluminum window casements and steel security grills', budget: 56258000, boq_budget: 56258000, status: 'Not Started', progress: 0, contractor_name: 'Sanyu Builders crew', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'electrical', name: 'Electrical Installation', description: 'Conduiting, wiring, power distribution board, switches, and lighting fixtures', budget: 20000000, boq_budget: 20000000, status: 'Not Started', progress: 0, contractor_name: 'Spark Techs Uganda', engineer_name: 'Eng. John Baptist Lule' },
    { id: 'mechanical', name: 'Mechanical Installations', description: 'Plumbing fixtures, drainage conduits, water storage tanks, and sanitary fittings', budget: 25000000, boq_budget: 25000000, status: 'Not Started', progress: 0, contractor_name: 'Lusanja Plumbers Ltd', engineer_name: 'Eng. John Baptist Lule' }
  ]

  const sampleLineItems = [
    { phase_id: 'walling', description: '200mm thick solid concrete block wall for superstructure', unit: 'sqm', quantity: 350, rate: 110000, actual_spent: 12000000 },
    { phase_id: 'walling', description: '150mm thick block wall partitions', unit: 'sqm', quantity: 250, rate: 120600, actual_spent: 8500000 },
    { phase_id: 'doors', description: 'Double leaf timber paneled main doors (size 1800x2400mm)', unit: 'No', quantity: 10, rate: 2500000, actual_spent: 0 },
    { phase_id: 'doors', description: 'Single leaf steel security doors for emergency exits', unit: 'No', quantity: 8, rate: 2206875, actual_spent: 0 },
    { phase_id: 'roofing', description: 'Structural steel truss fabrication and hoisting', unit: 'kg', quantity: 8000, rate: 6500, actual_spent: 0 },
    { phase_id: 'roofing', description: 'Pre-painted IT5 roof sheets (gauge 28)', unit: 'sqm', quantity: 1200, rate: 25000, actual_spent: 0 },
    { phase_id: 'roofing', description: 'UPVC rain water gutters and downpipes', unit: 'm', quantity: 150, rate: 33186, actual_spent: 0 },
    { phase_id: 'windows', description: 'Powder-coated aluminum glazed windows including fittings', unit: 'sqm', quantity: 80, rate: 500000, actual_spent: 0 },
    { phase_id: 'windows', description: 'Steel window security grills welded to frame', unit: 'sqm', quantity: 80, rate: 203225, actual_spent: 0 },
    { phase_id: 'electrical', description: 'Conduits, junction boxes, and accessories concealed in concrete/walls', unit: 'Item', quantity: 1, rate: 8000000, actual_spent: 0 },
    { phase_id: 'electrical', description: 'Wiring cables, sockets, switches, light fixtures, and distribution boards', unit: 'Item', quantity: 1, rate: 12000000, actual_spent: 0 }
  ]

  const handleInitializeBOQ = async () => {
    if (!confirm("Are you sure you want to initialize the official St. Francis BOQ? This will clear existing BOQ items and reset/upsert the 11 elements in the construction_phases table.")) return
    try {
      // 1. Delete existing BOQ line items
      const { error: clearBOQError } = await supabase.from('boq_line_items').delete().neq('description', '')
      if (clearBOQError) throw clearBOQError

      // 2. Upsert the 11 official phases
      const { error: upsertPhasesError } = await supabase.from('construction_phases').upsert(officialPhases)
      if (upsertPhasesError) throw upsertPhasesError

      // 3. Insert sample line items
      const { error: insertBOQItemsError } = await supabase.from('boq_line_items').insert(sampleLineItems)
      if (insertBOQItemsError) throw insertBOQItemsError

      toast.success("Official St. Francis BOQ successfully initialized!")
      queryClient.invalidateQueries({ queryKey: ['phases'] })
      queryClient.invalidateQueries({ queryKey: ['boqLineItems'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    } catch (err) {
      console.error(err)
      toast.error(`BOQ Initialization failed: ${err.message}`)
    }
  }

  const handleCreateBOQItem = async (e, phaseId) => {
    e.preventDefault()
    if (!newBOQItem.description || !newBOQItem.quantity || !newBOQItem.rate) {
      toast.error("Please fill in description, quantity, and rate.")
      return
    }

    const qty = parseFloat(newBOQItem.quantity) || 0
    const rate = parseFloat(newBOQItem.rate) || 0
    const est = qty * rate

    const itemPayload = {
      phaseId,
      description: newBOQItem.description,
      unit: newBOQItem.unit || 'pcs',
      quantity: qty,
      rate: rate,
      estimatedAmount: est,
      actualSpent: 0
    }

    try {
      await createBOQLineItemMutation.mutateAsync({
        item: itemPayload,
        user,
        profile
      })
      setNewBOQItem({ description: '', unit: '', quantity: '', rate: '' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateBOQItemSpent = async (e) => {
    e.preventDefault()
    if (!updatingBOQItem) return
    const spentVal = parseFloat(actualSpentInput)
    if (isNaN(spentVal) || spentVal < 0) {
      toast.error("Please enter a valid actual spent amount.")
      return
    }

    try {
      await updateBOQLineItemMutation.mutateAsync({
        id: updatingBOQItem.id,
        item: {
          phaseId: updatingBOQItem.phaseId,
          actualSpent: spentVal
        },
        user,
        profile
      })
      setUpdatingBOQItem(null)
      setActualSpentInput('')
    } catch (err) {
      console.error(err)
    }
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

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 z-30 lg:relative lg:translate-x-0 lg:flex h-full flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <img src="/logo.png" className="w-10 h-10 rounded-xl object-cover shadow-md" alt="SFA Logo" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">SFA Church</h2>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Operations Manager</span>
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
              <span>Project Panel</span>
            </button>

            <button 
              onClick={() => { setActiveTab('phases'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'phases' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Hammer className="w-5 h-5" />
              <span>Phases Manager</span>
            </button>

            <button 
              onClick={() => { setActiveTab('procurements'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'procurements' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ListPlus className="w-5 h-5" />
              <span>Procurement requests</span>
            </button>

            <button 
              onClick={() => { setActiveTab('boq'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'boq' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Coins className="w-5 h-5" />
              <span>Master BOQ Tracker</span>
            </button>

            <button 
              onClick={() => { setActiveTab('events'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'events' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Events & Logistics</span>
            </button>

            <button 
              onClick={() => { setActiveTab('docs'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'docs' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <FileCode className="w-5 h-5" />
              <span>Document Center</span>
            </button>

            <button 
              onClick={() => { setActiveTab('announcements'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'announcements' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Send className="w-5 h-5" />
              <span>Send Broadcasts</span>
            </button>

            <button 
              onClick={() => { setActiveTab('payment_details'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activeTab === 'payment_details' 
                  ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-semibold' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Coins className="w-5 h-5" />
              <span>Payment Details</span>
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
          </nav>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-sky-505 flex items-center justify-center bg-sky-500 text-white font-bold text-sm">
              CO
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-none truncate">{profile?.full_name}</p>
              <span className="text-[10px] text-sky-500 font-semibold dark:text-sky-400">Chief Coordinator</span>
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

      {/* Main Panel */}
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
              {activeTab === 'events' ? 'Events & Logistics' : 
               activeTab === 'feedback' ? 'Member Feedback Inbox' : 
               activeTab === 'procurements' ? 'Procurement Request Manager' :
               activeTab === 'docs' ? 'Document Database Hub' :
               activeTab === 'boq' ? 'Master Bill of Quantities (BOQ)' :
               activeTab} Management
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
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/50 dark:border-slate-700 hidden sm:inline-block">
              Operations Center
            </span>
          </div>
        </header>

        {/* Dynamic content panels */}
        <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-8 animate-fade-in">

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

              {/* Construction status indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                <div className="glass-card rounded-2xl p-5 flex items-center space-x-4 glow-primary">
                  <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500"><Hammer className="w-5 h-5" /></div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Phases</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{phases.length} Phases</h4>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 flex items-center space-x-4 glow-primary">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><Check className="w-5 h-5" /></div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Milestones Completed</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {completedMilestonesCount} Completed
                    </h4>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 flex items-center space-x-4 glow-primary">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500"><Activity className="w-5 h-5" /></div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Active Events</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {events.filter(e => e.status === 'Active').length} Active
                    </h4>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 flex items-center space-x-4 glow-primary">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><ClipboardList className="w-5 h-5" /></div>
                  <div>
                    <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Logistics items</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {logisticsStatus.ready} / {logisticsStatus.total} Ready
                    </h4>
                  </div>
                </div>
              </div>

              {/* Site updates feed and materials need warning */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Phases grid */}
                <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Direct Progress Overview</h4>
                    <span className="text-xs text-slate-400">Quick view status</span>
                  </div>
                  
                  <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                    {phases.map(p => (
                      <div key={p.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.name}</p>
                          <p className="text-[10px] text-slate-400">Completion: {p.completionDate}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full" style={{ width: `${p.progress}%` }}></div>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{p.progress}%</span>
                          <button 
                            onClick={() => { setSelectedPhase(p); setActiveTab('phases'); }}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1.5 rounded-lg text-slate-600 dark:text-slate-300"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Logistics Assignments */}
                <div className="glass-card rounded-2xl p-6 space-y-4 text-xs">
                  <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Fundraising Logistics Planner</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Non-financial coordinator plans</span>
                  </div>
                  
                  <div className="space-y-4">
                    {events.map(ev => (
                      <div key={ev.id} className="space-y-2 border border-slate-100 dark:border-slate-800 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{ev.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            ev.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          }`}>
                            {ev.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-1.5">
                          <p>Linked Phase: <strong className="text-slate-500">{ev.linkedPhaseName}</strong></p>
                          <p>Date: <strong className="text-slate-500">{ev.date}</strong></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </>
          )}

          {/* TAB: PHASES MANAGER */}
          {activeTab === 'phases' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Phase Construction Registry</h3>
                  <p className="text-xs text-slate-400">Manage, create construction steps and set deadlines</p>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingPhase(!isCreatingPhase)
                    setSelectedPhase(null)
                  }}
                  className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-sky-500/15 flex items-center space-x-1.5 transition-all hover:opacity-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingPhase ? 'View Phase List' : 'Create New Phase'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Phases List */}
                <div className="lg:col-span-2 space-y-4 max-h-[650px] overflow-y-auto pr-2">
                  {phases.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => { setSelectedPhase(p); setIsCreatingPhase(false); }}
                      className={`glass-card rounded-2xl p-5 cursor-pointer border hover:border-sky-500 transition-all ${
                        selectedPhase?.id === p.id && !isCreatingPhase ? 'border-sky-500 ring-2 ring-sky-500/10' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-snug">{p.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          p.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' :
                          'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="font-semibold block uppercase">Engineer</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{p.engineerName}</span>
                        </div>
                        <div>
                          <span className="font-semibold block uppercase">Contractor</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate block">{p.contractorName}</span>
                        </div>
                        <div>
                          <span className="font-semibold block uppercase">Budget</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">UGX {(p.budget || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="font-semibold block uppercase">Deadline</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{p.completionDate || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-semibold block uppercase">Progress</span>
                          <span className="font-bold text-sky-500">{p.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Form column */}
                <div className="space-y-6">
                  {isCreatingPhase ? (
                    <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Create Construction Phase</h4>
                      
                      {phaseErrors && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                          {Object.entries(phaseErrors).map(([key, msg]) => (
                            <div key={key}>&bull; {msg}</div>
                          ))}
                        </div>
                      )}

                      <form onSubmit={handleCreatePhase} className="space-y-4 text-xs">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Phase Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Plastering & Painting"
                            value={newPhase.name}
                            onChange={e => setNewPhase({...newPhase, name: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Description</label>
                          <textarea 
                            rows="2"
                            required
                            placeholder="Provide details about the works in this phase..."
                            value={newPhase.description}
                            onChange={e => setNewPhase({...newPhase, description: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Budget (UGX)</label>
                            <input 
                              type="number" 
                              required
                              placeholder="e.g. 50000000"
                              value={newPhase.budget}
                              onChange={e => setNewPhase({...newPhase, budget: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Target Deadline</label>
                            <input 
                              type="date" 
                              required
                              value={newPhase.completionDate}
                              onChange={e => setNewPhase({...newPhase, completionDate: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Contractor Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contractor company or lead name"
                            value={newPhase.contractorName}
                            onChange={e => setNewPhase({...newPhase, contractorName: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Project Engineer</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Site engineer name"
                            value={newPhase.engineerName}
                            onChange={e => setNewPhase({...newPhase, engineerName: e.target.value})}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Required Materials</label>
                          <textarea 
                            rows="2"
                            required
                            placeholder="Cement, sand, aggregates, paint..."
                            value={newPhase.requiredMaterials}
                            onChange={e => setNewPhase({...newPhase, requiredMaterials: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850"
                          />
                        </div>

                        <button 
                          type="submit"
                          className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10"
                        >
                          Create New Phase
                        </button>
                      </form>
                    </div>
                  ) : selectedPhase ? (
                    <div className="space-y-6">
                      {/* Edit Phase Form */}
                      <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Update Selected Phase Details</h4>
                        <form onSubmit={handleUpdatePhase} className="space-y-4 text-xs">
                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Phase Name</label>
                            <input 
                              type="text" 
                              required 
                              value={selectedPhase.name}
                              onChange={e => setSelectedPhase({...selectedPhase, name: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Description</label>
                            <textarea 
                              rows="2"
                              required
                              value={selectedPhase.description}
                              onChange={e => setSelectedPhase({...selectedPhase, description: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Budget (UGX)</label>
                              <input 
                                type="number" 
                                required
                                value={selectedPhase.budget || ''}
                                onChange={e => setSelectedPhase({...selectedPhase, budget: parseFloat(e.target.value) || 0})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Deadline Date</label>
                              <input 
                                type="date" 
                                required
                                value={selectedPhase.completionDate || ''}
                                onChange={e => setSelectedPhase({...selectedPhase, completionDate: e.target.value})}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Status</label>
                            <select 
                              value={selectedPhase.status}
                              onChange={e => setSelectedPhase({...selectedPhase, status: e.target.value})}
                              className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                            >
                              <option value="Not Started">Not Started</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>

                          <div>
                            <div className="flex justify-between font-semibold text-slate-400 mb-1">
                              <span>Progress Percentage</span>
                              <span className="text-sky-500 font-bold">{selectedPhase.progress}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={selectedPhase.progress}
                              onChange={e => setSelectedPhase({...selectedPhase, progress: parseInt(e.target.value)})}
                              className="w-full accent-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Contractor Name</label>
                            <input 
                              type="text" 
                              required
                              value={selectedPhase.contractorName}
                              onChange={e => setSelectedPhase({...selectedPhase, contractorName: e.target.value})}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Project Engineer</label>
                            <input 
                              type="text" 
                              required
                              value={selectedPhase.engineerName}
                              onChange={e => setSelectedPhase({...selectedPhase, engineerName: e.target.value})}
                              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Required Materials</label>
                            <textarea 
                              rows="2"
                              required
                              value={selectedPhase.requiredMaterials}
                              onChange={e => setSelectedPhase({...selectedPhase, requiredMaterials: e.target.value})}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850"
                            />
                          </div>

                          <button 
                            type="submit"
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10"
                          >
                            Update Phase Details
                          </button>
                        </form>
                      </div>

                      {/* Milestones Checklist Tracker */}
                      <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Phase Milestones</h4>
                            <p className="text-[10px] text-slate-400">Track key milestones and deadlines</p>
                          </div>
                          <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-bold">
                            {selectedPhase.milestones?.filter(m => m.status === 'Completed').length || 0} / {selectedPhase.milestones?.length || 0} Done
                          </span>
                        </div>

                        {/* Milestone progress bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-sky-500 h-full transition-all duration-300"
                            style={{
                              width: `${
                                selectedPhase.milestones?.length > 0
                                  ? Math.round(
                                      (selectedPhase.milestones.filter(m => m.status === 'Completed').length / selectedPhase.milestones.length) * 100
                                    )
                                  : 0
                              }%`
                            }}
                          ></div>
                        </div>

                        {/* Milestones List */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {selectedPhase.milestones && selectedPhase.milestones.length > 0 ? (
                            selectedPhase.milestones.map(m => (
                              <div key={m.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                                <div className="flex items-start space-x-2">
                                  <input 
                                    type="checkbox"
                                    checked={m.status === 'Completed'}
                                    onChange={() => handleToggleMilestone(selectedPhase.id, m.id)}
                                    className="w-4 h-4 mt-0.5 rounded text-sky-600 border-slate-300 focus:ring-sky-500"
                                  />
                                  <div className="flex flex-col">
                                    <span className={`font-semibold text-slate-800 ${m.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                      {m.title}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium">Deadline: {m.deadline}</span>
                                  </div>
                                </div>
                                
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteMilestone(selectedPhase.id, m.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-400 italic text-center py-2">No milestones defined for this phase.</p>
                          )}
                        </div>

                        {/* Add Milestone Form */}
                        <form onSubmit={(e) => handleAddMilestone(e, selectedPhase.id)} className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="block text-[10px] text-slate-400 font-semibold">Add New Milestone</label>
                          <div className="flex space-x-2">
                            <input 
                              type="text"
                              required
                              placeholder="Milestone title..."
                              value={newMilestoneTitle}
                              onChange={e => setNewMilestoneTitle(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-[11px]"
                            />
                            <input 
                              type="date"
                              required
                              value={newMilestoneDeadline}
                              onChange={e => setNewMilestoneDeadline(e.target.value)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-[11px] w-28"
                            />
                            <button 
                              type="submit"
                              className="bg-slate-800 hover:bg-slate-900 text-white px-3 rounded-lg font-bold text-[11px] transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Site Photo Gallery */}
                      <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">Site Gallery</h4>
                        
                        {/* Existing Photos Grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {selectedPhase.sitePhotos && selectedPhase.sitePhotos.length > 0 ? (
                            selectedPhase.sitePhotos.map((photoUrl, index) => (
                              <div key={index} className="relative group rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                                <img src={photoUrl} alt="Site progress" className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => handleDeletePhoto(selectedPhase.id, photoUrl)}
                                  className="absolute top-1 right-1 bg-black/60 hover:bg-red-650 text-white p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-3 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                              <p className="text-[10px] text-slate-400">No site photos uploaded.</p>
                            </div>
                          )}
                        </div>

                        {/* Drag and Drop File Uploader Area */}
                        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold mb-1">Upload Construction Media (Drag & Drop or Click)</span>
                            <div 
                              onDragEnter={handleDrag}
                              onDragOver={handleDrag}
                              onDragLeave={handleDrag}
                              onDrop={handleDrop}
                              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                                dragActive 
                                  ? "border-sky-500 bg-sky-500/5" 
                                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/40"
                              }`}
                              onClick={() => document.getElementById("phase-photo-upload-input").click()}
                            >
                              <UploadCloud className="w-6 h-6 text-slate-400" />
                              <div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block">Click to upload or drag & drop</span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">JPG, PNG or WEBP (Max 5MB)</span>
                              </div>
                              <input 
                                id="phase-photo-upload-input"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                              />
                            </div>
                          </div>

                          <div>
                            <span className="block text-[10px] text-slate-400 font-semibold mb-1">Select from templates:</span>
                            <div className="grid grid-cols-2 gap-1">
                              {constructionPhotos.filter(photo => !(selectedPhase.sitePhotos || []).includes(photo.url)).map((photo, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={async () => {
                                    const updatedPhotos = [...(selectedPhase.sitePhotos || []), photo.url]
                                    const updatedPhase = { ...selectedPhase, sitePhotos: updatedPhotos }
                                    try {
                                      await updatePhaseMutation.mutateAsync({
                                        id: selectedPhase.id,
                                        phase: { sitePhotos: updatedPhotos },
                                        user,
                                        profile,
                                        actionName: 'Assign Photo Template',
                                        actionDetails: `Assigned template photo to phase "${selectedPhase.name}"`
                                      })
                                      setSelectedPhase(updatedPhase)
                                    } catch (err) {
                                      console.error("Failed to assign photo template:", err)
                                    }
                                  }}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 text-slate-650 dark:text-slate-400 rounded-lg text-[9px] truncate text-left cursor-pointer font-semibold"
                                >
                                  + {photo.name}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <form onSubmit={(e) => handleAddPhotoUrl(e, selectedPhase.id)} className="flex space-x-2">
                            <input 
                              type="url"
                              required
                              placeholder="Paste photo URL..."
                              value={customPhotoUrl}
                              onChange={e => setCustomPhotoUrl(e.target.value)}
                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-[11px] text-slate-800 dark:text-slate-100"
                            />
                            <button 
                              type="submit"
                              className="bg-sky-500 hover:bg-sky-600 text-white px-3 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Add URL
                            </button>
                          </form>
                        </div>
                      </div>

                      {/* Site Log Updates Feed */}
                      <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Phase Site Log Updates</h4>
                            <p className="text-[10px] text-slate-400">Post construction status reports for parish members</p>
                          </div>
                        </div>

                        {/* Add Update Form */}
                        <form onSubmit={(e) => handleAddPhaseUpdate(e, selectedPhase.id)} className="space-y-2.5">
                          <textarea 
                            rows="2"
                            required
                            placeholder="Write a site progress update..."
                            value={newPhaseUpdate}
                            onChange={e => setNewPhaseUpdate(e.target.value)}
                            className="w-full px-2.5 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs text-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="submit"
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-500/10"
                          >
                            Post Update to Site Log
                          </button>
                        </form>

                        {/* List of site updates */}
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {selectedPhase.updates && selectedPhase.updates.length > 0 ? (
                            selectedPhase.updates.map(u => (
                              <div key={u.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-xs space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                  <span>{u.author}</span>
                                  <span className="font-mono">{u.date}</span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 leading-snug">{u.content}</p>
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleDeletePhaseUpdate(selectedPhase.id, u.id)}
                                    className="text-[9px] text-slate-400 hover:text-red-500 font-semibold transition-colors"
                                  >
                                    Remove Log
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-slate-450 italic text-center py-2">No site logs posted for this phase.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl p-6 text-center py-12 border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-400">Select a construction phase from the list or click "+ Create New Phase" to begin.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB: PROCUREMENTS */}
          {activeTab === 'procurements' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Request Construction Materials</h4>
                <p className="text-xs text-slate-400">Submit new material needs which will show in the procurement log</p>
                
                <form onSubmit={handleCreateMaterialRequest} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Material Item Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 100 bags of Portland cement"
                      value={newMaterialRequest.item}
                      onChange={e => setNewMaterialRequest({...newMaterialRequest, item: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Quantity / Size</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 100 bags, 2 tonnes..."
                      value={newMaterialRequest.quantity}
                      onChange={e => setNewMaterialRequest({...newMaterialRequest, quantity: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Associated Construction Phase</label>
                    <select
                      value={newMaterialRequest.phaseId}
                      onChange={e => setNewMaterialRequest({...newMaterialRequest, phaseId: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    >
                      {phases.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                    <select
                      value={newMaterialRequest.priority}
                      onChange={e => setNewMaterialRequest({...newMaterialRequest, priority: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    >
                      <option value="Low">Low Priority</option>
                      <option value="Medium">Medium Priority</option>
                      <option value="High">High Priority</option>
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Procurement Request</span>
                  </button>
                </form>
              </div>

              {/* Table list */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Material Procurement & Deliveries Log</h4>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">ID</th>
                        <th className="pb-3">Item Requested</th>
                        <th className="pb-3">Quantity</th>
                        <th className="pb-3">Phase Link</th>
                        <th className="pb-3">Priority</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {procurements.map((req) => (
                        <tr key={req.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-3.5 font-mono text-slate-400">{req.id}</td>
                          <td className="py-3.5 font-semibold">{req.item}</td>
                          <td className="py-3.5">{req.quantity}</td>
                          <td className="py-3.5">{req.phaseName}</td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              req.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                              req.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-slate-200 text-slate-500 dark:bg-slate-800'
                            }`}>
                              {req.priority}
                            </span>
                          </td>
                          <td className="py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              req.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-amber-500/10 text-amber-500 animate-pulse'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <select
                               value={req.status}
                               onChange={(e) => handleUpdateProcurementStatus(req.id, e.target.value)}
                               className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                             >
                               <option value="Pending Approval">Pending Approval</option>
                               <option value="Approved">Approved</option>
                               <option value="Dispatched">Dispatched</option>
                               <option value="Delivered">Delivered</option>
                             </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: MASTER BOQ TRACKER */}
          {activeTab === 'boq' && (
            <div className="space-y-6 animate-fade-in text-xs">
              
              {/* Seeding & Summary Banner */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-sky-500" />
                    <span>Official St. Francis Lusanja BOQ Controller</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Manage the official 750M UGX Bill of Quantities. Add material details, track physical quantities, and log actual expenditures.
                  </p>
                </div>
                <button
                  onClick={handleInitializeBOQ}
                  className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10 flex items-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Hammer className="w-4 h-4" />
                  <span>Initialize Official St. Francis BOQ</span>
                </button>
              </div>

              {/* Overarching Project Metrics Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold text-[10px]">Grand Total Target</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white mt-1.5 block">750,825,000 UGX</span>
                </div>
                 <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold text-[10px]">Phase Budgets Sum</span>
                  <span className="text-lg font-black text-indigo-500 mt-1.5 block">
                    {formatUGX(phaseBudgetsSum)}
                  </span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold text-[10px]">VAT (18% Overarching)</span>
                  <span className="text-lg font-black text-amber-500 mt-1.5 block">114,533,000 UGX</span>
                </div>
                <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 uppercase tracking-wider block font-semibold text-[10px]">Contingency (3% Overarching)</span>
                  <span className="text-lg font-black text-rose-500 mt-1.5 block">18,532,000 UGX</span>
                </div>
              </div>

              {/* Master BOQ Table */}
              <div className="glass-card rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Quantity Surveyors Master Ledger</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] pb-3">
                        <th className="pb-3 w-1/4">Work Element / Phase</th>
                        <th className="pb-3">BOQ Budget Target</th>
                        <th className="pb-3">Actual Outflow Spent</th>
                        <th className="pb-3">Variance</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {phases.map((p) => {
                        const { phaseItems, totalSpent, budget, variance } = boqMetrics[p.id] || { 
                          phaseItems: [], 
                          totalSpent: 0, 
                          budget: p.boqBudget || p.boq_budget || p.budget || 0, 
                          variance: p.boqBudget || p.boq_budget || p.budget || 0 
                        }
                        const isExpanded = expandedBOQPhaseId === p.id

                        return (
                          <Fragment key={p.id}>
                            <tr className="text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850/45 transition-colors font-medium border-b border-slate-100 dark:border-slate-800">
                              <td className="py-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                              <td className="py-4 font-mono font-semibold">{formatUGX(budget)}</td>
                              <td className="py-4 font-mono font-semibold text-rose-500">{formatUGX(totalSpent)}</td>
                              <td className={`py-4 font-mono font-bold ${variance < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {formatUGX(variance)}
                              </td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                                  p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                  p.status === 'In Progress' ? 'bg-indigo-500/10 text-indigo-500' :
                                  'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => setExpandedBOQPhaseId(isExpanded ? null : p.id)}
                                  className="text-sky-500 hover:text-sky-600 transition-colors p-1 flex items-center justify-end gap-1 font-bold ml-auto"
                                >
                                  <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expandable Line Items Block */}
                            {isExpanded && (
                              <tr>
                                <td colSpan="6" className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border-t border-slate-150 dark:border-slate-850">
                                  <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                      <h5 className="font-bold text-slate-800 dark:text-slate-200">
                                        Material Items for {p.name}
                                      </h5>
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        {phaseItems.length} items logged
                                      </span>
                                    </div>

                                    {/* Line Items Table */}
                                    <table className="w-full text-[11px] border-collapse bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                      <thead>
                                        <tr className="bg-slate-100 dark:bg-slate-850 text-slate-450 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200 dark:border-slate-800">
                                          <th className="p-3">Description</th>
                                          <th className="p-3">Unit</th>
                                          <th className="p-3">Quantity</th>
                                          <th className="p-3">Est. Rate</th>
                                          <th className="p-3">Estimated Total</th>
                                          <th className="p-3">Actual Outflow</th>
                                          <th className="p-3 text-right">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {phaseItems.map(item => (
                                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-855 text-slate-700 dark:text-slate-300">
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{item.description}</td>
                                            <td className="p-3">{item.unit}</td>
                                            <td className="p-3">{item.quantity}</td>
                                            <td className="p-3 font-mono">{formatUGX(item.rate)}</td>
                                            <td className="p-3 font-mono font-bold">{formatUGX(item.estimatedAmount || 0)}</td>
                                            <td className="p-3 font-mono font-bold text-rose-500">{formatUGX(item.actualSpent || 0)}</td>
                                            <td className="p-3 text-right">
                                              <button
                                                onClick={() => {
                                                  setUpdatingBOQItem(item)
                                                  setActualSpentInput(item.actualSpent ? String(item.actualSpent) : '')
                                                }}
                                                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded transition-colors text-[10px]"
                                              >
                                                Update Spent
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                        {phaseItems.length === 0 && (
                                          <tr>
                                            <td colSpan="7" className="p-6 text-center text-slate-400 italic">
                                              No materials listed. Add one below to start tracking.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>

                                    {/* Add Line Item form */}
                                    <form
                                      onSubmit={(e) => handleCreateBOQItem(e, p.id)}
                                      className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800"
                                    >
                                      <div className="sm:col-span-2">
                                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Material Description</label>
                                        <input
                                          type="text"
                                          required
                                          placeholder="e.g. 50 bags of Portland Cement Grade 42.5N"
                                          value={newBOQItem.description}
                                          onChange={e => setNewBOQItem({...newBOQItem, description: e.target.value})}
                                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Unit</label>
                                        <input
                                          type="text"
                                          required
                                          placeholder="e.g. bags, tons, sqm"
                                          value={newBOQItem.unit}
                                          onChange={e => setNewBOQItem({...newBOQItem, unit: e.target.value})}
                                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Qty</label>
                                        <input
                                          type="number"
                                          required
                                          placeholder="e.g. 50"
                                          value={newBOQItem.quantity}
                                          onChange={e => setNewBOQItem({...newBOQItem, quantity: e.target.value})}
                                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Est. Rate (UGX)</label>
                                        <input
                                          type="number"
                                          required
                                          placeholder="e.g. 35000"
                                          value={newBOQItem.rate}
                                          onChange={e => setNewBOQItem({...newBOQItem, rate: e.target.value})}
                                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                                        />
                                      </div>
                                      <div className="sm:col-span-5 flex justify-end">
                                        <button
                                          type="submit"
                                          className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-sky-500/10 cursor-pointer"
                                        >
                                          + Add Material Line Item
                                        </button>
                                      </div>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Update Actual Spent Dialog */}
              {updatingBOQItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl relative">
                    <button
                      onClick={() => setUpdatingBOQItem(null)}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <h4 className="text-sm font-bold mb-2">Update Material Actual Spent</h4>
                    <p className="text-[11px] text-slate-450 dark:text-slate-500 mb-4">
                      Updating: <strong>{updatingBOQItem.description}</strong> (Estimated Rate: {formatUGX(updatingBOQItem.rate)})
                    </p>

                    <form onSubmit={handleUpdateBOQItemSpent} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-450 font-semibold mb-1 uppercase tracking-wider">
                          Actual Spent Amount (UGX)
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 15000000"
                          value={actualSpentInput}
                          onChange={e => setActualSpentInput(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs text-slate-900 dark:text-slate-100 font-medium"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setUpdatingBOQItem(null)}
                          className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-500/10 cursor-pointer"
                        >
                          Update Outflow
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: EVENTS & LOGISTICS */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Tab Header Banner */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-500" />
                    <span>Fundraising Events &amp; Logistics Planner</span>
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Design campaigns, assign volunteer committees, and coordinate non-financial event logistics.
                  </p>
                </div>
                {selectedEvent && (
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-305 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
                  >
                    <span>&larr; Back to Events Grid</span>
                  </button>
                )}
              </div>

              {!selectedEvent ? (
                /* GRID OF EVENTS & CREATE FORM */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Events Grid/List */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 text-slate-400 dark:text-slate-500">Active &amp; Closed Events</h4>
                      <span className="text-[10px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded-full">
                        {events.length} Total Campaigns
                      </span>
                    </div>

                    {events.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((ev) => {
                          const readyLogistics = ev.logistics?.filter(l => l.status === 'Ready').length || 0;
                          const totalLogistics = ev.logistics?.length || 0;
                          return (
                            <div 
                              key={ev.id}
                              className="glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-500 transition-all flex flex-col justify-between hover:shadow-md"
                            >
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    ev.status === 'Active' 
                                      ? 'bg-emerald-505 bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                  }`}>
                                    {ev.status}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono">{ev.date}</span>
                                </div>

                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">{ev.name}</h4>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Venue: <strong className="text-slate-600 dark:text-slate-400">{ev.venue}</strong></p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 font-semibold">
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Goal (UGX)</span>
                                    <span className="text-sky-600 dark:text-sky-400 font-bold">{formatUGX(ev.targetAmount)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Phase Linked</span>
                                    <span className="text-slate-700 dark:text-slate-300 truncate block">{ev.linkedPhaseName}</span>
                                  </div>
                                </div>

                                {/* Logistics progress mini-bar */}
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] text-slate-400">
                                    <span>Logistics Setup</span>
                                    <span>{readyLogistics} / {totalLogistics} Ready</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-sky-500 h-full transition-all" 
                                      style={{ width: `${totalLogistics > 0 ? (readyLogistics / totalLogistics) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => setSelectedEvent(ev)}
                                className="w-full mt-4 bg-slate-850 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-750 text-white dark:text-slate-200 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm"
                              >
                                Manage Logistics &amp; Committees
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No fundraising events scheduled. Create one to get started.</p>
                      </div>
                    )}
                  </div>

                  {/* Create Event Form */}
                  <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">Organize New Event</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Define targets and phases for building fundraising campaigns</p>
                    </div>

                    {eventErrors && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-[10px] font-semibold space-y-1">
                        {Object.entries(eventErrors).map(([key, msg]) => (
                          <div key={key}>&bull; {msg}</div>
                        ))}
                      </div>
                    )}

                    <form onSubmit={handleCreateEvent} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Event Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Building Fund Sunday"
                          value={newEvent.name}
                          onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Venue Location</label>
                        <input
                          type="text"
                          placeholder="e.g. Church Gardens"
                          value={newEvent.venue}
                          onChange={e => setNewEvent({...newEvent, venue: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Target Date</label>
                          <input
                            type="date"
                            required
                            value={newEvent.date}
                            onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-150 font-mono font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Linked Phase</label>
                          <select
                            value={newEvent.linkedPhaseName}
                            onChange={e => setNewEvent({...newEvent, linkedPhaseName: e.target.value})}
                            className="w-full px-3 py-2.5 bg-slate-105 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 font-semibold"
                          >
                            {phases.map(p => (
                              <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Goal ($ units)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold font-mono">$</span>
                            <input
                              type="number"
                              required
                              placeholder="e.g. 5000"
                              value={newEvent.targetAmount}
                              onChange={e => setNewEvent({...newEvent, targetAmount: e.target.value})}
                              className="w-full pl-6 pr-3 py-2.5 bg-slate-105 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 font-medium"
                            />
                          </div>
                          {newEvent.targetAmount && (
                            <span className="text-[10px] text-sky-500 font-semibold block mt-1">
                              ={formatUGX(newEvent.targetAmount)}
                            </span>
                          )}
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">Budget ($ units)</label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2.5 text-slate-400 font-bold font-mono">$</span>
                            <input
                              type="number"
                              placeholder="e.g. 500"
                              value={newEvent.budget}
                              onChange={e => setNewEvent({...newEvent, budget: e.target.value})}
                              className="w-full pl-6 pr-3 py-2.5 bg-slate-105 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100 font-medium"
                            />
                          </div>
                          {newEvent.budget && (
                            <span className="text-[10px] text-sky-500 font-semibold block mt-1">
                              ={formatUGX(newEvent.budget)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10 flex items-center justify-center space-x-2 mt-4 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Launch Fundraising Campaign</span>
                      </button>
                    </form>
                  </div>

                </div>
              ) : (
                /* SELECTED EVENT LOGISTICS & COMMITTEES DETAIL VIEW */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-800 dark:text-slate-200">
                  
                  {/* Left columns - Logistics & Committees */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Event summary details */}
                    <div className="glass-card rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedEvent.name}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-404 text-slate-400 font-semibold">
                          <span>Venue: <strong>{selectedEvent.venue}</strong></span>
                          <span>&bull;</span>
                          <span>Date: <strong>{selectedEvent.date}</strong></span>
                          <span>&bull;</span>
                          <span>Linked Phase: <strong>{selectedEvent.linkedPhaseName}</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Financial Goal</span>
                        <strong className="text-sky-500 text-sm font-extrabold">{formatUGX(selectedEvent.targetAmount)}</strong>
                      </div>
                    </div>

                    {/* Logistics Planner Card */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Logistics Checklist</h4>
                        <span className="text-[10px] bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 px-2.5 py-0.5 rounded-full font-bold">
                          {(selectedEvent.logistics || []).length} items
                        </span>
                      </div>

                      {/* Add Logistics Item Form */}
                      <form onSubmit={(e) => handleAddLogisticsItem(e, selectedEvent.id)} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Item Needed</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Tent setup (500 capacity)"
                            value={newLogisticsItem.item}
                            onChange={e => setNewLogisticsItem({...newLogisticsItem, item: e.target.value})}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Quantity</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 2 pieces"
                            value={newLogisticsItem.quantity}
                            onChange={e => setNewLogisticsItem({...newLogisticsItem, quantity: e.target.value})}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-[11px] py-2.5 rounded-lg transition-colors cursor-pointer border-0"
                          >
                            + Add Item
                          </button>
                        </div>
                      </form>

                      {/* Logistics list */}
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {selectedEvent.logistics && selectedEvent.logistics.length > 0 ? (
                          selectedEvent.logistics.map((item) => (
                            <div key={item.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl flex justify-between items-center gap-2">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-850 dark:text-slate-200 text-xs block">{item.item}</span>
                                <span className="text-[10px] text-slate-400 block font-semibold">Qty: {item.quantity} &bull; Team: {item.assignedCommittee}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <select
                                  value={item.status}
                                  onChange={(e) => handleUpdateLogisticsStatus(selectedEvent.id, item.id, e.target.value)}
                                  className={`border rounded px-2 py-0.5 text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                                    item.status === 'Ready' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    item.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                                    'bg-slate-50 text-slate-505 border-slate-200'
                                  }`}
                                >
                                  <option value="Needed">Needed</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Ready">Ready</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLogisticsItem(selectedEvent.id, item.id)}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer border-0 bg-transparent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-400 italic text-center py-4">No logistics items planned for this campaign.</p>
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Right column - Committees and Broadcasting */}
                  <div className="space-y-6">
                    
                    {/* Committee Assignments Planner */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800 space-y-4">
                      <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Volunteer Committees</h4>
                        <p className="text-[10px] text-slate-400">Delegate tasks and roles to specific church committees</p>
                      </div>

                      {/* Add Assignment form */}
                      <form onSubmit={(e) => handleAddCommitteeAssignment(e, selectedEvent.id)} className="space-y-2.5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Select Committee</label>
                          <select
                            value={newCommitteeAssignment.name}
                            onChange={e => setNewCommitteeAssignment({...newCommitteeAssignment, name: e.target.value})}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
                          >
                            <option value="Logistics Committee">Logistics Committee</option>
                            <option value="Finance Committee">Finance Committee</option>
                            <option value="Catering Committee">Catering Committee</option>
                            <option value="Hospitality Committee">Hospitality Committee</option>
                            <option value="Security Committee">Security Committee</option>
                            <option value="Youth Committee">Youth Committee</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Task / Assignment Role</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Setup sound systems &amp; tent layout"
                            value={newCommitteeAssignment.role}
                            onChange={e => setNewCommitteeAssignment({...newCommitteeAssignment, role: e.target.value})}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-[11px] text-slate-805 dark:text-slate-205 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-slate-850 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-[10px] py-2.5 rounded-lg transition-colors cursor-pointer border-0"
                        >
                          Assign Committee
                        </button>
                      </form>

                      {/* Committee Assignments List */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedEvent.committees && selectedEvent.committees.length > 0 ? (
                          selectedEvent.committees.map((com) => (
                            <div key={com.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl flex justify-between items-start gap-2">
                              <div className="space-y-1 leading-snug">
                                <span className="font-extrabold text-slate-900 dark:text-white text-xs block">{com.name}</span>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">Role: {com.role}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCommitteeAssignment(selectedEvent.id, com.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer border-0 bg-transparent"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-slate-400 italic text-center py-2">No committees assigned yet.</p>
                        )}
                      </div>

                    </div>

                    {/* Broadcast Notification Panel shortcut */}
                    <div className="glass-card rounded-2xl p-6 border border-slate-200/60 dark:border-slate-800 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Bell className="w-4.5 h-4.5 text-sky-500" />
                          <span>Mobilize Members</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-normal mt-0.5">
                          Generate an announcement template for this event automatically and broadcast it to all parish members.
                        </p>
                      </div>

                      <button
                        onClick={() => handleTriggerBroadcastShortcut(selectedEvent)}
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] py-2.5 rounded-xl transition-all shadow-sm shadow-sky-500/10 flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Draft Mobilization Broadcast</span>
                      </button>
                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB: DOC CENTER */}
          {activeTab === 'docs' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upload Official Architectural / Engineering Document</h4>
                
                <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Document Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Ground Floor Electrical Wiring Layout"
                      value={newDoc.title}
                      onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Document Category</label>
                    <select
                      value={newDoc.category}
                      onChange={e => setNewDoc({...newDoc, category: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    >
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload & File Document</span>
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Construction Blueprint & Minutes Repository</h4>
                
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-center bg-white dark:bg-slate-950 text-xs">
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-500 flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h5 className="font-bold text-slate-800 dark:text-slate-200">{doc.title}</h5>
                          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1">
                            <span className="uppercase font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                              {categoryLabels[doc.category] || doc.category}
                            </span>
                            <span className="self-center">&bull;</span>
                            <span className="self-center">Uploaded by: {doc.uploadedBy}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3.5">
                        <span className="text-[10px] text-slate-400 font-mono">{doc.date}</span>
                        <button
                          onClick={() => {
                            if (!doc.url || doc.url === '#') {
                              toast.success(`Simulating secure file retrieval: "${doc.title}"`)
                            } else {
                              setPreviewDoc(doc)
                            }
                          }}
                          className="text-sky-500 hover:text-sky-600 font-bold bg-transparent border-0 cursor-pointer text-xs"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Publish General Announcement</h4>
                <p className="text-xs text-slate-400">Broadcasting will notify all church members instantly</p>
                
                <form onSubmit={handleSendAnnouncement} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Announcement Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Walling Phase Completed!"
                      value={newAnnouncement.title}
                      onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Broadcast message content</label>
                    <textarea 
                      rows="4"
                      required
                      placeholder="Write your construction progress update or fundraising notifications here..."
                      value={newAnnouncement.content}
                      onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold transition-all shadow-md shadow-sky-500/10 flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Broadcast Notification</span>
                  </button>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Sent Announcement Broadcast History</h4>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950/60 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <h5 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                          <Bell className="w-4 h-4 text-sky-500" />
                          <span>{ann.title}</span>
                        </h5>
                        <span className="text-[10px] text-slate-400 font-mono">{ann.date}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{ann.content}</p>
                      <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        Sender: <strong className="text-slate-500">{ann.senderName}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: FEEDBACK INBOX */}
          {activeTab === 'feedback' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              
              {/* Left/Middle Column: List of Feedback */}
              <div className="lg:col-span-2 space-y-4">
                <div className="glass-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Member Questions & Support Requests</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Respond to congregation feedback and resolve project inquiries.</p>
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
                              ? 'border-amber-200 dark:border-amber-900 bg-amber-50/10 dark:bg-amber-950/10 hover:border-amber-400 cursor-pointer' 
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20'
                          } ${selectedFeedback?.id === f.id ? 'ring-2 ring-sky-500' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 text-xs block">{f.subject}</strong>
                              <span className="text-[10px] text-slate-400 mt-0.5 block">From: {f.memberName || "Parish Member"} • {f.created_at}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              f.status === 'Replied'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {f.status}
                            </span>
                          </div>

                          <p className="text-slate-705 dark:text-slate-350 mt-2.5 leading-relaxed font-semibold">
                            {f.message}
                          </p>
                          {f.status === 'Replied' && f.reply_message && (
                            <div className="mt-3.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                              <span className="text-[9px] uppercase font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                Official Reply (by: {profiles[f.replied_by]?.full_name || (f.replied_by === 'coordinator-uid' ? 'Eng. John Baptist Lule' : 'Staff')})
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
                  <div className="glass-card rounded-2xl p-6 border border-sky-500/30 bg-sky-500/5 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Compose Response</h4>
                      <button 
                        onClick={() => setSelectedFeedback(null)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Original Question</span>
                      <strong className="block text-slate-800 dark:text-slate-205 mt-1 font-bold">{selectedFeedback.subject}</strong>
                      <p className="text-slate-600 dark:text-slate-400 mt-1.5 italic font-medium">"{selectedFeedback.message}"</p>
                    </div>

                    <form 
                      onSubmit={async (e) => {
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

                        try {
                          await replyFeedbackMutation.mutateAsync({
                            id: selectedFeedback.id,
                            replyMessage: validatedData.replyMessage,
                            repliedBy: profile.id,
                            user,
                            profile
                          })
                          setSelectedFeedback(null)
                          setReplyMessage('')
                        } catch (err) {
                          console.error(err)
                        }
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
                          className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-200 ${
                            replyErrors?.replyMessage ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-800'
                          }`}
                        />
                        {replyErrors?.replyMessage && (
                          <span className="text-rose-500 text-[10px] block mt-1 font-semibold">{replyErrors.replyMessage}</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-sky-500/10 flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                      >
                        <Check className="w-4 h-4" />
                        <span>Send Response</span>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="h-48 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 italic">
                    Select a pending feedback card from the list to compose a reply.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB: PAYMENT DETAILS MANAGEMENT */}
          {activeTab === 'payment_details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs text-slate-800 dark:text-slate-200">
              
              {/* Add/Edit Payment Details Form (1/3 width) */}
              <div className="glass-card rounded-2xl p-6 h-fit space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-indigo-500" />
                    <span>{editingPaymentDetail ? 'Edit Payment Method' : 'Add Payment Method'}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {editingPaymentDetail ? 'Modify payment channel settings' : 'Configure payment options for congregation members.'}
                  </p>
                </div>
                
                <form onSubmit={handlePaymentSubmit} className="space-y-4 font-semibold">
                  {paymentErrors && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl space-y-1">
                      {Object.entries(paymentErrors).map(([key, msg]) => (
                        <div key={key}>&bull; {msg}</div>
                      ))}
                    </div>
                  )}

                  {/* Method Type Select */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Method Type</label>
                    <select 
                      value={paymentMethodType}
                      onChange={(e) => setPaymentMethodType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-105 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Provider Name */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Provider / Bank Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. MTN Mobile Money, Centenary Bank"
                      value={providerName}
                      onChange={(e) => setProviderName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-105 bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Account Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. SFA Church Lusanja Construction Fund"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-105 bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Account Number */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Account / Phone Number</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. +256772123456 or 0102030405"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-105 bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-805 dark:text-slate-100"
                    />
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[10px]">Instructions</label>
                    <textarea 
                      placeholder="Include payment reason, code or routing info..."
                      value={paymentInstructions}
                      onChange={(e) => setPaymentInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-105 bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-100 h-20"
                    />
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Active Channel</span>
                    <button
                      type="button"
                      onClick={() => setPaymentIsActive(!paymentIsActive)}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        paymentIsActive ? 'bg-indigo-650 font-bold' : 'bg-slate-305 dark:bg-slate-850'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          paymentIsActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      type="submit"
                      disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                      className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-indigo-650 hover:from-primary-500 hover:to-indigo-550 text-white rounded-xl font-bold shadow-md shadow-primary-500/15 transition-all flex items-center justify-center space-x-1.5 cursor-pointer border-0"
                    >
                      <span>{editingPaymentDetail ? 'Update Details' : 'Add Payment Details'}</span>
                    </button>
                    {editingPaymentDetail && (
                      <button
                        type="button"
                        onClick={cancelEditingPayment}
                        className="px-4 py-2.5 bg-slate-105 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-205 dark:hover:bg-slate-700 rounded-xl font-bold transition-all cursor-pointer border-0"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Payment Details List (2/3 width) */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-bold">Active Payment Channels</h4>
                  <p className="text-xs text-slate-400 mt-1">Configure Mobile Money or Bank details for congregation members to reference</p>
                </div>

                {paymentDetailsLoading ? (
                  <div className="text-center py-12 text-xs text-slate-405 italic">Loading channels...</div>
                ) : paymentDetails.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl italic text-xs text-slate-400">
                    No payment accounts defined yet. Add MTNs/Airtels or Banks above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-205 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                          <th className="pb-3">Method Type</th>
                          <th className="pb-3">Provider</th>
                          <th className="pb-3">Account Name</th>
                          <th className="pb-3">Account Number</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {paymentDetails.map((channel) => (
                          <tr key={channel.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                channel.methodType === 'Mobile Money' 
                                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                                  : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400'
                              }`}>
                                {channel.methodType}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-slate-800 dark:text-slate-200">{channel.providerName}</td>
                            <td className="py-4">{channel.accountName}</td>
                            <td className="py-4 font-mono font-bold text-slate-800 dark:text-slate-200">{channel.accountNumber}</td>
                            <td className="py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${channel.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-400/10 text-slate-500'}`}>
                                {channel.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-4 text-right space-x-2">
                              <button
                                onClick={() => startEditPayment(channel)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-202 dark:hover:bg-slate-700 font-bold transition-all border-0 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePayment(channel)}
                                className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 rounded font-bold transition-all border-0 cursor-pointer"
                              >
                                Delete
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

        </div>
      </main>

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

    </div>
  )
}