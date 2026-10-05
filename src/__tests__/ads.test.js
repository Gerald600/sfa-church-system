import { describe, it, expect } from 'vitest'
import { isAdCurrentlyValid } from '../components/dashboard/member/AdBannerWidget'

describe('Advertisement Validity Helper', () => {
  const getTodayISO = () => new Date().toISOString().split('T')[0]
  const getDateOffsetISO = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  it('returns true for active ad within valid date range', () => {
    const ad = {
      id: 'ad-1',
      title: 'Active Sponsor',
      company_name: 'St. Jude Construction',
      is_active: true,
      start_date: getDateOffsetISO(-5),
      end_date: getDateOffsetISO(10)
    }
    expect(isAdCurrentlyValid(ad)).toBe(true)
  })

  it('returns false for inactive ad', () => {
    const ad = {
      id: 'ad-2',
      title: 'Inactive Sponsor',
      company_name: 'Test Co',
      is_active: false,
      start_date: getDateOffsetISO(-5),
      end_date: getDateOffsetISO(10)
    }
    expect(isAdCurrentlyValid(ad)).toBe(false)
  })

  it('returns false for expired ad', () => {
    const ad = {
      id: 'ad-3',
      title: 'Expired Banner',
      company_name: 'Old Co',
      is_active: true,
      start_date: getDateOffsetISO(-20),
      end_date: getDateOffsetISO(-1)
    }
    expect(isAdCurrentlyValid(ad)).toBe(false)
  })

  it('returns false for future ad that has not started yet', () => {
    const ad = {
      id: 'ad-4',
      title: 'Upcoming Promo',
      company_name: 'Future Co',
      is_active: true,
      start_date: getDateOffsetISO(3),
      end_date: getDateOffsetISO(15)
    }
    expect(isAdCurrentlyValid(ad)).toBe(false)
  })

  it('returns true for ad valid exactly today', () => {
    const today = getTodayISO()
    const ad = {
      id: 'ad-5',
      title: 'Today Promo',
      company_name: 'Today Co',
      is_active: true,
      start_date: today,
      end_date: today
    }
    expect(isAdCurrentlyValid(ad)).toBe(true)
  })

  it('handles null or missing ad safely', () => {
    expect(isAdCurrentlyValid(null)).toBe(false)
    expect(isAdCurrentlyValid(undefined)).toBe(false)
  })
})
