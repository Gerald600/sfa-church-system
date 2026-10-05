/**
 * Action Registry & Tool Handlers for St. Francis Parish AI Copilot
 */

import { supabase } from '../supabaseClient'
import { toast } from 'react-hot-toast'
import { logAudit } from '../hooks/data/useAudit'

/**
 * Format currency helper
 */
export const formatUGX = (amount) => {
  return `UGX ${Number(amount || 0).toLocaleString()}`
}

/**
 * Tool Definitions following JSON Schema standard for Gemini and OpenAI Function Calling
 */
export const AI_TOOL_DEFINITIONS = {
  navigate_to_page: {
    name: 'navigate_to_page',
    description: 'Navigate to a specific page or dashboard tab in the parish management system. Enforces RBAC permissions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        path: {
          type: 'STRING',
          description: 'The URL route to navigate to: "/overview", "/admin", "/treasurer", "/coordinator", "/dashboard", "/login".'
        },
        tab: {
          type: 'STRING',
          description: 'Optional dashboard tab to activate (e.g., "financials", "logs", "users", "phases", "pledges", "expenses", "contributions", "reports").'
        }
      },
      required: ['path']
    }
  },

  fetch_members: {
    name: 'fetch_members',
    description: 'Search or list parish members from the directory by name, email, phone, or assigned role.',
    parameters: {
      type: 'OBJECT',
      properties: {
        search: {
          type: 'STRING',
          description: 'Search keyword matching member full name, email, or phone number.'
        },
        role: {
          type: 'STRING',
          description: 'Filter by role: "all", "member", "treasurer", "coordinator", "admin".'
        },
        limit: {
          type: 'INTEGER',
          description: 'Maximum number of member records to return (default 10).'
        }
      }
    }
  },

  fetch_pledges_summary: {
    name: 'fetch_pledges_summary',
    description: 'Retrieve statistical summary and breakdown of parishioner pledges, total commitments, paid amounts, and outstanding balance.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Filter by status: "all", "Active", "Fulfilled".'
        },
        purpose: {
          type: 'STRING',
          description: 'Optional filter by pledge purpose (e.g. "Roofing", "Altar", "Pews").'
        }
      }
    }
  },

  create_pledge: {
    name: 'create_pledge',
    description: 'Submit a new parishioner pledge commitment to the church construction fund. Requires explicit confirmation.',
    requiresConfirmation: true,
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: {
          type: 'NUMBER',
          description: 'The amount in Ugandan Shillings (UGX) to pledge (e.g. 500000).'
        },
        purpose: {
          type: 'STRING',
          description: 'The purpose of the pledge (e.g. "Sanctuary Roofing", "Altar Construction", "Pews & Seating", "Sanctuary Tiling", "General Construction").'
        },
        deadline: {
          type: 'STRING',
          description: 'Expected fulfillment date in YYYY-MM-DD format.'
        },
        notes: {
          type: 'STRING',
          description: 'Optional notes or intentions for this pledge.'
        }
      },
      required: ['amount', 'purpose']
    }
  },

  fetch_construction_progress: {
    name: 'fetch_construction_progress',
    description: 'Retrieve current status, budget, amount spent, completion percentages, and milestones across all cathedral construction phases.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },

  fetch_financial_summary: {
    name: 'fetch_financial_summary',
    description: 'Retrieve executive financial health metrics, total collections, approved expenses, pending expenditures, and net liquidity.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },

  export_report: {
    name: 'export_report',
    description: 'Generate and trigger a downloadable CSV statement or report for financial records, contributions, expenses, or pledges.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reportType: {
          type: 'STRING',
          description: 'Type of report: "financial", "contributions", "pledges", "expenses", "construction".'
        },
        format: {
          type: 'STRING',
          description: 'Export format: "csv" or "pdf" (default "csv").'
        }
      },
      required: ['reportType']
    }
  },

  filter_dashboard: {
    name: 'filter_dashboard',
    description: 'Apply live search or category filtering to the active dashboard view.',
    parameters: {
      type: 'OBJECT',
      properties: {
        searchTerm: {
          type: 'STRING',
          description: 'Search string to filter items on current dashboard view.'
        },
        status: {
          type: 'STRING',
          description: 'Filter by status (e.g., "Approved", "Pending", "Active", "Fulfilled", "Completed").'
        }
      }
    }
  }
}

/**
 * Role-Based Access Control Rule check
 */
export function validateToolRBAC(toolName, userRole) {
  const role = (userRole || 'member').toLowerCase()

  const adminOnlyTools = []
  const privilegedTools = ['fetch_members']

  if (toolName === 'navigate_to_page') {
    return true // Route-level RBAC is checked inside the handler
  }

  if (adminOnlyTools.includes(toolName) && role !== 'admin') {
    return {
      allowed: false,
      reason: `Action '${toolName}' requires System Administrator privileges. Current role: ${role}.`
    }
  }

  if (privilegedTools.includes(toolName) && !['admin', 'treasurer', 'coordinator'].includes(role)) {
    return {
      allowed: false,
      reason: `Access to parish directory records is restricted to Parish Leadership (Admin, Treasurer, Coordinator).`
    }
  }

  return { allowed: true }
}

/**
 * Tool Execution Router
 */
export async function executeAITool(toolName, args = {}, context = {}, helpers = {}) {
  const { role = 'member', user = null, profile = null } = context
  const { navigate = null, setActiveTab = null, setFilters = null } = helpers

  // 1. Check RBAC
  const rbacCheck = validateToolRBAC(toolName, role)
  if (!rbacCheck.allowed) {
    return {
      success: false,
      error: rbacCheck.reason,
      summary: `⛔ ${rbacCheck.reason}`
    }
  }

  try {
    switch (toolName) {
      // -------------------------------------------------------------
      // 1. NAVIGATE TO PAGE
      // -------------------------------------------------------------
      case 'navigate_to_page': {
        const { path = '/overview', tab } = args
        const targetPath = path.toLowerCase()

        // Check path permissions
        if (targetPath.startsWith('/admin') && role !== 'admin') {
          return {
            success: false,
            error: 'Permission Denied: Administrator role required to access the Admin Dashboard.',
            summary: `⛔ You do not have permission to access the Administrator Portal (${path}).`
          }
        }
        if (targetPath.startsWith('/treasurer') && !['admin', 'treasurer'].includes(role)) {
          return {
            success: false,
            error: 'Permission Denied: Treasurer role required to access the Treasurer Dashboard.',
            summary: `⛔ Access to Treasury Portal is restricted to the Parish Treasurer.`
          }
        }
        if (targetPath.startsWith('/coordinator') && !['admin', 'coordinator'].includes(role)) {
          return {
            success: false,
            error: 'Permission Denied: Coordinator role required to access the Coordinator Dashboard.',
            summary: `⛔ Access to Project Coordinator Portal is restricted to Project Coordinators.`
          }
        }

        if (navigate) {
          navigate(path)
        }

        if (tab && setActiveTab) {
          setTimeout(() => setActiveTab(tab), 150)
        }

        const tabName = tab ? ` (${tab} tab)` : ''
        return {
          success: true,
          path,
          tab,
          summary: `🧭 Navigated to **${path}**${tabName}.`
        }
      }

      // -------------------------------------------------------------
      // 2. FETCH MEMBERS
      // -------------------------------------------------------------
      case 'fetch_members': {
        const { search = '', role: roleFilter = 'all', limit = 10 } = args
        let query = supabase.from('profiles').select('id, full_name, email, phone, role, created_at').order('created_at', { ascending: false }).limit(limit)

        if (roleFilter && roleFilter !== 'all') {
          query = query.eq('role', roleFilter)
        }

        if (search.trim()) {
          query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }

        const { data, error } = await query
        if (error) throw error

        const members = data || []
        return {
          success: true,
          count: members.length,
          members,
          summary: `👥 Found **${members.length}** parishioner profile(s)${search ? ` matching "${search}"` : ''}.`
        }
      }

      // -------------------------------------------------------------
      // 3. FETCH PLEDGES SUMMARY
      // -------------------------------------------------------------
      case 'fetch_pledges_summary': {
        const { status = 'all', purpose = '' } = args
        let query = supabase.from('pledges').select('*, profiles(full_name)')

        if (status && status !== 'all') {
          query = query.eq('status', status)
        }

        const { data, error } = await query
        if (error) throw error

        let pledges = data || []
        if (purpose.trim()) {
          pledges = pledges.filter(p => (p.purpose || '').toLowerCase().includes(purpose.toLowerCase()))
        }

        const totalPledged = pledges.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
        const totalFulfilled = pledges.reduce((acc, p) => acc + (Number(p.fulfilled_amount) || 0), 0)
        const totalOutstanding = Math.max(0, totalPledged - totalFulfilled)
        const activeCount = pledges.filter(p => p.status === 'Active').length
        const fulfilledCount = pledges.filter(p => p.status === 'Fulfilled').length
        const fulfillmentRate = totalPledged > 0 ? Math.round((totalFulfilled / totalPledged) * 100) : 0

        return {
          success: true,
          totalPledgesCount: pledges.length,
          activeCount,
          fulfilledCount,
          totalPledgedUGX: totalPledged,
          totalFulfilledUGX: totalFulfilled,
          totalOutstandingUGX: totalOutstanding,
          fulfillmentRatePercentage: fulfillmentRate,
          recentPledges: pledges.slice(0, 5).map(p => ({
            id: p.id,
            userName: p.profiles?.full_name || p.user_name || 'Member',
            amount: p.amount,
            fulfilledAmount: p.fulfilled_amount || 0,
            purpose: p.purpose,
            status: p.status,
            deadline: p.deadline
          })),
          summary: `📊 **Pledges Overview**:
• **Total Committed:** ${formatUGX(totalPledged)} (${pledges.length} pledges)
• **Total Fulfilled:** ${formatUGX(totalFulfilled)} (${fulfillmentRate}%)
• **Outstanding Balance:** ${formatUGX(totalOutstanding)}
• **Active Pledges:** ${activeCount} active, ${fulfilledCount} fulfilled.`
        }
      }

      // -------------------------------------------------------------
      // 4. CREATE PLEDGE
      // -------------------------------------------------------------
      case 'create_pledge': {
        const { amount, purpose = 'General Construction', deadline, notes = '' } = args
        if (!amount || Number(amount) <= 0) {
          return { success: false, error: 'Valid pledge amount in UGX is required.' }
        }

        const pledgeDeadline = deadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const userId = user?.id || null
        const memberName = profile?.full_name || user?.user_metadata?.full_name || 'Parishioner'

        const payload = {
          user_id: userId,
          amount: Number(amount),
          purpose: purpose,
          deadline: pledgeDeadline,
          status: 'Active',
          fulfilled_amount: 0,
          notes: notes
        }

        const { data, error } = await supabase.from('pledges').insert([payload]).select()
        if (error) throw error

        // Audit the action
        await logAudit(
          userId,
          memberName,
          role,
          'Create Pledge via Copilot',
          `Created pledge commitment of ${formatUGX(amount)} for ${purpose} (Due: ${pledgeDeadline})`
        )

        toast.success(`Pledge of ${formatUGX(amount)} recorded successfully!`)

        return {
          success: true,
          pledge: data[0],
          summary: `🎉 **Pledge Recorded Successfully!**
• **Contributor:** ${memberName}
• **Amount:** ${formatUGX(amount)}
• **Purpose:** ${purpose}
• **Due Date:** ${pledgeDeadline}
• **Status:** Active`
        }
      }

      // -------------------------------------------------------------
      // 5. FETCH CONSTRUCTION PROGRESS
      // -------------------------------------------------------------
      case 'fetch_construction_progress': {
        const { data: phases, error } = await supabase
          .from('construction_phases')
          .select('*')
          .order('id', { ascending: true })

        if (error) throw error

        const phaseList = phases || []
        const totalBudget = phaseList.reduce((acc, p) => acc + (Number(p.budget) || 0), 0)
        const totalCollected = phaseList.reduce((acc, p) => acc + (Number(p.amount_collected) || 0), 0)
        const totalSpent = phaseList.reduce((acc, p) => acc + (Number(p.amount_spent) || 0), 0)
        const avgProgress = phaseList.length > 0 
          ? Math.round(phaseList.reduce((acc, p) => acc + (Number(p.progress) || 0), 0) / phaseList.length)
          : 0

        return {
          success: true,
          phaseCount: phaseList.length,
          overallProgressPercentage: avgProgress,
          totalBudgetUGX: totalBudget,
          totalCollectedUGX: totalCollected,
          totalSpentUGX: totalSpent,
          phases: phaseList.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            progress: p.progress,
            budget: p.budget,
            amountSpent: p.amount_spent,
            contractor: p.contractor_name
          })),
          summary: `🏗️ **Cathedral Construction Status**:
• **Overall Project Completion:** **${avgProgress}%**
• **Total Estimated Budget:** ${formatUGX(totalBudget)}
• **Funds Raised:** ${formatUGX(totalCollected)}
• **Funds Expended:** ${formatUGX(totalSpent)}
• **Active Phases:** ${phaseList.map(p => `${p.name} (${p.progress}% - ${p.status})`).join(', ')}.`
        }
      }

      // -------------------------------------------------------------
      // 6. FETCH FINANCIAL SUMMARY
      // -------------------------------------------------------------
      case 'fetch_financial_summary': {
        const [contribRes, expenseRes] = await Promise.all([
          supabase.from('contributions').select('amount, status, purpose_type'),
          supabase.from('expenses').select('amount, status, description')
        ])

        const contributions = contribRes.data || []
        const expenses = expenseRes.data || []

        const approvedContributions = contributions.filter(c => c.status === 'Approved')
        const totalRevenue = approvedContributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

        const approvedExpenses = expenses.filter(e => e.status === 'Approved')
        const totalExpenses = approvedExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

        const pendingExpenses = expenses.filter(e => e.status === 'Pending_Approval')
        const totalPendingExpenses = pendingExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

        const netBalance = totalRevenue - totalExpenses

        return {
          success: true,
          totalRevenueUGX: totalRevenue,
          totalExpensesUGX: totalExpenses,
          totalPendingExpensesUGX: totalPendingExpenses,
          netLiquidityUGX: netBalance,
          approvedContributionsCount: approvedContributions.length,
          approvedExpensesCount: approvedExpenses.length,
          summary: `💰 **Executive Financial Summary**:
• **Total Certified Collections:** ${formatUGX(totalRevenue)} (${approvedContributions.length} receipts)
• **Total Approved Expenditures:** ${formatUGX(totalExpenses)} (${approvedExpenses.length} disbursements)
• **Pending Approval Invoices:** ${formatUGX(totalPendingExpenses)}
• **Net Parish Liquidity Balance:** **${formatUGX(netBalance)}**`
        }
      }

      // -------------------------------------------------------------
      // 7. EXPORT REPORT
      // -------------------------------------------------------------
      case 'export_report': {
        const { reportType = 'financial' } = args
        let csvContent = ''
        let fileName = ''

        if (reportType === 'pledges') {
          const { data } = await supabase.from('pledges').select('*, profiles(full_name)')
          const rows = (data || []).map(p => [
            p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
            p.profiles?.full_name || p.user_name || 'Member',
            p.amount || 0,
            p.fulfilled_amount || 0,
            p.purpose || '',
            p.deadline || '',
            p.status || ''
          ])
          const headers = ['Date', 'Contributor', 'Pledged (UGX)', 'Fulfilled (UGX)', 'Purpose', 'Deadline', 'Status']
          csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
          fileName = `SFA_Pledges_Statement_${new Date().toISOString().slice(0, 10)}.csv`
        } else if (reportType === 'expenses') {
          const { data } = await supabase.from('expenses').select('*')
          const rows = (data || []).map(e => [
            e.date || e.created_at || '',
            e.description || '',
            e.amount || 0,
            e.status || '',
            e.submitted_by || '',
            e.approved_by || ''
          ])
          const headers = ['Date', 'Description', 'Amount (UGX)', 'Status', 'Submitted By', 'Approved By']
          csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
          fileName = `SFA_Expenditures_Report_${new Date().toISOString().slice(0, 10)}.csv`
        } else {
          const { data } = await supabase.from('contributions').select('*, profiles(full_name)')
          const rows = (data || []).map(c => [
            c.date || c.created_at || '',
            c.profiles?.full_name || 'Parishioner',
            c.amount || 0,
            c.purpose_name || c.purpose_type || '',
            c.method || '',
            c.reference || '',
            c.status || ''
          ])
          const headers = ['Date', 'Contributor', 'Amount (UGX)', 'Purpose', 'Payment Method', 'Reference', 'Status']
          csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n')
          fileName = `SFA_Contributions_Statement_${new Date().toISOString().slice(0, 10)}.csv`
        }

        // Trigger CSV download in browser
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        toast.success(`Exported ${reportType} statement successfully!`)

        return {
          success: true,
          fileName,
          summary: `📄 **Report Export Complete**: Downloaded **${fileName}**.`
        }
      }

      // -------------------------------------------------------------
      // 8. FILTER DASHBOARD
      // -------------------------------------------------------------
      case 'filter_dashboard': {
        const { searchTerm = '', status = '' } = args
        
        // Dispatch custom DOM event for dashboard components
        window.dispatchEvent(new CustomEvent('sfa-ai-filter', {
          detail: { searchTerm, status }
        }))

        if (setFilters) {
          setFilters({ searchTerm, status })
        }

        return {
          success: true,
          searchTerm,
          status,
          summary: `🔍 Applied filter: ${searchTerm ? `Search: "${searchTerm}" ` : ''}${status ? `Status: "${status}"` : ''}`
        }
      }

      default:
        return {
          success: false,
          error: `Unknown tool '${toolName}'.`,
          summary: `⚠️ Tool '${toolName}' is not recognized.`
        }
    }
  } catch (err) {
    console.error(`AI Tool '${toolName}' Execution Exception:`, err)
    return {
      success: false,
      error: err.message,
      summary: `❌ Failed to execute **${toolName}**: ${err.message}`
    }
  }
}
