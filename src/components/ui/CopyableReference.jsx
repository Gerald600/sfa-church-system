import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

export const CopyableReference = ({ reference = '', className = '' }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e) => {
    e.stopPropagation()
    if (!reference) return
    navigator.clipboard.writeText(reference)
    setCopied(true)
    toast.success(`Copied ${reference} to clipboard!`, { id: `copy-${reference}`, duration: 2000 })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy reference code"
      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-lg font-mono text-xs text-indigo-400 font-semibold transition-all group focus-ring ${className}`}
    >
      <span>{reference}</span>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
