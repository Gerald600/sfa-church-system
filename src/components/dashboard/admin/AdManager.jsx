import React, { useState, useMemo } from 'react'
import { 
  Megaphone, Plus, Search, Filter, Calendar, Building2, 
  ExternalLink, Edit3, Trash2, Image as ImageIcon, Eye, 
  CheckCircle2, Clock, AlertTriangle, Globe, X, Phone,
  Layers, ToggleLeft, ToggleRight, Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useAllAds, useCreateAd, useUpdateAd, useDeleteAd, useToggleAdStatus } from '../../../hooks/data/useAds'
import { useAuth } from '../../../context/AuthContext'

const getInitialForm = () => {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return {
    title: '',
    companyName: '',
    contactInfo: '',
    description: '',
    adType: 'banner',
    placement: 'dashboard',
    imageUrl: '',
    targetUrl: '',
    startDate: now.toISOString().split('T')[0],
    endDate: thirtyDaysLater.toISOString().split('T')[0],
    isActive: true
  }
}

export const AdManager = () => {
  const { user, profile } = useAuth()
  const { data: ads = [], isLoading } = useAllAds()
  const createMutation = useCreateAd()
  const updateMutation = useUpdateAd()
  const deleteMutation = useDeleteAd()
  const toggleMutation = useToggleAdStatus()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPlacement, setFilterPlacement] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAd, setEditingAd] = useState(null)
  const [deleteConfirmAd, setDeleteConfirmAd] = useState(null)

  // Form State
  const [form, setForm] = useState(getInitialForm)
  const [formErrors, setFormErrors] = useState({})

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAd(null)
    setForm(getInitialForm())
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (ad) => {
    setEditingAd(ad)
    setForm({
      title: ad.title || '',
      companyName: ad.companyName || '',
      contactInfo: ad.contactInfo || '',
      description: ad.description || '',
      adType: ad.adType || 'banner',
      placement: ad.placement || 'dashboard',
      imageUrl: ad.imageUrl || '',
      targetUrl: ad.targetUrl || '',
      startDate: ad.startDate || new Date().toISOString().split('T')[0],
      endDate: ad.endDate || '',
      isActive: ad.isActive !== false
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  // Handle Form Validation & Submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!form.title.trim()) errors.title = 'Title is required'
    if (!form.companyName.trim()) errors.companyName = 'Company name is required'
    if (!form.endDate) errors.endDate = 'End date is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errors.endDate = 'End date cannot be earlier than start date'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      if (editingAd) {
        await updateMutation.mutateAsync({
          id: editingAd.id,
          updates: form,
          user,
          profile
        })
      } else {
        await createMutation.mutateAsync({
          ad: form,
          user,
          profile
        })
      }
      setIsModalOpen(false)
      setEditingAd(null)
      setForm(getInitialForm())
    } catch (err) {
      console.error('Ad submission error:', err)
    }
  }

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmAd) return
    try {
      await deleteMutation.mutateAsync({
        id: deleteConfirmAd.id,
        title: deleteConfirmAd.title,
        user,
        profile
      })
      setDeleteConfirmAd(null)
    } catch (err) {
      console.error('Ad delete error:', err)
    }
  }

  // Handle Status Toggle
  const handleToggle = (ad) => {
    toggleMutation.mutate({
      id: ad.id,
      currentStatus: ad.isActive,
      title: ad.title,
      user,
      profile
    })
  }

  // Quick image file upload converter
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image file must be under 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm(prev => ({ ...prev, imageUrl: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  // Filtering
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      // Search
      const q = searchTerm.toLowerCase().trim()
      const matchesSearch = !q || 
        (ad.title || '').toLowerCase().includes(q) ||
        (ad.companyName || '').toLowerCase().includes(q) ||
        (ad.description || '').toLowerCase().includes(q)

      // Type
      const matchesType = filterType === 'all' || ad.adType === filterType

      // Placement
      const matchesPlacement = filterPlacement === 'all' || ad.placement === filterPlacement || ad.placement === 'all'

      // Status
      const matchesStatus = filterStatus === 'all' || ad.statusBadge === filterStatus

      return matchesSearch && matchesType && matchesPlacement && matchesStatus
    })
  }, [ads, searchTerm, filterType, filterPlacement, filterStatus])

  // Statistics
  const stats = useMemo(() => {
    const total = ads.length
    const active = ads.filter(a => a.statusBadge === 'Active').length
    const expired = ads.filter(a => a.statusBadge === 'Expired').length
    const banners = ads.filter(a => a.adType === 'banner').length
    const directory = ads.filter(a => a.adType === 'directory').length
    return { total, active, expired, banners, directory }
  }, [ads])

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Sponsorship & Business Directory Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Parish Advertising Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Publish community business cards, sponsorship banners, and trade classifieds visible in the member portal.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer shrink-0 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Advertisement</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/40 border border-slate-800/60 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Advertisements</span>
            <p className="text-xl font-black text-white mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-slate-950/40 border border-emerald-500/20 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-emerald-400">Active Live Ads</span>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{stats.active}</p>
          </div>
          <div className="bg-slate-950/40 border border-amber-500/20 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-amber-400">Display Banners</span>
            <p className="text-xl font-black text-amber-400 mt-0.5">{stats.banners}</p>
          </div>
          <div className="bg-slate-950/40 border border-sky-500/20 p-3.5 rounded-2xl">
            <span className="text-[10px] font-bold uppercase text-sky-400">Business Directory</span>
            <p className="text-xl font-black text-sky-400 mt-0.5">{stats.directory}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search company, title, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Formats (Banners & Directory)</option>
            <option value="banner">Banner Ads</option>
            <option value="directory">Business Directory</option>
            <option value="classified">Classified Listings</option>
          </select>

          {/* Placement Filter */}
          <select
            value={filterPlacement}
            onChange={(e) => setFilterPlacement(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Placements</option>
            <option value="website">Public Website Homepage</option>
            <option value="dashboard">Member Dashboard Only</option>
            <option value="announcements">Announcements Feed Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive / Paused</option>
            <option value="Expired">Expired</option>
            <option value="Scheduled">Scheduled Future</option>
          </select>
        </div>
      </div>

      {/* Ads Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading advertisements and directory listings...
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Megaphone className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No advertisements found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || filterType !== 'all' || filterPlacement !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search filters to find what you are looking for.'
                : 'Click "Create New Advertisement" to add your first church business directory or banner ad.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Advertisement & Company</th>
                  <th className="py-3 px-4">Type & Placement</th>
                  <th className="py-3 px-4">Campaign Duration</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredAds.map((ad) => {
                  const isExpired = ad.isExpired
                  const isActive = ad.isActive

                  return (
                    <tr key={ad.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Title & Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {ad.imageUrl ? (
                            <img
                              src={ad.imageUrl}
                              alt={ad.title}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-500 shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{ad.title}</p>
                            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <Building2 className="w-3 h-3 inline" />
                              <span>{ad.companyName}</span>
                            </p>
                            {ad.contactInfo && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">{ad.contactInfo}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type & Placement */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            ad.adType === 'banner' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                            ad.adType === 'directory' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' :
                            'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          }`}>
                            {ad.adType}
                          </span>
                          <p className="text-[10px] text-slate-400 capitalize">
                            Slot: {ad.placement}
                          </p>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                            {ad.startDate || 'Immediate'} → {ad.endDate}
                          </p>
                          <span className={`text-[10px] font-bold ${
                            isExpired ? 'text-rose-500' : 'text-emerald-500'
                          }`}>
                            {isExpired ? 'Campaign Concluded' : 'Active Period'}
                          </span>
                        </div>
                      </td>

                      {/* Target URL */}
                      <td className="py-3.5 px-4">
                        {ad.targetUrl ? (
                          <a
                            href={ad.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline max-w-[140px] truncate"
                          >
                            <span className="truncate">{ad.targetUrl.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Direct Contact</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ad.statusBadge === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          ad.statusBadge === 'Expired' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          ad.statusBadge === 'Scheduled' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            ad.statusBadge === 'Active' ? 'bg-emerald-400' :
                            ad.statusBadge === 'Expired' ? 'bg-rose-400' :
                            ad.statusBadge === 'Scheduled' ? 'bg-sky-400' :
                            'bg-slate-400'
                          }`} />
                          {ad.statusBadge}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggle(ad)}
                            title={isActive ? 'Deactivate Ad' : 'Activate Ad'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                          >
                            {isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(ad)}
                            title="Edit Ad"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirmAd(ad)}
                            title="Delete Ad"
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-8"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
                    </h3>
                    <p className="text-xs text-slate-400">Configure sponsored banner or community directory details</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Ad Headline / Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Centenary Bank Development Account"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {formErrors.title && <p className="text-rose-500 text-[10px]">{formErrors.title}</p>}
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Company / Organization Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Centenary Bank Ltd"
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {formErrors.companyName && <p className="text-rose-500 text-[10px]">{formErrors.companyName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Ad Format / Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Ad Format
                    </label>
                    <select
                      value={form.adType}
                      onChange={(e) => setForm({ ...form, adType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="banner">Display Banner (Hero / High-Impact)</option>
                      <option value="directory">Business Directory Listing</option>
                      <option value="classified">Classified Listing (Announcements)</option>
                    </select>
                  </div>

                  {/* Placement Target */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Target Placement Slot
                    </label>
                    <select
                      value={form.placement}
                      onChange={(e) => setForm({ ...form, placement: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="website">Public Website Homepage</option>
                      <option value="dashboard">Member Dashboard View</option>
                      <option value="announcements">Announcements Feed</option>
                      <option value="all">Universal (All Portals)</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Promotional Copy / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Short description of products, services, or special offers for parishioners..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                {/* Contact Info & Target URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Contact Info (Phone / Email)
                    </label>
                    <input
                      type="text"
                      placeholder="+256 700 000 000 | sales@biz.ug"
                      value={form.contactInfo}
                      onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Destination Website / Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={form.targetUrl}
                      onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Image URL or File Upload */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex justify-between">
                    <span>Banner Image / Logo URL</span>
                    <span className="text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or paste image URL"
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                    <label className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center space-x-1 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                  {form.imageUrl && (
                    <div className="mt-2 relative rounded-xl overflow-hidden h-24 border border-slate-200 dark:border-slate-700">
                      <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                    {formErrors.endDate && <p className="text-rose-500 text-[10px]">{formErrors.endDate}</p>}
                  </div>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Publish immediately (Active)
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingAd ? 'Save Changes' : 'Publish Advertisement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmAd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Advertisement?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete the advertisement for <strong className="text-slate-200">"{deleteConfirmAd.companyName}"</strong> ({deleteConfirmAd.title})? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmAd(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdManager
