import React from 'react'
import { motion } from 'framer-motion'

export const StatusBadge = ({ status = 'Pending', className = '' }) => {
  const normalized = (status || 'pending').toLowerCase()

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700'
  let dotColor = 'bg-slate-400'

  if (normalized === 'approved' || normalized === 'fulfilled' || normalized === 'completed') {
    colorClasses = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    dotColor = 'bg-emerald-400'
  } else if (normalized === 'pending' || normalized === 'active' || normalized === 'in progress') {
    colorClasses = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    dotColor = 'bg-amber-400'
  } else if (normalized === 'rejected' || normalized === 'cancelled') {
    colorClasses = 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    dotColor = 'bg-rose-400'
  }

  return (
    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border relative overflow-hidden backdrop-blur-md ${colorClasses} ${className}`}>
      {/* Metallic Shimmer Overlay */}
      <span className="absolute inset-0 shimmer-badge pointer-events-none opacity-40" />

      {/* Animated Pulse Dot */}
      <span className="relative flex h-2 w-2">
        <motion.span
          animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute inline-flex h-full w-full rounded-full ${dotColor}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
      </span>

      <span className="capitalize relative z-10">{status}</span>
    </span>
  )
}
