import { describe, it, expect } from 'vitest'
import {
  contributionSchema,
  expenseSchema,
  pledgeSchema,
  phaseSchema,
  signupSchema,
  sanitizeText
} from '../utils/validation'

describe('Financial Validation Schemas & Sanitization', () => {
  it('sanitizes malicious XSS script tags in input text', () => {
    const malicious = '<script>alert("xss")</script>'
    const sanitized = sanitizeText(malicious)
    expect(sanitized).not.toContain('<script>')
    expect(sanitized).toContain('&lt;script&gt;')
  })

  it('validates correct contribution submissions', () => {
    const validContrib = {
      amount: 250000,
      purposeType: 'phase',
      purposeName: 'Phase 2 Roofing',
      method: 'Mobile Money',
      reference: 'MM-REF-100293'
    }
    const result = contributionSchema.safeParse(validContrib)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reference).toBe('MM-REF-100293')
    }
  })

  it('rejects invalid or negative contribution amounts', () => {
    const invalidContrib = {
      amount: -5000,
      purposeType: 'phase',
      purposeName: 'Phase 2 Roofing',
      method: 'Cash',
      reference: 'REF-123'
    }
    const result = contributionSchema.safeParse(invalidContrib)
    expect(result.success).toBe(false)
  })

  it('validates expense schema correctly', () => {
    const validExpense = {
      description: 'Purchased 50 Bags of Tororo Cement',
      amount: 1750000,
      category: 'Materials Purchase',
      phaseId: 'phase-roofing'
    }
    const result = expenseSchema.safeParse(validExpense)
    expect(result.success).toBe(true)
  })

  it('validates pledge creation schema correctly', () => {
    const validPledge = {
      amount: 1000000,
      purpose: 'Altar Restoration Fund',
      targetDate: '2026-12-31'
    }
    const result = pledgeSchema.safeParse(validPledge)
    expect(result.success).toBe(true)
  })

  it('validates phase creation schema with valid contractor details', () => {
    const validPhase = {
      name: 'Phase 3 Interior Finishing',
      description: 'Tiling, painting, and electric wiring',
      budget: 80000000,
      completionDate: '2027-04-15',
      contractorName: 'Kampala Engineering Works',
      contractorEmail: 'info@kew.co.ug'
    }
    const result = phaseSchema.safeParse(validPhase)
    expect(result.success).toBe(true)
  })
})
