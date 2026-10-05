import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { processAIMessage } from '../services/aiService'
import { executeAITool, AI_TOOL_DEFINITIONS } from '../utils/aiTools'

const AIContext = createContext({})

const INITIAL_GREETING = {
  id: 'msg_welcome',
  sender: 'assistant',
  text: `Pax Christi! I am the **St. Francis Parish AI Copilot**.

I can directly assist you with:
• **Pledges & Giving**: Check summaries, balances, or record a pledge.
• **Construction Status**: Track phase completion, budgets, and milestone logs.
• **Financial Reports**: Summarize collections, approved expenses, or export CSV statements.
• **Parish Directory**: Search members, phone numbers, and leadership roles.
• **Instant Navigation**: Jump to Admin, Treasurer, Coordinator, or Member dashboards.

*How may I assist you today?*`,
  timestamp: new Date().toISOString()
}

export const AIProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([INITIAL_GREETING])
  const [isThinking, setIsThinking] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [pageContextData, setPageContextData] = useState({})
  const [activeFilters, setActiveFilters] = useState(null)

  const { user, profile, role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Context bundle passed to AI service
  const getAppContext = useCallback(() => {
    return {
      role: role || 'member',
      user,
      profile,
      pathname: location.pathname,
      activeTab: pageContextData.activeTab || '',
      pageData: pageContextData
    }
  }, [role, user, profile, location.pathname, pageContextData])

  // Open / Close Drawer controls
  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), [])

  // Send user message and orchestrate tool calls
  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || isThinking) return

    const userMsg = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsThinking(true)

    try {
      const appContext = getAppContext()
      const aiResponse = await processAIMessage(updatedMessages, appContext)

      const { text: replyText, toolCalls = [] } = aiResponse

      // If no tool calls, add plain assistant message
      if (toolCalls.length === 0) {
        setMessages(prev => [
          ...prev,
          {
            id: 'msg_' + Date.now(),
            sender: 'assistant',
            text: replyText || 'I processed your request.',
            timestamp: new Date().toISOString()
          }
        ])
        setIsThinking(false)
        return
      }

      // Process tool calls
      for (const tc of toolCalls) {
        const toolDef = AI_TOOL_DEFINITIONS[tc.name]

        // If tool requires user confirmation (e.g. creating a pledge / database mutation)
        if (toolDef?.requiresConfirmation) {
          const actionObject = {
            id: tc.id || 'action_' + Date.now(),
            toolName: tc.name,
            args: tc.args,
            description: `Confirm recording pledge of **${tc.args.amount ? 'UGX ' + Number(tc.args.amount).toLocaleString() : ''}** for *${tc.args.purpose || 'General Construction'}*?`
          }

          setPendingAction(actionObject)

          setMessages(prev => [
            ...prev,
            {
              id: 'msg_' + Date.now(),
              sender: 'assistant',
              text: replyText || `I have prepared the requested action. Please confirm to proceed:`,
              isConfirmation: true,
              pendingAction: actionObject,
              timestamp: new Date().toISOString()
            }
          ])
          setIsThinking(false)
          return
        }

        // Execute read-only / immediate action tool
        const toolResult = await executeAITool(
          tc.name,
          tc.args,
          appContext,
          {
            navigate,
            setActiveTab: (tab) => setPageContextData(prev => ({ ...prev, activeTab: tab })),
            setFilters: setActiveFilters
          }
        )

        // Add assistant message with tool results and rich summary
        setMessages(prev => [
          ...prev,
          {
            id: 'msg_' + Date.now(),
            sender: 'assistant',
            text: replyText ? `${replyText}\n\n${toolResult.summary || ''}` : (toolResult.summary || 'Action executed successfully.'),
            toolExecuted: tc.name,
            toolResult,
            timestamp: new Date().toISOString()
          }
        ])
      }
    } catch (err) {
      console.error('Error during AI message processing:', err)
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_' + Date.now(),
          sender: 'assistant',
          text: `⚠️ An error occurred while processing your request: ${err.message}`,
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsThinking(false)
    }
  }, [messages, isThinking, getAppContext, navigate])

  // Confirm pending mutation action
  const confirmPendingAction = useCallback(async (action) => {
    if (!action) return
    setIsThinking(true)
    setPendingAction(null)

    try {
      const appContext = getAppContext()
      const toolResult = await executeAITool(
        action.toolName,
        action.args,
        appContext,
        {
          navigate,
          setActiveTab: (tab) => setPageContextData(prev => ({ ...prev, activeTab: tab })),
          setFilters: setActiveFilters
        }
      )

      setMessages(prev => [
        ...prev,
        {
          id: 'msg_' + Date.now(),
          sender: 'assistant',
          text: toolResult.summary || 'Action completed successfully!',
          toolExecuted: action.toolName,
          toolResult,
          timestamp: new Date().toISOString()
        }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_' + Date.now(),
          sender: 'assistant',
          text: `❌ Action failed: ${err.message}`,
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setIsThinking(false)
    }
  }, [getAppContext, navigate])

  // Cancel pending mutation action
  const cancelPendingAction = useCallback((action) => {
    setPendingAction(null)
    setMessages(prev => [
      ...prev,
      {
        id: 'msg_' + Date.now(),
        sender: 'assistant',
        text: `🚫 Action cancelled. No records were modified in the database.`,
        timestamp: new Date().toISOString()
      }
    ])
  }, [])

  // Clear conversation history
  const clearChat = useCallback(() => {
    setMessages([INITIAL_GREETING])
    setPendingAction(null)
  }, [])

  return (
    <AIContext.Provider value={{
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      messages,
      isThinking,
      pendingAction,
      activeFilters,
      sendMessage,
      confirmPendingAction,
      cancelPendingAction,
      clearChat,
      setPageContext: setPageContextData
    }}>
      {children}
    </AIContext.Provider>
  )
}

export const useAI = () => useContext(AIContext)
