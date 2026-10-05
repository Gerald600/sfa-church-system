import React, { useState } from 'react'
import { Users, Shield, Search, UserCheck } from 'lucide-react'

export const UserRoleManager = ({
  profiles = {},
  onUpdateRole
}) => {
  const [search, setSearch] = useState('')
  const profilesList = Object.values(profiles)

  const filtered = profilesList.filter(p => {
    if (!search || !search.trim()) return true
    const q = (search || '').toLowerCase()
    return (
      (p.full_name || p.fullName || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.role || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>User Accounts & Role Permissions</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Manage user roles across Parishioners, Treasurers, Coordinators, and Admins</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Email / Contact</th>
                <th className="px-6 py-4 font-semibold">Assigned Role</th>
                <th className="px-6 py-4 font-semibold text-right">Change Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No registered user accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                        {(user.full_name || user.fullName || 'U').charAt(0)}
                      </div>
                      <span>{user.full_name || user.fullName || 'Parish Member'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {user.email || user.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        user.role === 'admin'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : user.role === 'treasurer'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : user.role === 'coordinator'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {user.role || 'member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <select
                        value={user.role || 'member'}
                        onChange={(e) => onUpdateRole && onUpdateRole(user.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="member">Member</option>
                        <option value="treasurer">Treasurer</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
