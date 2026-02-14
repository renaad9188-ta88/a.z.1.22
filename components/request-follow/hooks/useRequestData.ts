import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { ReqRow } from '../types'

export function useRequestData(requestId: string, userId: string) {
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<ReqRow | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,visit_type,status,arrival_date,departure_date,payment_verified,remaining_amount,trip_status,admin_notes,trip_id,selected_dropoff_stop_id,selected_pickup_stop_id,deposit_paid,deposit_amount,city,created_at,updated_at'
        )
        .eq('id', requestId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error('الطلب غير موجود')
        return
      }
      setRequest(data as any)
    } catch (e: any) {
      console.error('Follow load error:', e)
      toast.error('تعذر تحميل متابعة الطلب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, userId])

  return {
    request,
    setRequest,
    loading,
    reload: load,
  }
}


