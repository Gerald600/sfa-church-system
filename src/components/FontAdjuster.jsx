import React, { useState, useEffect } from 'react'
import { Type, Minus, Plus, RefreshCw } from 'lucide-react'

export default function FontAdjuster() {
  const [scale, setScale] = useState(() => {
    return localStorage.getItem('sfa_font_scale') || 'base'
  })
  const [isOpen, setIsOpen] = useState(false)

  const scales = [
    { key: 'sm', label: 'Compact', size: '13px' },
    { key: 'base', label: 'Standard', size: '15px' },
    { key: 'lg', label: 'Large', size: '17px' },
    { key: 'xl', label: 'Extra Large', size: '19px' }
  ]

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-scale-sm', 'font-scale-base', 'font-scale-lg', 'font-scale-xl')
    root.classList.add(`font-scale-${scale}`)
    localStorage.setItem('sfa_font_scale', scale)
  }, [scale])

  const decreaseScale = () => {
    if (scale === 'xl') setScale('lg')
    else if (scale === 'lg') setScale('base')
    else if (scale === 'base') setScale('sm')
  }

  const increaseScale = () => {
    if (scale === 'sm') setScale('base')
    else if (scale === 'base') setScale('lg')
    else if (scale === 'lg') setScale('xl')
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Adjust Display Text & Font Size"
        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm border border-slate-200 dark:border-slate-700/60"
      >
        <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-semibold hidden sm:inline uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Text {scale.toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 z-50 animate-fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
              <Type className="w-4 h-4 text-indigo-500" />
              <span>Display Text Adjuster</span>
            </span>
            <button
              onClick={() => setScale('base')}
              title="Reset to Default"
              className="text-[10px] font-semibold text-slate-400 hover:text-indigo-500 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Scale Step Buttons */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={decreaseScale}
              disabled={scale === 'sm'}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-3">
              {scales.find(s => s.key === scale)?.label}
            </span>

            <button
              onClick={increaseScale}
              disabled={scale === 'xl'}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Selection Pills */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {scales.map(s => (
              <button
                key={s.key}
                onClick={() => setScale(s.key)}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all text-center cursor-pointer border ${
                  scale === s.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {s.key.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight pt-1">
            Scales font sizes dynamically across all screens & mobile devices.
          </p>
        </div>
      )}
    </div>
  )
}
