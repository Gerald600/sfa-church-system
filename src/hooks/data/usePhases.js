import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from '../useDataHelpers'
import { logAudit } from './useAudit'

export const usePhases = () => {
  return useQuery({
    queryKey: ['phases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('construction_phases').select('*')
      if (error) {
        toast.error(`Phases load error: ${error.message}`)
        throw error
      }
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCreatePhase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ phase, user }) => {
      const snakePayload = camelToSnake(phase)
      const { data, error } = await supabase
        .from('construction_phases')
        .insert([snakePayload])
        .select()
      if (error) throw error

      await logAudit(
        user.id,
        user.user_metadata?.full_name || 'Coordinator',
        'coordinator',
        'Create Construction Phase',
        `Created phase ${phase.name} with budget UGX ${Number(phase.budget).toLocaleString()}`
      )
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Construction phase created successfully!")
      queryClient.invalidateQueries({ queryKey: ['phases'] })
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] })
    },
    onError: (err) => {
      toast.error(`Phase creation error: ${err.message}`)
    }
  })
}

export const useUpdatePhase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates, user }) => {
      const snakePayload = camelToSnake(updates)
      const { data, error } = await supabase
        .from('construction_phases')
        .update(snakePayload)
        .eq('id', id)
        .select()
      if (error) throw error

      if (user) {
        await logAudit(
          user.id,
          user.user_metadata?.full_name || 'Coordinator',
          'coordinator',
          'Update Construction Phase',
          `Updated phase ID ${id}`
        )
      }
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Phase updated successfully!")
      queryClient.invalidateQueries({ queryKey: ['phases'] })
    },
    onError: (err) => {
      toast.error(`Phase update error: ${err.message}`)
    }
  })
}

export const useDeletePhase = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, user }) => {
      const { error } = await supabase
        .from('construction_phases')
        .delete()
        .eq('id', id)
      if (error) throw error

      if (user) {
        await logAudit(
          user.id,
          user.user_metadata?.full_name || 'Admin',
          'admin',
          'Delete Phase',
          `Deleted construction phase ID ${id}`
        )
      }
      return id
    },
    onSuccess: () => {
      toast.success("Phase deleted")
      queryClient.invalidateQueries({ queryKey: ['phases'] })
    },
    onError: (err) => {
      toast.error(`Phase delete error: ${err.message}`)
    }
  })
}

export const usePhasePhotos = () => {
  return useQuery({
    queryKey: ['phasePhotos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('phase_photos').select('*')
      if (error) {
        toast.error(`Phase photos load error: ${error.message}`)
        throw error
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useAddPhasePhoto = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ phaseId, photoUrl, caption, uploadedBy }) => {
      const { data, error } = await supabase
        .from('phase_photos')
        .insert([{
          phase_id: phaseId,
          photo_url: photoUrl,
          caption: caption || '',
          uploaded_by: uploadedBy
        }])
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      toast.success("Phase site photo added successfully!")
      queryClient.invalidateQueries({ queryKey: ['phasePhotos'] })
    },
    onError: (err) => {
      toast.error(`Photo upload log error: ${err.message}`)
    }
  })
}
