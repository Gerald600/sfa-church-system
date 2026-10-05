import React, { useState } from 'react'
import { CheckCircle2, XCircle, FileText, Search, Clock, ShieldCheck, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CopyableReference } from '../../ui/CopyableReference'
import { StatusBadge } from '../../ui/StatusBadge'
import { AnimatedNumber } from '../../ui/AnimatedNumber'

export const ApprovalQueue = ({
  contributions = [],
  onApprove,
  onReject,
  onOpenReceipt
}) => {
  const [subTab, setSubTab] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRejectId, setSelectedRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const pending = contributions.filter(c => (c.status || 'pending').toLowerCase() === 'pending')
  const history = contributions.filter(c => (c.status || 'pending').toLowerCase() !== 'pending')

  const listToDisplay = (subTab === 'pending' ? pending : history).filter(item => {
    if (!searchQuery || !searchQuery.trim()) return true
    const q = (searchQuery || '').toLowerCase()
    return (
      (item.userName || '').toLowerCase().includes(q) ||
      (item.reference || '').toLowerCase().includes(q) ||
      (item.purposeName || '').toLowerCase().includes(q) ||
      (item.method || '').toLowerCase().includes(q)
    )
  })

  const handleConfirmReject = () => {
    if (!selectedRejectId) return
    onReject(selectedRejectId, rejectReason || 'Transaction details invalid')
    setSelectedRejectId(null)
    setRejectReason('')
  }

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSubTab('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 focus-ring ${
              subTab === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Verification</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-amber-500/30 text-amber-200">
              {pending.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center space-x-2 focus-ring ${
              subTab === 'history'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Processed History</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {history.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference, name, purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors focus-ring"
          />
        </div>
      </div>

      {/* Contributions Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md interactive-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-800 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">Contributor</th>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Purpose</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Amount (UGX)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {listToDisplay.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No contributions found matching criteria.</p>
                  </td>
                </tr>
              ) : (
                listToDisplay.map((item) => {
                  const isPending = (item.status || 'pending').toLowerCase() === 'pending'

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {item.userName || 'Member'}
                      </td>
                      <td className="px-6 py-4">
                        <CopyableReference reference={item.reference} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-800/80 rounded-lg text-xs font-medium text-slate-300 border border-slate-700/50">
                          {item.purposeName || 'Building Fund'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {item.method}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        <AnimatedNumber value={item.amount || 0} prefix="UGX " />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status || 'Pending'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isPending ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onApprove(item.id)}
                                className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-colors"
                                title="Approve Contribution"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedRejectId(item.id)}
                                className="p-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 rounded-lg border border-rose-500/30 transition-colors"
                                title="Reject Contribution"
                              >
                                <XCircle className="w-4 h-4" />
                              </motion.button>
                            </>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => onOpenReceipt && onOpenReceipt(item)}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {selectedRejectId && (
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
              <h4 className="text-lg font-semibold text-rose-400">Reject Contribution</h4>
              <p className="text-sm text-slate-300">Please provide a reason for rejecting this payment submission:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid reference code or unverified mobile money transfer..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 focus-ring"
              />
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setSelectedRejectId(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold"
                >
                  Confirm Rejection
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
