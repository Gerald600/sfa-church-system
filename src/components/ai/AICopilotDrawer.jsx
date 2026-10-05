import React, { useState, useRef, useEffect } from 'react'
import { 
  Sparkles, 
  X, 
  Send, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Building2, 
  DollarSign, 
  Users, 
  FileSpreadsheet, 
  Compass, 
  Loader2, 
  Shield, 
  Check, 
  XCircle,
  HelpCircle
} from 'lucide-react'
import { useAI } from '../../context/AIContext'
import { useAuth } from '../../context/AuthContext'
import { formatUGX } from '../../utils/aiTools'

export const AICopilotDrawer = () => {
  const { 
    isOpen, 
    closeDrawer, 
    toggleDrawer, 
    messages, 
    isThinking, 
    pendingAction, 
    sendMessage, 
    confirmPendingAction, 
    cancelPendingAction, 
    clearChat 
  } = useAI()

  const { role, profile } = useAuth()
  const [inputPrompt, setInputPrompt] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, isOpen, isThinking])

  const handleSend = (e) => {
    e?.preventDefault()
    if (!inputPrompt.trim() || isThinking) return
    const text = inputPrompt
    setInputPrompt('')
    sendMessage(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickPrompts = [
    { label: '📊 Pledges Summary', text: 'Show me the pledges summary and balance.' },
    { label: '🏗️ Construction Progress', text: 'What is the current cathedral construction progress?' },
    { label: '💰 Financial Overview', text: 'Give me the latest executive financial overview.' },
    { label: '👥 Search Members', text: 'Show me registered parish members.' },
    { label: '🧭 Go to Treasurer', text: 'Navigate to the Treasurer Dashboard.' },
    { label: '📄 Export Financials', text: 'Export the financial contributions report to CSV.' }
  ]

  // Render markdown-like text formatting cleanly
  const renderFormattedText = (text = '') => {
    if (!text) return null

    // Split paragraphs
    const paragraphs = text.split('\n')
    return (
      <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
        {paragraphs.map((para, i) => {
          if (!para.trim()) return <div key={i} className="h-1" />

          // Bullet points
          if (para.trim().startsWith('•') || para.trim().startsWith('-') || para.trim().startsWith('* ')) {
            const bulletContent = para.replace(/^[•\-*]\s*/, '')
            return (
              <div key={i} className="flex items-start space-x-2 pl-1">
                <span className="text-indigo-400 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(bulletContent) }} />
              </div>
            )
          }

          return (
            <p key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(para) }} />
          )
        })}
      </div>
    )
  }

  // Format bold, italics, code inline
  const formatInlineMarkdown = (str = '') => {
    let formatted = str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded font-mono text-[11px]">$1</code>')
    return formatted
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING COPILOT TRIGGER BUTTON (Bottom-Right)                         */}
      {/* ========================================================================= */}
      <button
        onClick={toggleDrawer}
        aria-label="Open AI Copilot"
        className={`fixed bottom-6 right-6 z-50 group flex items-center space-x-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white rounded-2xl shadow-xl hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 border border-indigo-400/30 cursor-pointer ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-300"></span>
          </span>
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-black tracking-wide flex items-center gap-1.5">
            Parish Copilot
          </span>
          <span className="text-[10px] text-indigo-200/90 font-medium">Action Assistant</span>
        </div>
        <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black/30 border border-white/20 rounded text-[10px] font-mono text-indigo-100 ml-1">
          Ctrl+K
        </span>
      </button>

      {/* ========================================================================= */}
      {/* 2. COPILOT DRAWER OVERLAY & PANEL                                         */}
      {/* ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          />

          {/* Drawer Container */}
          <div className="relative w-full sm:w-[480px] md:w-[520px] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-10 text-white overflow-hidden animate-slide-left">
            
            {/* ------------------------------------------------------------- */}
            {/* Top Bar Header                                                */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 backdrop-blur flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black border border-indigo-400/30">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-black text-white tracking-tight">St. Francis Parish Copilot</h2>
                    <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-[10px] font-bold">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                    <span>{profile?.full_name || 'Parishioner'}</span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-bold text-indigo-400">
                      {role || 'member'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={clearChat}
                  title="Clear conversation"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closeDrawer}
                  title="Close Copilot (Esc)"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Quick Prompt Carousel Chips                                   */}
            {/* ------------------------------------------------------------- */}
            <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800/60 overflow-x-auto flex space-x-2 scrollbar-none">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(qp.text)}
                  disabled={isThinking}
                  className="shrink-0 px-2.5 py-1.5 bg-slate-850 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 rounded-xl text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Messages Feed                                                 */}
            {/* ------------------------------------------------------------- */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-200">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user'
                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-start space-x-2.5 max-w-[92%]">
                      {!isUser && (
                        <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className={`p-3.5 rounded-2xl ${
                        isUser 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10' 
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                      }`}>
                        {/* Message text content */}
                        {renderFormattedText(msg.text)}

                        {/* Tool execution indicator */}
                        {msg.toolExecuted && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center space-x-1.5 text-[11px] text-teal-400 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span>Executed action: <strong>{msg.toolExecuted}</strong></span>
                          </div>
                        )}

                        {/* Confirmation Card for Mutations */}
                        {msg.isConfirmation && msg.pendingAction && (
                          <div className="mt-3.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
                            <div className="flex items-start space-x-2 text-amber-400 text-xs font-semibold">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-white">Database Modification Required</p>
                                <p className="text-[11px] text-amber-300 mt-0.5" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(msg.pendingAction.description) }} />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                onClick={() => confirmPendingAction(msg.pendingAction)}
                                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 shadow-sm cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm & Commit</span>
                              </button>
                              <button
                                onClick={() => cancelPendingAction(msg.pendingAction)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                )
              })}

              {/* Thinking / Loading indicator */}
              {isThinking && (
                <div className="flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none flex items-center space-x-2 text-xs text-indigo-300 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Analyzing sanctuary records and executing tools...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Bottom Input Area                                             */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
              <form onSubmit={handleSend} className="relative flex items-center">
                <textarea
                  ref={inputRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Copilot or type an action (e.g. 'Show pledges', 'Navigate to Treasurer', 'Pledge 500k')..."
                  rows={2}
                  disabled={isThinking}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-3.5 pr-12 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all"
                />

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isThinking}
                  className="absolute right-2.5 bottom-2.5 p-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                <span>Press <strong>Enter</strong> to send • <strong>Shift+Enter</strong> for newline</span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>RBAC Protected</span>
                </span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
export default AICopilotDrawer
