import React, { useState } from 'react'
import { FileText, Download, CheckCircle2, X } from 'lucide-react'
import { generateContributionReceipt } from '../../utils/pdfReceiptGenerator'
import QRCode from 'react-qr-code'

export const ReceiptModal = ({ isOpen, onClose, contribution, memberProfile }) => {
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen || !contribution) return null

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      await generateContributionReceipt(contribution, memberProfile)
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  const status = contribution?.status || 'Approved'
  const isApproved = (status || '').toLowerCase() === 'approved'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Contribution Receipt</h3>
              <p className="text-xs text-slate-400">Ref: {contribution.reference}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Status Badge & Header Details */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">St. Francis of Assisi Church</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                UGX {Number(contribution.amount || 0).toLocaleString()}
              </p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
              isApproved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{status.toUpperCase()}</span>
            </div>
          </div>

          {/* Key Information Table */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Contributor:</span>
              <span className="font-medium text-white">{contribution.userName || memberProfile?.full_name || 'Parish Member'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Purpose / Fund:</span>
              <span className="font-medium text-white">{contribution.purposeName || 'General Building Fund'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Payment Method:</span>
              <span className="font-medium text-white">{contribution.method}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Transaction Reference:</span>
              <span className="font-mono text-indigo-400 font-semibold">{contribution.reference}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-400">Date:</span>
              <span className="font-medium text-white">
                {new Date(contribution.date || contribution.createdAt || 0).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </span>
            </div>
          </div>

          {/* QR Verification preview */}
          <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-300">Verification Code</p>
              <p className="text-[11px] text-slate-400">Scan to authenticate official parish records</p>
            </div>
            <div className="bg-white p-2 rounded-lg shadow-inner">
              <QRCode
                value={`SFA-RECEIPT|REF:${contribution.reference}|AMT:${contribution.amount}`}
                size={64}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-800/80 px-6 py-4 border-t border-slate-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Receipt'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
