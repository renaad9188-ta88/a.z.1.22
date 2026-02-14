import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { UserHint } from '../types'

export function useUserHint() {
  const supabase = createSupabaseBrowserClient()
  const [userHint, setUserHint] = useState<UserHint | null>(null)
  const [loadingUserHint, setLoadingUserHint] = useState(false)

  const loadUserHint = async (onDriverLocationLoad?: (requestId: string, tripId: string) => Promise<void>) => {
    try {
      setLoadingUserHint(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setUserHint(null)
        return
      }

      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, visitor_name, trip_id, arrival_date, created_at, admin_notes, companions_count, city, selected_dropoff_stop_id, selected_pickup_stop_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setUserHint(null)
        return
      }

      const tripId = (data as any).trip_id || null
      let tripDate: string | null = null
      let tripInfo: any = null

      // Load trip information if trip_id exists
      if (tripId) {
        const { data: tripData } = await supabase
          .from('route_trips')
          .select('trip_date, meeting_time, departure_time, start_location_name, end_location_name')
          .eq('id', tripId)
          .maybeSingle()
        if (tripData) {
          tripDate = (tripData as any).trip_date || null
          tripInfo = tripData
        }
      }

      // show even if draft; but keep it safe/minimal
      setUserHint({
        request_id: data.id,
        visitor_name: (data as any).visitor_name || 'الراكب',
        trip_id: tripId,
        trip_date: tripDate,
        arrival_date: (data as any).arrival_date || null,
        companions_count: (data as any).companions_count || 0,
        city: (data as any).city || null,
        start_location_name: tripInfo?.start_location_name || null,
        end_location_name: tripInfo?.end_location_name || null,
        meeting_time: tripInfo?.meeting_time || null,
        departure_time: tripInfo?.departure_time || null,
      })
      
      // Load driver location if trip is today and driver is assigned
      if (tripId && tripDate && onDriverLocationLoad) {
        const today = new Date().toISOString().split('T')[0]
        const tripDateStr = new Date(tripDate + 'T00:00:00').toISOString().split('T')[0]
        if (tripDateStr === today) {
          await onDriverLocationLoad(data.id, tripId)
        }
      }
    } catch (e) {
      console.error('HomeTransportMap load user hint error:', e)
      setUserHint(null)
    } finally {
      setLoadingUserHint(false)
    }
  }

  return {
    userHint,
    setUserHint,
    loadingUserHint,
    loadUserHint,
  }
}



