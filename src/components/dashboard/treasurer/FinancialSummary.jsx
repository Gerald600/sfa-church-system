import React from 'react'
import { TrendingUp, Clock, Coins, Wallet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AnimatedNumber } from '../../ui/AnimatedNumber'

export const FinancialSummary = ({
  contributions = [],
  expenses = [],
  phases = []
}) => {
  const totalApproved = contributions
    .filter(c => (c.status || '').toLowerCase() === 'approved')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const totalPending = contributions
    .filter(c => (c.status || 'pending').toLowerCase() === 'pending')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const totalExpenses = expenses
    .filter(e => (e.status || '').toLowerCase() !== 'rejected')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

  const netBalance = totalApproved - totalExpenses

  const chartData = phases.map(phase => {
    const phaseContribs = contributions
      .filter(c => c.purposeName === phase.name && (c.status || '').toLowerCase() === 'approved')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
    
    const phaseExp = expenses
      .filter(e => e.phaseName === phase.name && (e.status || '').toLowerCase() !== 'rejected')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    return {
      name: phase.name,
      Raised: phaseContribs,
      Spent: phaseExp,
      Budget: Number(phase.budget || 0)
    }
  })

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md interactive-card">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Funds Raised</span>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white">
            <AnimatedNumber value={totalApproved} prefix="UGX " />
          </p>
          <p className="text-xs text-slate-400 mt-1">Verified approved contributions</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md interactive-card">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Verification</span>
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white">
            <AnimatedNumber value={totalPending} prefix="UGX " />
          </p>
          <p className="text-xs text-slate-400 mt-1">Awaiting treasurer review</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md interactive-card">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Expenditure</span>
            <Coins className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white">
            <AnimatedNumber value={totalExpenses} prefix="UGX " />
          </p>
          <p className="text-xs text-slate-400 mt-1">Logged construction expenses</p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md interactive-card">
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Reserve Balance</span>
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-2xl font-black text-white">
            <AnimatedNumber value={netBalance} prefix="UGX " />
          </p>
          <p className="text-xs text-slate-400 mt-1">Available parish funds</p>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4 interactive-card">
        <h4 className="text-base font-bold text-white">Financial Allocation by Construction Phase</h4>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `UGX ${(val / 1000000).toFixed(0)}M`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                formatter={(val) => `UGX ${Number(val).toLocaleString()}`}
              />
              <Bar dataKey="Raised" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Spent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Budget" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
