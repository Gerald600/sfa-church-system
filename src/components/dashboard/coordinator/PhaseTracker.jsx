import React, { useState } from 'react'
import { Plus, Building2, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react'
import { phaseSchema } from '../../../utils/validation'

export const PhaseTracker = ({
  phases = [],
  onCreatePhase,
  onUpdatePhase,
  onDeletePhase
}) => {
  const [showModal, setShowModal] = useState(false)
  const [newPhase, setNewPhase] = useState({
    name: '',
    description: '',
    budget: '',
    completionDate: '',
    contractorName: '',
    contractorEmail: '',
    engineerName: '',
    requiredMaterials: ''
  })
  const [errors, setErrors] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors(null)
    const parseResult = phaseSchema.safeParse(newPhase)
    if (!parseResult.success) {
      setErrors(parseResult.error.format())
      return
    }
    onCreatePhase(parseResult.data)
    setShowModal(false)
    setNewPhase({
      name: '',
      description: '',
      budget: '',
      completionDate: '',
      contractorName: '',
      contractorEmail: '',
      engineerName: '',
      requiredMaterials: ''
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <span>Construction Phases & Milestones</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">Manage architectural phases, budgets, target completion dates, and contractors</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/20 flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Construction Phase</span>
        </button>
      </div>

      {/* Phase Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {phases.map((phase) => {
          const budget = Number(phase.budget || 0)
          const raised = Number(phase.currentRaised || 0)
          const pct = Math.min(100, budget > 0 ? Math.round((raised / budget) * 100) : 0)

          return (
            <div key={phase.id} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-lg">{phase.name}</h4>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  pct >= 100
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                }`}>
                  {pct >= 100 ? 'Completed' : 'In Progress'}
                </span>
              </div>

              <p className="text-xs text-slate-400 line-clamp-2">{phase.description || 'No phase details provided.'}</p>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Target Progress</span>
                  <span className="text-indigo-400">{pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-800/60 text-slate-300">
                <div>
                  <span className="text-slate-500 block">Budget:</span>
                  <span className="font-semibold text-white">UGX {budget.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Target Date:</span>
                  <span className="font-medium">{phase.completionDate || 'N/A'}</span>
                </div>
                {phase.contractorName && (
                  <div>
                    <span className="text-slate-500 block">Contractor:</span>
                    <span className="font-medium">{phase.contractorName}</span>
                  </div>
                )}
                {phase.engineerName && (
                  <div>
                    <span className="text-slate-500 block">Site Engineer:</span>
                    <span className="font-medium">{phase.engineerName}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Phase Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <h4 className="text-lg font-bold text-white">Add Construction Phase</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phase Name</label>
                <input
                  type="text"
                  value={newPhase.name}
                  onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
                  placeholder="e.g. Substructure & Foundation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                {errors?.name && <p className="text-xs text-rose-400 mt-1">{errors.name._errors[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Total Budget (UGX)</label>
                <input
                  type="number"
                  value={newPhase.budget}
                  onChange={(e) => setNewPhase({ ...newPhase, budget: e.target.value })}
                  placeholder="e.g. 50000000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                {errors?.budget && <p className="text-xs text-rose-400 mt-1">{errors.budget._errors[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Completion Date</label>
                <input
                  type="date"
                  value={newPhase.completionDate}
                  onChange={(e) => setNewPhase({ ...newPhase, completionDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
                {errors?.completionDate && <p className="text-xs text-rose-400 mt-1">{errors.completionDate._errors[0]}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contractor Name</label>
                <input
                  type="text"
                  value={newPhase.contractorName}
                  onChange={(e) => setNewPhase({ ...newPhase, contractorName: e.target.value })}
                  placeholder="e.g. Kampala Structural Engineers Ltd"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30"
                >
                  Save Phase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
