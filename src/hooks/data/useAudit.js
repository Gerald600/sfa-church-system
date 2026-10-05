import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'

// Helper to log administrative audit log
export const logAudit = async (userId, userName, role, action, details) => {
  try {
    await supabase.from('audit_logs').insert([{
      user_id: userId,
      action_type: action,
      description: JSON.stringify({
        userName: userName || 'System',
        role: role || 'system',
        details
      })
    }])
  } catch (err) {
    console.warn('Failed to create audit log:', err)
  }
}

export const useAuditLogs = () => {
  return useQuery({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) {
        toast.error(`Audit logs load error: ${error.message}`)
        throw error
      }
      return (data || []).map(log => {
        let userName = 'System'
        let role = 'system'
        let details = log.description || ''
        try {
          const parsed = JSON.parse(log.description)
          if (parsed && typeof parsed === 'object') {
            userName = parsed.userName || 'System'
            role = parsed.role || 'system'
            details = parsed.details || log.description || ''
          }
        } catch {
          // description is plain text, not JSON — use as-is
        }
        return {
          id: log.id,
          userId: log.user_id,
          action: log.action_type,
          userName,
          role,
          details,
          date: log.created_at ? new Date(log.created_at).toLocaleString() : ''
        }
      })
    },
    staleTime: 1000 * 60 * 5,
  })
}
