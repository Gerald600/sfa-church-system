import React from 'react'
import { Coins, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { CopyableReference } from '../../ui/CopyableReference'
import { StatusBadge } from '../../ui/StatusBadge'
import { AnimatedNumber } from '../../ui/AnimatedNumber'

export const ContributionHistory = ({
  contributions = [],
  onOpenReceipt
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span>My Contribution History</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">View your submitted payments, approval status, and official PDF receipts</p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md interactive-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-300 uppercase text-[11px] tracking-wider border-b border-slate-800 sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="px-6 py-4 font-semibold">Reference</th>
                <th className="px-6 py-4 font-semibold">Purpose</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Amount (UGX)</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {contributions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    You have not submitted any contributions yet.
                  </td>
                </tr>
              ) : (
                contributions.map((item) => {
                  const isApproved = (item.status || '').toLowerCase() === 'approved'

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold">
                        <CopyableReference reference={item.reference} />
                      </td>
                      <td className="px-6 py-4 text-white">
                        {item.purposeName || 'Building Fund'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {item.method}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-400">
                        <AnimatedNumber value={item.amount || 0} prefix="UGX " />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.status || 'Pending'} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isApproved && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onOpenReceipt && onOpenReceipt(item)}
                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg border border-indigo-500/30 text-xs font-semibold flex items-center space-x-1.5 ml-auto transition-colors focus-ring"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Download Receipt</span>
                          </motion.button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
