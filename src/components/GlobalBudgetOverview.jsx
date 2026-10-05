import { useMemo } from 'react'
import { useContributions } from '../hooks/useData'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { Coins, Landmark, ShieldAlert, Sparkles, FileText, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'

export const OFFICIAL_FINANCIAL_LEDGER = [
  { period: 'Aug 11, 2019 – Feb 30, 2022', collections: 49638700, expenditure: 31236000, balance: 18402700, notes: 'Initial phase', isDeficit: false },
  { period: 'Mar 06, 2022 – Sep 2022', collections: 30641100, expenditure: 30202500, balance: 438600, notes: 'Cumulative total phase', isDeficit: false },
  { period: 'Sep 2022 – Aug 2023', collections: 22083100, expenditure: 16366200, balance: 5716900, notes: '', isDeficit: false },
  { period: 'Aug 2023 – Oct 2023', collections: 16529500, expenditure: 16308000, balance: 221500, notes: '', isDeficit: false },
  { period: 'Oct 2023 – Dec 2023', collections: 13688300, expenditure: 12940200, balance: 748100, notes: '', isDeficit: false },
  { period: 'Jan 2024 – Apr 2024', collections: 10050300, expenditure: 7853000, balance: 2197300, notes: '', isDeficit: false },
  { period: 'Apr 2024 – Jul 2024', collections: 9521400, expenditure: 9334000, balance: 187400, notes: '', isDeficit: false },
  { period: 'Jul 2024 – Oct 2024', collections: 11055400, expenditure: 10885000, balance: 170400, notes: '', isDeficit: false },
  { period: 'Oct 2024 – Dec 2024', collections: 5879000, expenditure: 4541000, balance: 1338000, notes: '', isDeficit: false },
  { period: 'Jan 2025 – Mar 2025', collections: 9166400, expenditure: 6582000, balance: 2584400, notes: '', isDeficit: false },
  { period: 'Apr 2025 – Jun 2025', collections: 12630900, expenditure: 8715800, balance: 3915100, notes: '', isDeficit: false },
  { period: 'Jan 2026 – Mar 2026', collections: 6302400, expenditure: 2421000, balance: 3881400, notes: '', isDeficit: false },
  { period: 'Apr 2026', collections: 10571300, expenditure: 10975500, balance: -404200, notes: 'Deficit month', isDeficit: true },
  { period: 'May 2026', collections: 1658700, expenditure: 1015200, balance: 643500, notes: '', isDeficit: false }
]

export default function GlobalBudgetOverview() {
  const { data: contributions = [], isLoading } = useContributions()

  const totalApprovedUGX = useMemo(() => {
    return contributions
      .filter(c => c.status === 'Approved')
      .reduce((sum, c) => sum + Number(c.amount || 0), 0)
  }, [contributions])

  const goalUGX = 750825000
  const subtotalUGX = 617760000
  const contingencyUGX = 18532000
  const vatUGX = 114533000

  const percentage = useMemo(() => {
    return goalUGX > 0 ? Math.min(100, Math.round((totalApprovedUGX / goalUGX) * 100)) : 0
  }, [totalApprovedUGX])

  const formatUGX = (amount) => {
    return `${new Intl.NumberFormat('en-UG').format(amount)} Shs`
  }

  // Calculate official totals from ledger
  const ledgerTotals = useMemo(() => {
    const totalColl = OFFICIAL_FINANCIAL_LEDGER.reduce((sum, row) => sum + row.collections, 0)
    const totalExp = OFFICIAL_FINANCIAL_LEDGER.reduce((sum, row) => sum + row.expenditure, 0)
    const netBal = totalColl - totalExp
    return { totalColl, totalExp, netBal }
  }, [])

  // BOQ Phases Breakdown Data
  const boqData = useMemo(() => [
    { name: 'R.C. Frame', budget: 118403000, percent: '15.8%', color: '#3b82f6' },
    { name: 'Stair Case', budget: 12122000, percent: '1.6%', color: '#60a5fa' },
    { name: 'Walling', budget: 68650000, percent: '9.1%', color: '#34d399' },
    { name: 'Roof & Water', budget: 86978000, percent: '11.6%', color: '#059669' },
    { name: 'Wall Finishes', budget: 98166000, percent: '13.1%', color: '#fbbf24' },
    { name: 'Floor Finishes', budget: 78071000, percent: '10.4%', color: '#f59e0b' },
    { name: 'Ceiling Finishes', budget: 11475000, percent: '1.5%', color: '#ec4899' },
    { name: 'Doors', budget: 42655000, percent: '5.7%', color: '#f43f5e' },
    { name: 'Windows', budget: 56258000, percent: '7.5%', color: '#a855f7' },
    { name: 'Electrical', budget: 20000000, percent: '2.7%', color: '#8b5cf6' },
    { name: 'Mechanical', budget: 25000000, percent: '3.3%', color: '#6366f1' }
  ], [])

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-xl text-white text-xs space-y-1">
          <p className="font-extrabold text-slate-100">{data.name}</p>
          <p className="text-emerald-400 font-semibold">Budget: <span className="font-mono">{formatUGX(data.budget)}</span></p>
          <p className="text-indigo-400 font-semibold">Share of Goal: <span className="font-mono">{data.percent}</span></p>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-8">
      {/* Top Section: Title & Master Progress */}
      <div className="space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-indigo-400 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Official Bill of Quantities (BOQ) Summary
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-2">
              St. Francis of Assisi Church Project
            </h3>
          </div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 self-start sm:self-center">
            {percentage}% Funded
          </span>
        </div>

        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
            <span>Project Funding: {formatUGX(totalApprovedUGX)} raised</span>
            <span>Goal: {formatUGX(goalUGX)}</span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-1000 shadow-inner" 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Middle Section: Recharts Bar Chart */}
      <div className="space-y-3 text-left">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Phases Budget Allocation
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            A comprehensive overview of the estimated costs for the 11 main engineering phases.
          </p>
        </div>

        <div className="h-64 sm:h-72 w-full text-[10px] text-slate-400">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={boqData}
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.1} horizontal={false} />
              <XAxis 
                type="number" 
                tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} 
                stroke="#64748b" 
                tick={{ fontSize: 9 }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100} 
                tick={{ fill: 'currentColor', fontSize: 9 }}
                stroke="#64748b" 
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Bar 
                dataKey="budget" 
                radius={[0, 4, 4, 0]}
                name="Budget (UGX)"
                fill="#3b82f6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-left">
        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Total Cumulative Inflow</span>
          <p className="text-base font-black text-emerald-700 dark:text-emerald-300 font-mono">{formatUGX(ledgerTotals.totalColl)}</p>
        </div>
        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Total Cumulative Outflow</span>
          <p className="text-base font-black text-rose-700 dark:text-rose-300 font-mono">{formatUGX(ledgerTotals.totalExp)}</p>
        </div>
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl space-y-1">
          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Cumulative Net Balance</span>
          <p className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">+{formatUGX(ledgerTotals.netBal)}</p>
        </div>
      </div>
    </div>
  )
}
