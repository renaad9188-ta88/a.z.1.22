import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { ReqRow, TripLite, StopPoint } from '../types'

export function useTripData(request: ReqRow | null) {
  const supabase = createSupabaseBrowserClient()
  const [bookedTrip, setBookedTrip] = useState<TripLite | null>(null)
  const [selectedDropoffStop, setSelectedDropoffStop] = useState<{ id: string; name: string } | null>(null)
  const [selectedPickupStop, setSelectedPickupStop] = useState<{ id: string; name: string } | null>(null)

  const loadBookedTrip = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name')
        .eq('id', tripId)
        .maybeSingle()
      
      if (error) throw error
      setBookedTrip(data as any)
    } catch (e: any) {
      console.error('Error loading booked trip:', e)
      setBookedTrip(null)
    }
  }

  // تحميل أسماء نقاط الصعود/النزول المختارة
  useEffect(() => {
    const loadSelectedStops = async () => {
      if (!request) return
      try {
        if ((request as any).selected_dropoff_stop_id) {
          const stopId = (request as any).selected_dropoff_stop_id
          let { data } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          if (!data) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            data = (res as any)?.data || null
          }
          setSelectedDropoffStop(data ? { id: data.id, name: (data as any).name } : null)
        } else {
          setSelectedDropoffStop(null)
        }
      } catch {
        setSelectedDropoffStop(null)
      }

      try {
        if ((request as any).selected_pickup_stop_id) {
          const stopId = (request as any).selected_pickup_stop_id
          let { data } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          if (!data) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            data = (res as any)?.data || null
          }
          setSelectedPickupStop(data ? { id: data.id, name: (data as any).name } : null)
        } else {
          setSelectedPickupStop(null)
        }
      } catch {
        setSelectedPickupStop(null)
      }
    }

    loadSelectedStops()
  }, [request, supabase])

  // تحميل الرحلة المحجوزة عند تغيير request
  useEffect(() => {
    if (request?.trip_id) {
      loadBookedTrip(request.trip_id)
    } else {
      setBookedTrip(null)
    }
  }, [request?.trip_id])

  return {
    bookedTrip,
    selectedDropoffStop,
    selectedPickupStop,
    loadBookedTrip,
  }
}


