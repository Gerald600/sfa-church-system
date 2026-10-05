import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ExternalLink, ChevronLeft, ChevronRight, Sparkles, Building2, 
  Phone, Mail, Globe, Tag, Megaphone, ShieldCheck
} from 'lucide-react'
import { useActiveAds } from '../../../hooks/data/useAds'

/**
 * Filter helper ensuring ads fall strictly within start_date <= today <= end_date
 */
export function isAdCurrentlyValid(ad) {
  if (!ad || ad.is_active === false) return false
  const today = new Date().toISOString().split('T')[0]
  if (ad.start_date && ad.start_date > today) return false
  if (ad.end_date && ad.end_date < today) return false
  return true
}

/**
 * Visual Banner Carousel / Card for Member Dashboard Main View
 */
export function AdBannerWidget({ placement = 'dashboard' }) {
  const { data: ads = [], isLoading } = useActiveAds(placement)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Filter valid banner ads
  const bannerAds = ads.filter(ad => 
    isAdCurrentlyValid(ad) && (ad.ad_type === 'banner' || !ad.ad_type)
  )

  // Auto-rotation every 7 seconds
  useEffect(() => {
    if (bannerAds.length <= 1 || isPaused) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % bannerAds.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [bannerAds.length, isPaused])

  // Reset index if out of bounds after ad list updates
  useEffect(() => {
    if (currentIndex >= bannerAds.length && bannerAds.length > 0) {
      setCurrentIndex(0)
    }
  }, [bannerAds.length, currentIndex])

  if (isLoading || bannerAds.length === 0) {
    return null
  }

  const currentAd = bannerAds[currentIndex]

  const handlePrev = (e) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev === 0 ? bannerAds.length - 1 : prev - 1))
  }

  const handleNext = (e) => {
    e.stopPropagation()
    setCurrentIndex(prev => (prev + 1) % bannerAds.length)
  }

  return (
    <div 
      className="relative overflow-hidden rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl shadow-indigo-950/20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id || currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="relative z-10 flex flex-col md:flex-row items-stretch justify-between p-5 md:p-6 gap-6"
        >
          {/* Ad Content */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Sponsored Partner
                </span>
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  {currentAd.company_name}
                </span>
              </div>

              <h3 className="text-lg md:text-xl font-extrabold text-white tracking-tight leading-snug">
                {currentAd.title}
              </h3>

              {currentAd.description && (
                <p className="mt-2 text-xs md:text-sm text-slate-300 font-normal line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {currentAd.description}
                </p>
              )}
            </div>

            {/* Footer Actions & Contact info */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {currentAd.target_url && (
                <a
                  href={currentAd.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 hover:scale-102"
                >
                  <span>Explore Offer</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {currentAd.contact_info && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-semibold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <Phone className="w-3 h-3 text-indigo-300" />
                  <span>{currentAd.contact_info}</span>
                </span>
              )}
            </div>
          </div>

          {/* Ad Image / Graphic */}
          {currentAd.image_url ? (
            <div className="md:w-64 lg:w-80 h-44 md:h-auto rounded-xl overflow-hidden bg-slate-950/60 border border-white/10 shrink-0 relative flex items-center justify-center">
              <img
                src={currentAd.image_url}
                alt={currentAd.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="md:w-64 lg:w-80 h-32 md:h-auto rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex flex-col items-center justify-center p-4 text-center shrink-0">
              <Building2 className="w-10 h-10 text-indigo-400 mb-2 opacity-80" />
              <p className="text-xs font-bold text-white">{currentAd.company_name}</p>
              <span className="text-[10px] text-slate-400 mt-1">Parish Business Directory</span>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Multi-ad carousel navigation controls */}
      {bannerAds.length > 1 && (
        <div className="relative z-10 px-6 pb-4 flex items-center justify-between border-t border-white/10 pt-3">
          {/* Indicators */}
          <div className="flex items-center gap-1.5">
            {bannerAds.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-6 bg-amber-400' : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-0"
              aria-label="Previous advertisement"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-0"
              aria-label="Next advertisement"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Sponsored Cards for the Announcements & Updates Section
 * Renders sponsored classifieds and directory listings with stylized "Sponsored" badges
 */
export function SponsoredAnnouncementsWidget({ placement = 'announcements' }) {
  const { data: ads = [], isLoading } = useActiveAds(placement)

  // Filter valid sponsored items (directory, classified, or announcements placement)
  const sponsoredItems = ads.filter(ad => isAdCurrentlyValid(ad))

  if (isLoading || sponsoredItems.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Sponsored Community Listings
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          Parish Business Network
        </span>
      </div>

      <div className="space-y-3">
        {sponsoredItems.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/50 via-white to-indigo-50/30 dark:from-amber-950/15 dark:via-slate-900 dark:to-indigo-950/20 shadow-sm space-y-3 transition-all hover:border-amber-300 dark:hover:border-amber-800"
          >
            {/* Header with Title and Sponsored Badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    Sponsored
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {item.ad_type || 'Directory'}
                  </span>
                </div>
                <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h5>
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {item.company_name}
                </p>
              </div>

              {item.image_url && (
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {item.description}
              </p>
            )}

            {/* Contact & CTA Link */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {item.contact_info && (
                  <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold">
                    <Phone className="w-3 h-3 text-emerald-500" />
                    {item.contact_info}
                  </span>
                )}
              </div>

              {item.target_url && (
                <a
                  href={item.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors shadow-xs"
                >
                  <span>Learn More</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Dedicated Parish Business Directory & Member Marketplace View
 */
export function ParishDirectoryView() {
  const { data: ads = [], isLoading } = useActiveAds('all')
  const [filterType, setFilterType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const validAds = ads.filter(ad => isAdCurrentlyValid(ad))

  const filtered = validAds.filter(ad => {
    const matchesType = filterType === 'all' || ad.ad_type === filterType
    const matchesSearch = !searchQuery || 
      ad.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ad.contact_info?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border border-indigo-800/40 relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            Parish Business Community
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Church Business Directory & Marketplace
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
            Support parishioner-owned companies, local professional services, and church partners contributing to our church development fund.
          </p>
        </div>
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Ad Type Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold w-full md:w-auto">
          {['all', 'directory', 'classified', 'banner'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                filterType === type 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type === 'all' ? 'All Listings' : type + 's'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Search directory by name, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-semibold text-xs">
          Loading verified directory listings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 space-y-2">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Listings Found</h4>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or filter type.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Optional Image */}
                {item.image_url && (
                  <div className="h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-sm text-amber-300 border border-amber-400/30">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        Verified Partner
                      </span>
                    </div>
                  </div>
                )}

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  {!item.image_url && (
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Sparkles className="w-2.5 h-2.5" />
                        Verified Partner
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {item.ad_type}
                      </span>
                    </div>
                  )}

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {item.company_name}
                    </p>
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer with Contact and CTA */}
              <div className="p-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-3 text-xs">
                {item.contact_info ? (
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{item.contact_info}</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Parish Directory</span>
                )}

                {item.target_url && (
                  <a
                    href={item.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 shadow-xs"
                  >
                    <span>Visit</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdBannerWidget

