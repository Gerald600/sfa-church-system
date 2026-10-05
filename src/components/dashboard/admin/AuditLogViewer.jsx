import React, { useState } from 'react'
import { Activity, ShieldAlert, Search } from 'lucide-react'

export const AuditLogViewer = ({ auditLogs = [] }) => {
  const [search, setSearch] = useState('')

  const filtered = (auditLogs || []).filter(log => {
    if (!search || !search.trim()) return true
    const q = (search || '').toLowerCase()
    return (
      (log.action || log.action_type || log.actionType || '').toLowerCase().includes(q) ||
      (log.details || log.description || '').toLowerCase().includes(q) ||
      (log.userName || log.user_id || log.userId || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-rose-400" />
            <span>Administrative Audit Trail & Security Logs</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Immutable system audit logs tracking approvals, financial edits, and role changes</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or log detail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No audit log entries matching filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((log) => {
              let parsedDesc = log.details || log.description || ''
              try {
                if (typeof log.description === 'string' && log.description.startsWith('{')) {
                  const obj = JSON.parse(log.description)
                  parsedDesc = `${obj.userName || 'System'} (${obj.role || 'system'}): ${obj.details || log.description || ''}`
                }
              } catch (e) {
                // leave as string
              }

              const formattedDate = log.date || (log.created_at || log.createdAt ? new Date(log.created_at || log.createdAt).toLocaleString('en-GB') : 'Recently')

              return (
                <div key={log.id} className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[11px] font-semibold uppercase">
                        {log.action || log.action_type || log.actionType || 'SYSTEM'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formattedDate}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200">{parsedDesc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
