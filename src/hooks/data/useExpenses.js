import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from '../useDataHelpers'
import { logAudit } from './useAudit'

export const useExpenses = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, construction_phases(name)')
      if (error) {
        toast.error(`Expenses load error: ${error.message}`)
        throw error
      }
      return (data || []).map(item => {
        const camel = snakeToCamel(item)
        camel.phaseName = item.construction_phases?.name || camel.phaseName || 'Unknown'
        delete camel.constructionPhases
        return camel
      })
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ expense, user }) => {
      const snakePayload = camelToSnake(expense)
      const { data, error } = await supabase
        .from('expenses')
        .insert([snakePayload])
        .select('*, construction_phases(name)')
      if (error) throw error
      
      const created = snakeToCamel(data[0])
      created.phaseName = data[0].construction_phases?.name || created.phaseName || 'Unknown'

      await logAudit(
        user.id,
        user.user_metadata?.full_name || 'Treasurer',
        'treasurer',
        'Record Expense',
        `Created expense record of UGX ${Number(expense.amount).toLocaleString()} for ${expense.description}`
      )
      return created
    },
    onMutate: async ({ expense }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      const previousExpenses = queryClient.getQueryData(['expenses'])

      const optimisticItem = {
        ...expense,
        id: 'temp-' + Date.now(),
        status: 'Pending',
        createdAt: new Date().toISOString()
      }

      queryClient.setQueryData(['expenses'], (old = []) => [optimisticItem, ...old])
      return { previousExpenses }
    },
    onError: (err, variables, context) => {
      toast.error(`Expense record failed: ${err.message}`)
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses'], context.previousExpenses)
      }
    },
    onSuccess: () => {
      toast.success("Expense logged successfully!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}

export const useApproveExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({ status: 'Approved' })
        .eq('id', id)
        .select()
      if (error) throw error
      
      await logAudit(
        user.id,
        user.user_metadata?.full_name || 'Admin',
        'admin',
        'Approve Expense',
        `Approved expense ID ${id}`
      )
      return snakeToCamel(data[0])
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      const previousExpenses = queryClient.getQueryData(['expenses'])

      queryClient.setQueryData(['expenses'], (old = []) =>
        old.map(item => item.id === id ? { ...item, status: 'Approved' } : item)
      )
      return { previousExpenses }
    },
    onError: (err, variables, context) => {
      toast.error(`Expense approval failed: ${err.message}`)
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses'], context.previousExpenses)
      }
    },
    onSuccess: () => {
      toast.success("Expense approved!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}

export const useRejectExpense = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, rejectionReason, user }) => {
      const { data, error } = await supabase
        .from('expenses')
        .update({ status: 'Rejected', rejection_reason: rejectionReason })
        .eq('id', id)
        .select()
      if (error) throw error

      await logAudit(
        user.id,
        user.user_metadata?.full_name || 'Admin',
        'admin',
        'Reject Expense',
        `Rejected expense ID ${id}: ${rejectionReason}`
      )
      return snakeToCamel(data[0])
    },
    onMutate: async ({ id, rejectionReason }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] })
      const previousExpenses = queryClient.getQueryData(['expenses'])

      queryClient.setQueryData(['expenses'], (old = []) =>
        old.map(item => item.id === id ? { ...item, status: 'Rejected', rejectionReason } : item)
      )
      return { previousExpenses }
    },
    onError: (err, variables, context) => {
      toast.error(`Expense rejection failed: ${err.message}`)
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses'], context.previousExpenses)
      }
    },
    onSuccess: () => {
      toast.success("Expense rejected")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}
