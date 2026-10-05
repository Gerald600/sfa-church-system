import { describe, it, expect } from 'vitest'

const calculatePhaseProgress = (currentRaised, budget) => {
  const b = Number(budget || 0)
  const r = Number(currentRaised || 0)
  if (b <= 0) return 0
  return Math.min(100, Math.round((r / b) * 100))
}

const calculateNetFinancialBalance = (contributions = [], expenses = []) => {
  const approvedTotal = contributions
    .filter(c => (c.status || '').toLowerCase() === 'approved')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const loggedExpenses = expenses
    .filter(e => (e.status || '').toLowerCase() !== 'rejected')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  return approvedTotal - loggedExpenses
}

describe('Financial Progress & Balance Calculations', () => {
  it('calculates completion percentage accurately', () => {
    expect(calculatePhaseProgress(5000000, 10000000)).toBe(50)
    expect(calculatePhaseProgress(12000000, 10000000)).toBe(100) // capped at 100%
    expect(calculatePhaseProgress(0, 5000000)).toBe(0)
    expect(calculatePhaseProgress(1000, 0)).toBe(0) // zero budget safety check
  })

  it('calculates net financial balance correctly considering only approved contributions', () => {
    const contributions = [
      { amount: 1000000, status: 'Approved' },
      { amount: 500000, status: 'Approved' },
      { amount: 2000000, status: 'Pending' }, // Should be ignored
      { amount: 300000, status: 'Rejected' }  // Should be ignored
    ]

    const expenses = [
      { amount: 400000, status: 'Approved' },
      { amount: 100000, status: 'Pending' },  // Unrejected logged expense
      { amount: 900000, status: 'Rejected' } // Should be ignored
    ]

    // Approved contributions = 1.5M, active expenses = 500k -> net = 1M
    const net = calculateNetFinancialBalance(contributions, expenses)
    expect(net).toBe(1000000)
  })
})
