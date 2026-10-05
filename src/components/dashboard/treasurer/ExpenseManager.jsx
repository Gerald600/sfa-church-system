import React, { useState } from 'react'
import { Plus, Check, X, AlertTriangle, Coins, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { expenseSchema } from '../../../utils/validation'
import { StatusBadge } from '../../ui/StatusBadge'
import { AnimatedNumber } from '../../ui/AnimatedNumber'

export const ExpenseManager = ({
  expenses = [],
  phases = [],
  onCreateExpense,
  onApproveExpense,
  onRejectExpense,
  currentUserRole = 'treasurer'
}) => {
  const [showModal, setShowModal] = useState(false)
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    phaseId: phases[0]?.id || '',
    category: 'Contractor Payout'
  })
  const [errors, setErrors] = useState(null)
  const [showHighValueConfirm, setShowHighValueConfirm] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors(null)

    const parseResult = expenseSchema.safeParse(newExpense)
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.format()
      setErrors(fieldErrors)
      return
    }

    const amountNum = Number(newExpense.amount)
    if (amountNum > 5000000 && !showHighValueConfirm) {
      setShowHighValueConfirm(true)
      return
    }

    onCreateExpense(parseResult.data)
    setShowModal(false)
    setShowHighValueConfirm(false)
    setNewExpense({
      description: '',
      amount: '',
      phaseId: phases[0]?.id || '',
      category: 'Contractor Payout'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Expense Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <span>Construction Expenses & Outflows</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Track payouts, materials, and labor costs linked to active phases</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-all focus-ring"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Expense</span>
        </motion.button>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md interactive-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-800 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Linked Phase</th>
                <th className="px-6 py-4 font-semibold">Amount (UGX)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                {(currentUserRole === 'admin' || currentUserRole === 'treasurer') && (
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No expense records logged yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const isPending = (expense.status || 'pending').toLowerCase() === 'pending'

                  return (
                    <tr key={expense.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium border border-slate-700/50">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{expense.phaseName || 'General'}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-amber-400">
                        <AnimatedNumber value={expense.amount || 0} prefix="UGX " />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={expense.status || 'Pending'} />
                      </td>
                      {(currentUserRole === 'admin' || currentUserRole === 'treasurer') && (
                        <td className="px-6 py-4 text-right">
                          {isPending && (
                            <div className="flex items-center justify-end space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onApproveExpense && onApproveExpense(expense.id)}
                                className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
                                title="Approve Expense"
                              >
                                <Check className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onRejectExpense && onRejectExpense(expense.id, 'Unverified expense claim')}
                                className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg border border-rose-500/30 transition-colors"
                                title="Reject Expense"
                              >
                                <X className="w-4 h-4" />
                              </motion.button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl"
            >
              <h4 className="text-lg font-bold text-white">Log Construction Expense</h4>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="e.g. 50 Bags of Cement for Foundation"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus-ring"
                  />
                  {errors?.description && (
                    <p className="text-xs text-rose-400 mt-1">{errors.description._errors[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (UGX)</label>
                  <input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="e.g. 1500000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus-ring"
                  />
                  {errors?.amount && (
                    <p className="text-xs text-rose-400 mt-1">{errors.amount._errors[0]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus-ring"
                  >
                    <option value="Contractor Payout">Contractor Payout</option>
                    <option value="Materials Purchase">Materials Purchase</option>
                    <option value="Labour Costs">Labour Costs</option>
                    <option value="Logistics & Events">Logistics & Events</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Construction Phase</label>
                  <select
                    value={newExpense.phaseId}
                    onChange={(e) => setNewExpense({ ...newExpense, phaseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus-ring"
                  >
                    {phases.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {showHighValueConfirm && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-2.5 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">High-Value Expense Alert</p>
                      <p>Amount exceeds UGX 5,000,000. Click submit again to confirm logging this expenditure.</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-amber-500/20"
                  >
                    {showHighValueConfirm ? 'Confirm & Log' : 'Save Expense'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
