import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from '../useDataHelpers'
import { logAudit } from './useAudit'

export const usePledges = () => {
  return useQuery({
    queryKey: ['pledges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pledges')
        .select('*, profiles(full_name)')
      if (error) {
        toast.error(`Pledges load error: ${error.message}`)
        throw error
      }
      return (data || []).map(item => {
        const camel = snakeToCamel(item)
        camel.userName = item.profiles?.full_name || camel.userName || 'Unknown'
        delete camel.profiles
        return camel
      })
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreatePledge = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ pledge, user }) => {
      const snakePayload = camelToSnake(pledge)
      const { data, error } = await supabase
        .from('pledges')
        .insert([snakePayload])
        .select('*, profiles(full_name)')
      if (error) throw error

      const created = snakeToCamel(data[0])
      created.userName = data[0].profiles?.full_name || created.userName || 'Unknown'

      await logAudit(
        user.id,
        user.user_metadata?.full_name || 'Member',
        'member',
        'Create Pledge',
        `Pledged UGX ${Number(pledge.amount).toLocaleString()} for ${pledge.purpose}`
      )
      return created
    },
    onMutate: async ({ pledge, user }) => {
      await queryClient.cancelQueries({ queryKey: ['pledges'] })
      const previousPledges = queryClient.getQueryData(['pledges'])

      const optimisticPledge = {
        ...pledge,
        id: 'temp-' + Date.now(),
        status: 'Active',
        userName: user?.user_metadata?.full_name || 'Member',
        createdAt: new Date().toISOString()
      }

      queryClient.setQueryData(['pledges'], (old = []) => [optimisticPledge, ...old])
      return { previousPledges }
    },
    onError: (err, variables, context) => {
      toast.error(`Pledge creation failed: ${err.message}`)
      if (context?.previousPledges) {
        queryClient.setQueryData(['pledges'], context.previousPledges)
      }
    },
    onSuccess: () => {
      toast.success("Pledge recorded successfully!")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    }
  })
}

export const useFulfillPledge = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, fulfilledAmount, user }) => {
      const { data, error } = await supabase
        .from('pledges')
        .update({
          fulfilled_amount: fulfilledAmount,
          status: 'Fulfilled'
        })
        .eq('id', id)
        .select()
      if (error) throw error

      if (user) {
        await logAudit(
          user.id,
          user.user_metadata?.full_name || 'Member',
          'member',
          'Fulfill Pledge',
          `Fulfilled pledge ID ${id}`
        )
      }
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Pledge marked as fulfilled!")
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
    },
    onError: (err) => {
      toast.error(`Pledge fulfillment error: ${err.message}`)
    }
  })
}
