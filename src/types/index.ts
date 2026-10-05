export interface Profile {
  id: string
  fullName: string
  email: string
  role: 'member' | 'admin' | 'treasurer' | 'coordinator'
  phone?: string
  createdAt?: string
}

export type ContributionStatus = 'Pending' | 'Approved' | 'Rejected'
export type PaymentMethod = 'Mobile Money' | 'Bank Transfer' | 'Cash'
export type PurposeType = 'phase' | 'event'

export interface Contribution {
  id: string
  userId: string
  userName?: string
  amount: number
  purposeType: PurposeType
  purposeName: string
  method: PaymentMethod
  reference: string
  status: ContributionStatus
  proofUrl?: string
  rejectionReason?: string
  date?: string
  createdAt?: string
}

export type ExpenseCategory =
  | 'Contractor Payout'
  | 'Materials Purchase'
  | 'Labour Costs'
  | 'Logistics & Events'
  | 'Other'

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected'

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  phaseId: string
  phaseName?: string
  status: ExpenseStatus
  rejectionReason?: string
  createdAt?: string
}

export type PhaseStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'On Hold'

export interface ConstructionPhase {
  id: string
  name: string
  description?: string
  budget: number
  currentRaised?: number
  completionDate?: string
  contractorName?: string
  contractorEmail?: string
  engineerName?: string
  requiredMaterials?: string
  status?: PhaseStatus
  createdAt?: string
}

export type PledgeStatus = 'Active' | 'Fulfilled' | 'Cancelled'

export interface Pledge {
  id: string
  userId: string
  userName?: string
  amount: number
  fulfilledAmount?: number
  purpose: string
  targetDate: string
  status: PledgeStatus
  createdAt?: string
}

export type ProcurementStatus = 'Requested' | 'Approved' | 'Procured' | 'Delivered' | 'Rejected'

export interface Procurement {
  id: string
  itemName: string
  quantity: number
  unitPrice?: number
  estimatedCost: number
  phaseId: string
  phaseName?: string
  requestedBy?: string
  status: ProcurementStatus
  notes?: string
  createdAt?: string
}

export interface MemberFeedback {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  admin_response?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action_type: string
  description: string
  created_at: string
}
