import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from '../useDataHelpers'
import { logAudit } from './useAudit'

/**
 * Hook to fetch active, non-expired advertisements for members and visitors.
 * @param {string} placement - 'dashboard', 'announcements', or 'all'
 */
export const useActiveAds = (placement = 'all') => {
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['advertisements', 'active', placement, today],
    queryFn: async () => {
      let query = supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('created_at', { ascending: false })

      if (placement && placement !== 'all') {
        query = query.or(`placement.eq.${placement},placement.eq.all`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Active ads load error:', error.message)
        return []
      }

      return (snakeToCamel(data) || []).map(ad => ({
        ...ad,
        isExpired: false
      }))
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
  })
}

/**
 * Hook for Admins to fetch all advertisements (active, inactive, expired, future).
 */
export const useAllAds = () => {
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['advertisements', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error(`Advertisements load error: ${error.message}`)
        throw error
      }

      return (snakeToCamel(data) || []).map(ad => {
        const isExpired = ad.endDate ? ad.endDate < today : false
        const isUpcoming = ad.startDate ? ad.startDate > today : false
        let statusBadge = 'Active'
        if (!ad.isActive) statusBadge = 'Inactive'
        else if (isExpired) statusBadge = 'Expired'
        else if (isUpcoming) statusBadge = 'Scheduled'

        return {
          ...ad,
          isExpired,
          isUpcoming,
          statusBadge
        }
      })
    },
    staleTime: 1000 * 60 * 3,
  })
}

/**
 * Hook to create a new advertisement (Admin only).
 */
export const useCreateAd = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ad, user, profile }) => {
      const snakePayload = camelToSnake(ad)
      // Ensure defaults
      if (!snakePayload.ad_type) snakePayload.ad_type = 'banner'
      if (!snakePayload.placement) snakePayload.placement = 'dashboard'
      if (snakePayload.is_active === undefined) snakePayload.is_active = true

      const { data, error } = await supabase
        .from('advertisements')
        .insert([snakePayload])
        .select()

      if (error) throw error

      await logAudit(
        user?.id,
        profile?.full_name || user?.user_metadata?.full_name || 'Admin',
        'admin',
        'Create Advertisement',
        `Created ${ad.adType || 'banner'} ad for "${ad.companyName}" (${ad.title})`
      )

      return snakeToCamel(data[0])
    },
    onSuccess: (newAd) => {
      toast.success(`Advertisement for "${newAd.companyName}" created!`)
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Ad creation failed: ${err.message}`)
    }
  })
}

/**
 * Hook to update an existing advertisement (Admin only).
 */
export const useUpdateAd = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates, user, profile }) => {
      const snakePayload = camelToSnake(updates)
      const { data, error } = await supabase
        .from('advertisements')
        .update(snakePayload)
        .eq('id', id)
        .select()

      if (error) throw error

      await logAudit(
        user?.id,
        profile?.full_name || user?.user_metadata?.full_name || 'Admin',
        'admin',
        'Update Advertisement',
        `Updated advertisement ID ${id}`
      )

      return snakeToCamel(data[0])
    },
    onSuccess: (updatedAd) => {
      toast.success(`Advertisement "${updatedAd.title}" updated!`)
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Ad update failed: ${err.message}`)
    }
  })
}

/**
 * Hook to delete an advertisement (Admin only).
 */
export const useDeleteAd = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title, user, profile }) => {
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', id)

      if (error) throw error

      await logAudit(
        user?.id,
        profile?.full_name || user?.user_metadata?.full_name || 'Admin',
        'admin',
        'Delete Advertisement',
        `Deleted advertisement "${title || id}"`
      )

      return id
    },
    onSuccess: () => {
      toast.success('Advertisement deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Failed to delete ad: ${err.message}`)
    }
  })
}

/**
 * Hook to toggle advertisement active status (Admin only).
 */
export const useToggleAdStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, currentStatus, title, user, profile }) => {
      const newStatus = !currentStatus
      const { data, error } = await supabase
        .from('advertisements')
        .update({ is_active: newStatus })
        .eq('id', id)
        .select()

      if (error) throw error

      await logAudit(
        user?.id,
        profile?.full_name || user?.user_metadata?.full_name || 'Admin',
        'admin',
        'Toggle Advertisement Status',
        `${newStatus ? 'Activated' : 'Deactivated'} ad "${title || id}"`
      )

      return snakeToCamel(data[0])
    },
    onSuccess: (ad) => {
      toast.success(`Ad is now ${ad.isActive ? 'Active' : 'Inactive'}`)
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Status change failed: ${err.message}`)
    }
  })
}

/**
 * Unified helper hook providing active ads and admin actions
 */
export const useAds = (placement = 'all') => {
  const activeQuery = useActiveAds(placement)
  const allQuery = useAllAds()
  const createMutation = useCreateAd()
  const updateMutation = useUpdateAd()
  const deleteMutation = useDeleteAd()
  const toggleMutation = useToggleAdStatus()

  return {
    ads: activeQuery.data || [],
    allAds: allQuery.data || [],
    isLoading: activeQuery.isLoading,
    isAllLoading: allQuery.isLoading,
    error: activeQuery.error || allQuery.error,
    createAd: createMutation.mutateAsync,
    updateAd: updateMutation.mutateAsync,
    deleteAd: deleteMutation.mutateAsync,
    toggleAdStatus: toggleMutation.mutateAsync,
    isSubmitting: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || toggleMutation.isPending
  }
}
