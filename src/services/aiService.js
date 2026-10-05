/**
 * AI Service for St. Francis of Assisi Church System
 * 
 * Supports:
 * 1. Google Gemini API (Gemini 1.5 Flash / Gemini 2.0 Flash)
 * 2. OpenAI API (GPT-4o / GPT-3.5)
 * 3. Smart Built-in Intent Engine (fallback when API key is not configured or offline)
 */

import { AI_TOOL_DEFINITIONS } from '../utils/aiTools'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'

/**
 * Builds the system instruction prompt with live application context
 */
export function buildSystemPrompt(context = {}) {
  const { role = 'member', user = null, profile = null, pathname = '/', activeTab = '' } = context
  const userName = profile?.full_name || user?.user_metadata?.full_name || 'Parishioner'
  const userRole = role || 'member'

  return `You are the St. Francis of Assisi Parish AI Copilot — an intelligent, polite, and action-oriented assistant embedded inside the St. Francis Church Construction & Financial Management Portal.

CURRENT APP CONTEXT:
- Active User: ${userName}
- User Role: ${userRole.toUpperCase()} (Permissions: ${
    userRole === 'admin' ? 'Full System Administrator — All tools and data access allowed' :
    userRole === 'treasurer' ? 'Parish Treasurer — Financial, contributions, pledges, and budget access allowed' :
    userRole === 'coordinator' ? 'Project Coordinator — Construction phases, BOQ, progress updates, and site logs allowed' :
    'Parish Member — Pledges, donations, personal dashboard, and construction overview allowed'
  })
- Current Page: ${pathname}
- Current Active Tab: ${activeTab || 'overview'}
- Currency: Ugandan Shillings (UGX)

YOUR CAPABILITIES & RULES:
1. You have access to real system tools to query data and perform actions on behalf of the user.
2. When a user asks a question that requires live database information or an app action, ALWAYS use the relevant tool (e.g. fetch_pledges_summary, fetch_members, navigate_to_page, create_pledge, export_report, fetch_construction_progress, fetch_financial_summary).
3. Always format monetary values cleanly in Ugandan Shillings (e.g., "UGX 2,500,000").
4. For dangerous or state-altering actions (like create_pledge), explain what you are about to do clearly.
5. Respect Role-Based Access Control (RBAC). If a member asks to access Admin tools, politely explain their role permissions.
6. Keep answers concise, clear, and structured with bullet points or formatted summaries.
7. Be warm, pastoral, and helpful in tone, suitable for a Catholic Parish community.`
}

/**
 * Convert tool definitions to Gemini Function Declarations format
 */
function getGeminiTools() {
  const functionDeclarations = Object.values(AI_TOOL_DEFINITIONS).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters
  }))

  return [{ functionDeclarations }]
}

/**
 * Convert tool definitions to OpenAI Tools format
 */
function getOpenAITools() {
  return Object.values(AI_TOOL_DEFINITIONS).map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(messages, context, tools) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

  const systemInstruction = {
    parts: [{ text: buildSystemPrompt(context) }]
  }

  // Format messages into Gemini format
  const contents = messages.map(msg => {
    const role = msg.sender === 'user' ? 'user' : 'model'
    const parts = []

    if (msg.text) {
      parts.push({ text: msg.text })
    }

    if (msg.toolCalls && msg.toolCalls.length > 0) {
      msg.toolCalls.forEach(tc => {
        parts.push({
          functionCall: {
            name: tc.name,
            args: tc.args || {}
          }
        })
      })
    }

    if (msg.toolResults && msg.toolResults.length > 0) {
      msg.toolResults.forEach(tr => {
        parts.push({
          functionResponse: {
            name: tr.name,
            response: tr.result
          }
        })
      })
    }

    return { role, parts: parts.length > 0 ? parts : [{ text: '' }] }
  })

  const body = {
    systemInstruction,
    contents,
    tools: getGeminiTools(),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API Error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from Gemini')

  const candidateParts = candidate.content?.parts || []
  let text = ''
  const toolCalls = []

  for (const part of candidateParts) {
    if (part.text) text += part.text
    if (part.functionCall) {
      toolCalls.push({
        id: 'call_' + Math.random().toString(36).substring(2, 9),
        name: part.functionCall.name,
        args: part.functionCall.args || {}
      })
    }
  }

  return { text, toolCalls }
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(messages, context, tools) {
  const url = 'https://api.openai.com/v1/chat/completions'

  const formattedMessages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text || ''
    }))
  ]

  const body = {
    model: OPENAI_MODEL,
    messages: formattedMessages,
    tools: getOpenAITools(),
    tool_choice: 'auto',
    temperature: 0.3
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API Error (${res.status}): ${errText}`)
  }

  const data = await res.json()
  const choice = data.choices?.[0]?.message
  if (!choice) throw new Error('No response from OpenAI')

  const text = choice.content || ''
  const toolCalls = (choice.tool_calls || []).map(tc => ({
    id: tc.id,
    name: tc.function.name,
    args: JSON.parse(tc.function.arguments || '{}')
  }))

  return { text, toolCalls }
}

/**
 * Fallback Intelligent Intent Parser
 * Operates offline or without API key to ensure seamless functionality.
 */
function localIntentParser(userPrompt, context) {
  const lower = userPrompt.toLowerCase().trim()
  const toolCalls = []
  let text = ''

  // 1. Navigation intents
  if (lower.includes('go to') || lower.includes('navigate') || lower.includes('open') || lower.includes('show dashboard') || lower.includes('switch to')) {
    if (lower.includes('admin')) {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'navigate_to_page',
        args: { path: '/admin', tab: lower.includes('financial') ? 'financials' : lower.includes('log') || lower.includes('audit') ? 'logs' : lower.includes('user') ? 'users' : 'overview' }
      })
    } else if (lower.includes('treasurer') || lower.includes('treasury') || lower.includes('finance') || lower.includes('financial')) {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'navigate_to_page',
        args: { path: '/treasurer', tab: lower.includes('expense') ? 'expenses' : lower.includes('pledge') ? 'pledges' : lower.includes('report') ? 'financials' : 'overview' }
      })
    } else if (lower.includes('coordinator') || lower.includes('construction') || lower.includes('project')) {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'navigate_to_page',
        args: { path: '/coordinator', tab: 'phases' }
      })
    } else if (lower.includes('overview') || lower.includes('sanctuary') || lower.includes('public')) {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'navigate_to_page',
        args: { path: '/overview' }
      })
    } else if (lower.includes('member') || lower.includes('my dashboard') || lower.includes('donation') || lower.includes('giving')) {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'navigate_to_page',
        args: { path: '/dashboard' }
      })
    }
  }

  // 2. Pledge summary intents
  if (toolCalls.length === 0 && (lower.includes('pledge') || lower.includes('pledges') || lower.includes('commitment'))) {
    if (lower.includes('create') || lower.includes('add') || lower.includes('make a pledge') || lower.includes('new pledge') || lower.includes('i want to pledge') || lower.includes('pledge ugx') || lower.includes('pledge shs')) {
      // Extract amount
      const amountMatch = lower.match(/(?:ugx|shs|shillings)?\s*([0-9,]+(?:\.[0-9]+)?)\s*(?:ugx|shs|shillings)?/i)
      let amount = 100000
      if (amountMatch && amountMatch[1]) {
        amount = Number(amountMatch[1].replace(/,/g, '')) || 100000
      }
      
      // Extract purpose
      let purpose = 'General Construction'
      if (lower.includes('roof') || lower.includes('roofing')) purpose = 'Sanctuary Roofing'
      else if (lower.includes('altar')) purpose = 'Altar Construction'
      else if (lower.includes('pew') || lower.includes('seat') || lower.includes('chair')) purpose = 'Pews & Seating'
      else if (lower.includes('tile') || lower.includes('floor')) purpose = 'Sanctuary Tiling'
      else if (lower.includes('sound') || lower.includes('speaker') || lower.includes('audio')) purpose = 'Audio & Acoustic System'

      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'create_pledge',
        args: {
          amount,
          purpose,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Pledge submitted via Parish AI Copilot'
        }
      })
    } else {
      toolCalls.push({
        id: 'call_' + Date.now(),
        name: 'fetch_pledges_summary',
        args: { status: lower.includes('fulfilled') ? 'Fulfilled' : lower.includes('active') ? 'Active' : 'all' }
      })
    }
  }

  // 3. Member / Profile search intents
  if (toolCalls.length === 0 && (lower.includes('member') || lower.includes('user') || lower.includes('profile') || lower.includes('people') || lower.includes('parishioner') || lower.includes('who is') || lower.includes('find'))) {
    const searchMatch = lower.replace(/find|search|member|members|user|users|profile|profiles|who is|show|list/gi, '').trim()
    toolCalls.push({
      id: 'call_' + Date.now(),
      name: 'fetch_members',
      args: { search: searchMatch, role: 'all', limit: 10 }
    })
  }

  // 4. Construction Progress intents
  if (toolCalls.length === 0 && (lower.includes('construction') || lower.includes('phase') || lower.includes('milestone') || lower.includes('building') || lower.includes('progress') || lower.includes('boq'))) {
    toolCalls.push({
      id: 'call_' + Date.now(),
      name: 'fetch_construction_progress',
      args: {}
    })
  }

  // 5. Financial Summary intents
  if (toolCalls.length === 0 && (lower.includes('financial') || lower.includes('balance') || lower.includes('money') || lower.includes('expense') || lower.includes('collected') || lower.includes('revenue') || lower.includes('budget') || lower.includes('statement'))) {
    toolCalls.push({
      id: 'call_' + Date.now(),
      name: 'fetch_financial_summary',
      args: {}
    })
  }

  // 6. Report Export intents
  if (toolCalls.length === 0 && (lower.includes('export') || lower.includes('download') || lower.includes('generate report') || lower.includes('csv') || lower.includes('pdf'))) {
    let reportType = 'financial'
    if (lower.includes('pledge')) reportType = 'pledges'
    else if (lower.includes('expense')) reportType = 'expenses'
    else if (lower.includes('contribution') || lower.includes('donation')) reportType = 'contributions'
    else if (lower.includes('construction')) reportType = 'construction'

    toolCalls.push({
      id: 'call_' + Date.now(),
      name: 'export_report',
      args: { reportType, format: 'csv' }
    })
  }

  // 7. Filter dashboard intents
  if (toolCalls.length === 0 && (lower.includes('filter') || lower.includes('search for') || lower.includes('sort by'))) {
    toolCalls.push({
      id: 'call_' + Date.now(),
      name: 'filter_dashboard',
      args: { searchTerm: lower.replace(/filter|search for|sort by/gi, '').trim() }
    })
  }

  if (toolCalls.length === 0) {
    text = `Pax Christi! I am your St. Francis Parish AI Copilot. I can assist you with:
• **Pledges & Contributions**: Check pledges summary, or record a new pledge.
• **Construction Tracking**: View phase progress, milestones, and contractor details.
• **Financial Reports**: Get revenue vs expenses summary, or export CSV statements.
• **Parish Directory**: Search registered members and roles.
• **Fast Navigation**: Jump directly to Admin, Treasurer, Coordinator, or Member portals.

How may I assist your parish stewardship today?`
  }

  return { text, toolCalls }
}

/**
 * Main function to process user message and determine AI responses / tool calls
 */
export async function processAIMessage(messages, context) {
  // If Gemini API Key is present, use Google Gemini
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'undefined') {
    try {
      return await callGeminiAPI(messages, context, AI_TOOL_DEFINITIONS)
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local intent parser:', err.message)
    }
  }

  // If OpenAI API Key is present, use OpenAI
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'undefined') {
    try {
      return await callOpenAIAPI(messages, context, AI_TOOL_DEFINITIONS)
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to local intent parser:', err.message)
    }
  }

  // Use built-in Local Intent Parser
  const latestMessage = messages[messages.length - 1]
  const prompt = latestMessage?.text || ''
  return localIntentParser(prompt, context)
}
