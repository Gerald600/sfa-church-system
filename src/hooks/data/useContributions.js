import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from '../useDataHelpers'
import { logAudit } from './useAudit'

export const useContributions = () => {
  return useQuery({
    queryKey: ['contributions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*, profiles(full_name)')
      if (error) {
        toast.error(`Contributions load error: ${error.message}`)
        throw error
      }
      const processed = (data || []).map(item => {
        const camel = snakeToCamel(item)
        camel.userName = item.profiles?.full_name || camel.userName || 'Unknown'
        delete camel.profiles
        return camel
      })
      processed.forEach(item => {
        if (!item.date && (item.createdAt || item.created_at)) {
          item.date = item.createdAt || item.created_at
        }
      })
      processed.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      return processed
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreateContribution = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ contribution, user }) => {
      const { userName, ...contribFields } = contribution
      const snakePayload = camelToSnake(contribFields)
      const { data, error } = await supabase
        .from('contributions')
        .insert([snakePayload])
        .select()
      if (error) throw error
      
      await logAudit(
        user.id,
        userName || 'Member',
        'member',
        'Submit Contribution',
        `Submitted pending contribution of UGX ${Number(contribution.amount).toLocaleString()} for ${contribution.purposeName}`
      )
      
      return snakeToCamel(data[0])
    },
    onMutate: async ({ contribution, user }) => {
      await queryClient.cancelQueries({ queryKey: ['contributions'] })
      const previousContributions = queryClient.getQueryData(['contributions'])

      const optimisticItem = {
        ...contribution,
        id: 'temp-' + Date.now(),
        status: 'Pending',
        userName: contribution.userName || user?.user_metadata?.full_name || 'Member',
        date: new Date().toISOString()
      }

      queryClient.setQueryData(['contributions'], (old = []) => [optimisticItem, ...old])
      return { previousContributions }
    },
    onError: (err, variables, context) => {
      toast.error(`Contribution creation failed: ${err.message}`)
      if (context?.previousContributions) {
        queryClient.setQueryData(['contributions'], context.previousContributions)
      }
    },
    onSuccess: () => {
      toast.success("Contribution submitted successfully! Awaiting verification.")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}

export const useUpdateContributionStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, rejectionReason, treasurerUser }) => {
      const payload = { status }
      if (rejectionReason) payload.rejection_reason = rejectionReason

      const { data, error } = await supabase
        .from('contributions')
        .update(payload)
        .eq('id', id)
        .select('*, profiles(full_name)')
      
      if (error) throw error

      const updatedContrib = snakeToCamel(data[0])
      updatedContrib.userName = data[0].profiles?.full_name || updatedContrib.userName || 'Unknown'
      delete updatedContrib.profiles

      // If approved, add amount to phase or event target
      if (status === 'Approved') {
        if (updatedContrib.purposeType === 'phase') {
          const { data: phaseData } = await supabase
            .from('construction_phases')
            .select('current_raised')
            .eq('name', updatedContrib.purposeName)
            .single()
          
          if (phaseData) {
            const newRaised = (phaseData.current_raised || 0) + updatedContrib.amount
            await supabase
              .from('construction_phases')
              .update({ current_raised: newRaised })
              .eq('name', updatedContrib.purposeName)
          }
        } else if (updatedContrib.purposeType === 'event') {
          const { data: eventData } = await supabase
            .from('fundraising_events')
            .select('current_raised')
            .eq('name', updatedContrib.purposeName)
            .single()

          if (eventData) {
            const newRaised = (eventData.current_raised || 0) + updatedContrib.amount
            await supabase
              .from('fundraising_events')
              .update({ current_raised: newRaised })
              .eq('name', updatedContrib.purposeName)
          }
        }
      }

      await logAudit(
        treasurerUser.id,
        treasurerUser.user_metadata?.full_name || 'Treasurer',
        'treasurer',
        `${status} Contribution`,
        `${status} contribution reference ${updatedContrib.reference} of UGX ${Number(updatedContrib.amount).toLocaleString()}`
      )

      return updatedContrib
    },
    onMutate: async ({ id, status, rejectionReason }) => {
      await queryClient.cancelQueries({ queryKey: ['contributions'] })
      const previousContributions = queryClient.getQueryData(['contributions'])

      queryClient.setQueryData(['contributions'], (old = []) =>
        old.map(item =>
          item.id === id
            ? { ...item, status, rejectionReason: rejectionReason || item.rejectionReason }
            : item
        )
      )
      return { previousContributions }
    },
    onError: (err, variables, context) => {
      toast.error(`Status update failed: ${err.message}`)
      if (context?.previousContributions) {
        queryClient.setQueryData(['contributions'], context.previousContributions)
      }
    },
    onSuccess: (data, { status }) => {
      toast.success(`Contribution ${(status || 'updated').toLowerCase()} successfully!`)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['phases'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}

export const useRecordManualContribution = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ manualContribution, treasurerUser }) => {
      const receiptId = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
      const referenceCode = manualContribution.reference || `MAN-${Date.now().toString().slice(-6)}`
      
      const payload = {
        user_id: manualContribution.userId || null,
        user_name: manualContribution.userName || 'Walk-in Parishioner',
        amount: Number(manualContribution.amount),
        purpose_type: manualContribution.purposeType || 'phase',
        purpose_name: manualContribution.purposeName || 'Building Construction Fund',
        method: manualContribution.method || 'Cash',
        reference: referenceCode,
        receipt_id: receiptId,
        status: 'Approved',
        entry_source: 'Manual Treasurer Entry',
        date: manualContribution.date || new Date().toISOString().split('T')[0],
        notes: manualContribution.notes || 'Recorded manually by Church Treasurer',
        approved_by: treasurerUser?.user_metadata?.full_name || treasurerUser?.email || 'Church Treasurer'
      }

      const { data, error } = await supabase
        .from('contributions')
        .insert([payload])
        .select()

      if (error) throw error

      const created = snakeToCamel(data[0])

      if (treasurerUser) {
        await logAudit(
          treasurerUser.id,
          treasurerUser.user_metadata?.full_name || 'Treasurer',
          'treasurer',
          'Record Manual Contribution',
          `Recorded manual ${payload.method} contribution of UGX ${payload.amount.toLocaleString()} for ${payload.user_name} (Receipt: ${receiptId})`
        )
      }

      return created
    },
    onSuccess: (data) => {
      toast.success(`Manual contribution recorded successfully! Receipt: ${data.receiptId || data.reference}`)
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['phases'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Failed to record manual contribution: ${err.message}`)
    }
  })
}
