import { z } from 'zod'

// ====================================================================
// XSS INPUT SANITIZATION UTILITY
// ====================================================================
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return text
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Base string schemas to allow chaining before sanitization
const baseString = z.string().min(1, 'Field cannot be empty')
const baseOptionalString = z.string().optional()

const sanitizedString = baseString.transform((val) => sanitizeText(val.trim()))
const optionalSanitizedString = baseOptionalString.transform((val) => val ? sanitizeText(val.trim()) : '')

// ====================================================================
// INPUT VALIDATION SCHEMAS
// ====================================================================

// Positive Integer Preprocessor
const positiveInteger = z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? undefined : Number(val)),
  z.number({ invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number (integer)')
    .positive('Amount must be greater than zero')
)

// 1. Login Schema
export const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email address or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

// 1b. Signup Schema (Member Registration)
// Phone regex: optional leading + then 7–15 digits (E.164 compatible)
const phoneRegex = /^\+?[0-9]{7,15}$/
export const signupSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  email: z.string()
    .email('Please enter a valid email address'),
  phone: z.string()
    .optional()
    .refine((val) => !val || val.trim() === '' || phoneRegex.test(val.replace(/\s/g, '')),
      { message: 'Phone must be 7–15 digits with an optional leading + (e.g. +256700123456)' })
    .transform((val) => {
      if (!val || val.trim() === '') return ''
      // Strip all whitespace/non-numeric except leading +
      const cleaned = val.replace(/\s/g, '')
      return cleaned
    }),
  password: z.string()
    .min(6, 'Password must be at least 6 characters'),
  role: z.enum(['member', 'admin', 'treasurer', 'coordinator'], {
    errorMap: () => ({ message: 'Role must be one of: member, admin, treasurer, coordinator' })
  }).default('member')
})


// 2. Contribution / Payment Reference Submission
export const contributionSchema = z.object({
  amount: positiveInteger,
  purposeType: z.enum(['phase', 'event']),
  purposeName: sanitizedString,
  method: z.enum(['Mobile Money', 'Bank Transfer', 'Cash']),
  reference: z.string()
    .min(3, 'Reference code must be at least 3 characters')
    .max(50, 'Reference code must not exceed 50 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Reference code must contain only alphanumeric characters and dashes')
    .transform((val) => val.trim().toUpperCase())
})

// 3. Outflow / Expense Submission
export const expenseSchema = z.object({
  description: baseString.max(250, 'Description cannot exceed 250 characters').transform((val) => sanitizeText(val.trim())),
  amount: positiveInteger,
  category: z.enum(['Contractor Payout', 'Materials Purchase', 'Labour Costs', 'Logistics & Events', 'Other']),
  phaseId: z.string().min(1, 'Please select a phase')
})

// 4. Member Feedback & Voice of Congregation
export const feedbackSchema = z.object({
  subject: z.string()
    .min(3, 'Subject must be at least 3 characters')
    .max(100, 'Subject cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message cannot exceed 1000 characters')
    .transform((val) => sanitizeText(val.trim()))
})

// 5. Feedback Reply Message (Staff Response)
export const feedbackReplySchema = z.object({
  replyMessage: z.string()
    .min(5, 'Reply message must be at least 5 characters')
    .max(1000, 'Reply message cannot exceed 1000 characters')
    .transform((val) => sanitizeText(val.trim()))
})

// 6. Pledge Creation
export const pledgeSchema = z.object({
  amount: positiveInteger,
  purpose: sanitizedString,
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)')
})

// 7. Phase Creation
export const phaseSchema = z.object({
  name: baseString.max(100, 'Phase name cannot exceed 100 characters').transform((val) => sanitizeText(val.trim())),
  description: optionalSanitizedString,
  budget: positiveInteger,
  completionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
  contractorName: z.string().max(100, 'Contractor name cannot exceed 100 characters').optional().transform((val) => val ? sanitizeText(val.trim()) : ''),
  contractorEmail: z.string().email('Invalid email').or(z.literal('')),
  engineerName: z.string().max(100, 'Engineer name cannot exceed 100 characters').optional().transform((val) => val ? sanitizeText(val.trim()) : ''),
  requiredMaterials: optionalSanitizedString
})

// 8. Event Creation
export const eventSchema = z.object({
  name: baseString.max(100, 'Event name cannot exceed 100 characters').transform((val) => sanitizeText(val.trim())),
  venue: z.string().max(100, 'Venue name cannot exceed 100 characters').optional().transform((val) => val ? sanitizeText(val.trim()) : ''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
  linkedPhaseName: sanitizedString,
  targetAmount: positiveInteger,
  budget: positiveInteger
})

// ====================================================================
// FILE UPLOAD VALIDATION UTILITY
// ====================================================================
export const validateUploadFile = (file) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  const maxSizeBytes = 5 * 1024 * 1024 // 5MB
  
  if (!file) return { success: false, error: 'No file selected' }
  if (!allowedMimes.includes(file.type)) {
    return { success: false, error: 'Invalid file format. Only JPG, PNG, WEBP, and PDF are allowed.' }
  }
  if (file.size > maxSizeBytes) {
    return { success: false, error: 'File size exceeds the 5MB security limit.' }
  }
  return { success: true }
}

// 9. Committee Member Validation Schema
export const committeeMemberSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Full name cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  roleTitle: z.string()
    .min(1, 'Role/Title is required')
    .max(100, 'Role title cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  phone: z.string()
    .optional()
    .refine((val) => !val || val.trim() === '' || phoneRegex.test(val.replace(/\s/g, '')),
      { message: 'Phone must be 7–15 digits with an optional leading +' })
    .transform((val) => val ? val.replace(/\s/g, '') : ''),
  email: z.string()
    .email('Please enter a valid email address')
    .or(z.literal(''))
    .transform((val) => val ? val.trim().toLowerCase() : ''),
  profilePhotoUrl: z.string().url('Invalid image URL').or(z.literal('')).optional().transform((val) => val || ''),
  displayOrder: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().int().nonnegative('Display order must be a non-negative number')
  ).default(0),
  isActive: z.boolean().default(true)
})

// 10. Payment Details Validation Schema
export const paymentDetailsSchema = z.object({
  paymentType: z.enum(['Mobile Money', 'Bank Transfer']),
  providerName: z.string()
    .min(1, 'Provider/Bank name is required')
    .max(100, 'Provider name cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  accountNumber: z.string()
    .min(1, 'Account number is required')
    .max(50, 'Account number cannot exceed 50 characters')
    .transform((val) => val.trim()),
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name cannot exceed 100 characters')
    .transform((val) => sanitizeText(val.trim())),
  bankBranch: z.string()
    .max(100, 'Branch name cannot exceed 100 characters')
    .optional()
    .transform((val) => val ? sanitizeText(val.trim()) : ''),
  swiftCode: z.string()
    .max(20, 'SWIFT code cannot exceed 20 characters')
    .optional()
    .transform((val) => val ? val.trim().toUpperCase() : ''),
  instructions: z.string()
    .max(500, 'Instructions cannot exceed 500 characters')
    .optional()
    .transform((val) => val ? sanitizeText(val.trim()) : ''),
  isActive: z.boolean().default(true)
})

