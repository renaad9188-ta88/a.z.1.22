import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import type { ReqRow, TripLite, StopPoint } from '../types'

export function useAvailableTrips(
  request: ReqRow | null,
  bookingStep: 'arrival' | 'departure',
  calculatedDepartureDate: string | null,
  onReload: () => void
) {
  const supabase = createSupabaseBrowserClient()
  const [showAvailableTrips, setShowAvailableTrips] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<TripLite[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [tripStopsById, setTripStopsById] = useState<Record<string, StopPoint[]>>({})
  const [loadingStopsId, setLoadingStopsId] = useState<string | null>(null)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const [selectedStopByTrip, setSelectedStopByTrip] = useState<Record<string, string>>({})
  const [selectedArrivalTripId, setSelectedArrivalTripId] = useState<string | null>(null)
  const [departureTrip, setDepartureTrip] = useState<TripLite | null>(null)

  const loadTripStops = async (tripId: string, tripType: 'arrival' | 'departure') => {
    if (tripStopsById[tripId]) return
    try {
      setLoadingStopsId(tripId)
      const { data, error } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,order_index,lat,lng')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      if (error) throw error

      const tripStops = (data || []) as StopPoint[]
      if (tripStops.length > 0) {
        setTripStopsById((p) => ({ ...p, [tripId]: tripStops }))
        return
      }

      // Fallback: route default stops
      const trip = availableTrips.find((t) => t.id === tripId)
      const routeId = trip?.route_id as string | undefined
      if (!routeId) {
        setTripStopsById((p) => ({ ...p, [tripId]: [] }))
        return
      }

      const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
      try {
        const { data: routeStops, error: rsErr } = await supabase
          .from('route_stop_points')
          .select('id,name,order_index,lat,lng,stop_kind')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .in('stop_kind', allowedKinds as any)
          .order('order_index', { ascending: true })
        if (rsErr) throw rsErr
        setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
      } catch (e: any) {
        // Backward compatibility
        const { data: routeStops } = await supabase
          .from('route_stop_points')
          .select('id,name,order_index,lat,lng')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
      }
    } catch (e: any) {
      console.error('Error loading stop points:', e)
      setTripStopsById((p) => ({ ...p, [tripId]: [] }))
    } finally {
      setLoadingStopsId(null)
    }
  }

  const loadAvailableTrips = async (tripType?: 'arrival' | 'departure') => {
    try {
      setLoadingTrips(true)
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
      
      if (request?.visit_type === 'visit') {
        const filterType = tripType || bookingStep
        query = query.eq('trip_type', filterType)
        
        if (filterType === 'departure' && calculatedDepartureDate) {
          const departureDate = new Date(calculatedDepartureDate)
          const weekBefore = new Date(departureDate)
          weekBefore.setDate(weekBefore.getDate() - 7)
          const weekAfter = new Date(departureDate)
          weekAfter.setDate(weekAfter.getDate() + 7)
          
          query = query
            .gte('trip_date', weekBefore.toISOString().split('T')[0])
            .lte('trip_date', weekAfter.toISOString().split('T')[0])
        }
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setAvailableTrips((data || []) as TripLite[])
      
      // تحميل نقاط التوقف تلقائياً
      if (data && data.length > 0) {
        for (const trip of data) {
          await loadTripStops(trip.id, (trip.trip_type as any) || bookingStep)
        }
      }
    } catch (e: any) {
      console.error('Error loading available trips:', e)
      toast.error('تعذر تحميل الرحلات المتاحة')
      setAvailableTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const toggleTripStops = async (tripId: string, tripType: 'arrival' | 'departure') => {
    const next = expandedTripId === tripId ? null : tripId
    setExpandedTripId(next)
    if (next) {
      await loadTripStops(tripId, tripType)
    }
  }

  return {
    showAvailableTrips,
    setShowAvailableTrips,
    availableTrips,
    loadingTrips,
    tripStopsById,
    loadingStopsId,
    expandedTripId,
    selectedStopByTrip,
    setSelectedStopByTrip,
    selectedArrivalTripId,
    setSelectedArrivalTripId,
    departureTrip,
    setDepartureTrip,
    loadTripStops,
    toggleTripStops,
    loadAvailableTrips,
  }
}


