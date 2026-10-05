import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { toast } from 'react-hot-toast'
import { camelToSnake, snakeToCamel } from './useDataHelpers'

export { camelToSnake, snakeToCamel }
export * from './data/useAudit'
export * from './data/useContributions'
export * from './data/useExpenses'
export * from './data/usePhases'
export * from './data/usePledges'
export * from './data/useAds'

// ==========================================
// DOMAIN QUERIES
// ==========================================

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) {
        toast.error(`Profiles load error: ${error.message}`)
        throw error
      }
      const dict = {}
      if (data) {
        data.forEach(p => {
          dict[p.id] = p
        })
      }
      return dict
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useFeedback = () => {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: async () => {
      const { data, error } = await supabase.from('member_feedback').select('*')
      if (error) {
        toast.error(`Feedback load error: ${error.message}`)
        throw error
      }
      return data || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fundraising_events').select('*')
      if (error) {
        toast.error(`Events load error: ${error.message}`)
        throw error
      }
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useAnnouncements = () => {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*')
      if (error) {
        toast.error(`Announcements load error: ${error.message}`)
        throw error
      }
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*')
      if (error) {
        toast.error(`Documents load error: ${error.message}`)
        throw error
      }
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useDailyVerses = () => {
  return useQuery({
    queryKey: ['dailyVerses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('daily_verses').select('*')
      if (error) {
        toast.error(`Daily verses load error: ${error.message}`)
        throw error
      }
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const usePaymentDetails = () => {
  return useQuery({
    queryKey: ['paymentDetails'],
    queryFn: async () => {
      const { data, error } = await supabase.from('payment_details').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useProcurements = () => {
  return useQuery({
    queryKey: ['procurements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('procurement_requests').select('*')
      if (error) throw error
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useBOQLineItems = () => {
  return useQuery({
    queryKey: ['boqLineItems'],
    queryFn: async () => {
      const { data, error } = await supabase.from('boq_line_items').select('*')
      if (error) throw error
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCommitteeMembers = () => {
  return useQuery({
    queryKey: ['committeeMembers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('committee_members').select('*').order('display_order', { ascending: true })
      if (error) throw error
      return snakeToCamel(data) || []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export const useCommittee = () => useCommitteeMembers()

// ==========================================
// MUTATIONS
// ==========================================

export const useCreateEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventPayload) => {
      const snake = camelToSnake(eventPayload)
      const { data, error } = await supabase.from('fundraising_events').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Event created successfully!")
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}

export const useUpdateEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const snake = camelToSnake(updates)
      const { data, error } = await supabase.from('fundraising_events').update(snake).eq('id', id).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Event updated!")
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}

export const useCompleteEvent = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (eventId) => {
      const { data, error } = await supabase.from('fundraising_events').update({ status: 'Completed' }).eq('id', eventId).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Event marked as completed!")
      queryClient.invalidateQueries({ queryKey: ['events'] })
    }
  })
}

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (announcement) => {
      const snake = camelToSnake(announcement)
      const { data, error } = await supabase.from('announcements').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Announcement published!")
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    }
  })
}

export const useUploadDocument = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (doc) => {
      const snake = camelToSnake(doc)
      const { data, error } = await supabase.from('documents').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully!")
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    }
  })
}

export const useCreateFeedback = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ feedback, user }) => {
      const { data, error } = await supabase
        .from('member_feedback')
        .insert([{
          user_id: user?.id,
          subject: feedback.subject,
          message: feedback.message,
          status: 'pending'
        }])
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      toast.success("Feedback submitted successfully!")
      queryClient.invalidateQueries({ queryKey: ['feedback'] })
    }
  })
}

export const useReplyFeedback = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, replyMessage }) => {
      const { data, error } = await supabase
        .from('member_feedback')
        .update({
          admin_response: replyMessage,
          status: 'reviewed'
        })
        .eq('id', id)
        .select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      toast.success("Response sent!")
      queryClient.invalidateQueries({ queryKey: ['feedback'] })
    }
  })
}

export const useCreateProcurement = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (procurement) => {
      const snake = camelToSnake(procurement)
      const { data, error } = await supabase.from('procurement_requests').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Procurement request created!")
      queryClient.invalidateQueries({ queryKey: ['procurements'] })
    }
  })
}

export const useUpdateProcurementStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase.from('procurement_requests').update({ status }).eq('id', id).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Procurement status updated!")
      queryClient.invalidateQueries({ queryKey: ['procurements'] })
    }
  })
}

export const useCreatePhasePhoto = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ phaseId, photoUrl, caption, uploadedBy }) => {
      const { data, error } = await supabase.from('phase_photos').insert([{
        phase_id: phaseId, photo_url: photoUrl, caption: caption || '', uploaded_by: uploadedBy
      }]).select()
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      toast.success("Site photo added!")
      queryClient.invalidateQueries({ queryKey: ['phasePhotos'] })
    }
  })
}

export const useCreateBOQLineItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (item) => {
      const snake = camelToSnake(item)
      const { data, error } = await supabase.from('boq_line_items').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("BOQ line item created!")
      queryClient.invalidateQueries({ queryKey: ['boqLineItems'] })
    }
  })
}

export const useUpdateBOQLineItem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const snake = camelToSnake(updates)
      const { data, error } = await supabase.from('boq_line_items').update(snake).eq('id', id).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("BOQ line item updated!")
      queryClient.invalidateQueries({ queryKey: ['boqLineItems'] })
    }
  })
}

export const useCreatePaymentDetail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const snake = camelToSnake(payload)
      const { data, error } = await supabase.from('payment_details').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Payment details added!")
      queryClient.invalidateQueries({ queryKey: ['paymentDetails'] })
    }
  })
}

export const useUpdatePaymentDetail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const snake = camelToSnake(updates)
      const { data, error } = await supabase.from('payment_details').update(snake).eq('id', id).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Payment details updated!")
      queryClient.invalidateQueries({ queryKey: ['paymentDetails'] })
    }
  })
}

export const useDeletePaymentDetail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('payment_details').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success("Payment details deleted!")
      queryClient.invalidateQueries({ queryKey: ['paymentDetails'] })
    }
  })
}

export const useCreateCommitteeMember = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload) => {
      const snake = camelToSnake(payload)
      const { data, error } = await supabase.from('committee_members').insert([snake]).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Committee member added")
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] })
    }
  })
}

export const useUpdateCommitteeMember = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const snake = camelToSnake(updates)
      const { data, error } = await supabase.from('committee_members').update(snake).eq('id', id).select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Committee member updated")
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] })
    }
  })
}

export const useDeleteCommitteeMember = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('committee_members').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => {
      toast.success("Committee member deleted")
      queryClient.invalidateQueries({ queryKey: ['committeeMembers'] })
    }
  })
}

export const useRecordPledgePayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ pledgeId, amount }) => {
      const { data: pledgeData } = await supabase.from('pledges').select('fulfilled_amount, amount').eq('id', pledgeId).single()
      const currentFulfilled = pledgeData?.fulfilled_amount || 0
      const newFulfilled = currentFulfilled + Number(amount)
      const status = newFulfilled >= (pledgeData?.amount || 0) ? 'Fulfilled' : 'Active'

      const { data, error } = await supabase
        .from('pledges')
        .update({ fulfilled_amount: newFulfilled, status })
        .eq('id', pledgeId)
        .select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Pledge payment recorded!")
      queryClient.invalidateQueries({ queryKey: ['pledges'] })
    }
  })
}

export const useApproveContribution = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, signature, receiptId, receipt_qr_code }) => {
      const { data, error } = await supabase
        .from('contributions')
        .update({ status: 'Approved', signature, receipt_id: receiptId, receipt_qr_code })
        .eq('id', id)
        .select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Contribution approved!")
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
    }
  })
}

export const useRejectContribution = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }) => {
      const { data, error } = await supabase
        .from('contributions')
        .update({ status: 'Rejected', rejection_reason: reason })
        .eq('id', id)
        .select()
      if (error) throw error
      return snakeToCamel(data[0])
    },
    onSuccess: () => {
      toast.success("Contribution rejected")
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
    }
  })
}
