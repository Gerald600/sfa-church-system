import React from 'react'
import { motion } from 'framer-motion'

export const SlidingTabs = ({
  tabs = [],
  activeTab,
  onChangeTab,
  layoutId = 'activeTabPill',
  className = ''
}) => {
  return (
    <div className={`relative flex items-center p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-xl overflow-x-auto scrollbar-none ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 z-10 whitespace-nowrap focus-ring ${
              isActive ? 'text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 -z-10"
              />
            )}

            {Icon && <Icon className={`w-4 h-4 transition-transform ${isActive ? 'scale-110 text-white' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>

            {tab.badge !== undefined && tab.badge !== null && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
