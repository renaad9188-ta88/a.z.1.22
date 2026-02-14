import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import type { ReqRow, TripLite, StopPoint } from '../types'

async function ensureTripStopPointsSeeded(params: {
  supabase: ReturnType<typeof createSupabaseBrowserClient>
  tripId: string
  routeId: string
  tripType: 'arrival' | 'departure'
}) {
  const { supabase, tripId, routeId, tripType } = params

  // Re-check current trip stops to avoid duplicates if seeded elsewhere
  const { data: existingStops } = await supabase
    .from('route_trip_stop_points')
    .select('id,name,order_index,lat,lng')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true })

  const existing = ((existingStops as any) || []) as any[]
  if (existing.length > 0) return existing

  const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']

  // Load route-level stops (must include lat/lng because trip stop table requires them)
  let routeStops: any[] = []
  try {
    const { data } = await supabase
      .from('route_stop_points')
      .select('name,order_index,lat,lng,stop_kind')
      .eq('route_id', routeId)
      .eq('is_active', true)
      .in('stop_kind', allowedKinds as any)
      .order('order_index', { ascending: true })
    routeStops = (data as any) || []
  } catch {
    const { data } = await supabase
      .from('route_stop_points')
      .select('name,order_index,lat,lng')
      .eq('route_id', routeId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    routeStops = (data as any) || []
  }

  const seedSrc = (routeStops || []).filter((s: any) => s?.lat != null && s?.lng != null)
  if (seedSrc.length > 0) {
    const rows = seedSrc.map((s: any) => ({
      trip_id: tripId,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      order_index: Number.isFinite(s.order_index) ? s.order_index : 0,
    }))
    await supabase.from('route_trip_stop_points').insert(rows as any)
  }

  const { data: seededStops } = await supabase
    .from('route_trip_stop_points')
    .select('id,name,order_index,lat,lng')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true })

  return (((seededStops as any) || []) as any[]) || []
}

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

      // ✅ Seed into trip stop points so selected_*_stop_id always references route_trip_stop_points (FK-safe)
      const seeded = await ensureTripStopPointsSeeded({
        supabase,
        tripId,
        routeId,
        tripType,
      })
      setTripStopsById((p) => ({ ...p, [tripId]: (seeded as any) || [] }))
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
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type,start_lat,start_lng,end_lat,end_lng')
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

      // Proactively load stops for the first trip so the UI feels clearer/faster
      const first = (data || [])[0] as any
      if (first?.id) {
        loadTripStops(first.id, ((first.trip_type as any) || bookingStep) as any).catch(() => {})
      }
      
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


