import { useCallback, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { TripLite, AssignedDriver } from '../types'

export function useTripData() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [bookedTrip, setBookedTrip] = useState<TripLite | null>(null)
  const [bookedStops, setBookedStops] = useState<Array<{ id: string; name: string; order_index: number }> | null>(null)
  const [selectedDropoffStop, setSelectedDropoffStop] = useState<{ id: string; name: string } | null>(null)
  const [selectedPickupStop, setSelectedPickupStop] = useState<{ id: string; name: string } | null>(null)
  const [assignedDrivers, setAssignedDrivers] = useState<AssignedDriver[]>([])

  const clearTripData = useCallback(() => {
    setBookedTrip(null)
    setBookedStops(null)
    setAssignedDrivers([])
    setSelectedDropoffStop(null)
    setSelectedPickupStop(null)
  }, [])

  const loadTripData = useCallback(async (tripId: string | null | undefined, requestRow: any) => {
    if (!tripId) {
      clearTripData()
      return
    }

    try {
      const { data: t, error: tErr } = await supabase
        .from('route_trips')
        .select('id,route_id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,trip_type')
        .eq('id', tripId)
        .maybeSingle()
      if (!tErr && t) {
        setBookedTrip(t as any)
        
        // Load assigned drivers for this trip
        try {
          const { data: drvRows } = await supabase
            .from('route_trip_drivers')
            .select('drivers(id,name,phone,vehicle_type)')
            .eq('trip_id', tripId)
            .eq('is_active', true)
          const list = (drvRows || [])
            .map((x: any) => x.drivers)
            .filter(Boolean) as AssignedDriver[]
          setAssignedDrivers(list)
        } catch {
          setAssignedDrivers([])
        }
        
        // Load stop points for this trip; fallback to route default points
        const { data: stops } = await supabase
          .from('route_trip_stop_points')
          .select('id,name,order_index')
          .eq('trip_id', tripId)
          .order('order_index', { ascending: true })
        const tripStops = ((stops as any) || []) as any[]
        if (tripStops.length > 0) {
          setBookedStops(tripStops)
        } else {
          const routeId = (t as any)?.route_id as string | undefined
          const tripType: 'arrival' | 'departure' | null = ((t as any)?.trip_type as any) || null
          const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
          if (routeId) {
            try {
              const { data: routeStops } = await supabase
                .from('route_stop_points')
                .select('id,name,order_index')
                .eq('route_id', routeId)
                .eq('is_active', true)
                .in('stop_kind', allowedKinds as any)
                .order('order_index', { ascending: true })
              setBookedStops((routeStops as any) || [])
            } catch {
              const { data: routeStops } = await supabase
                .from('route_stop_points')
                .select('id,name,order_index')
                .eq('route_id', routeId)
                .eq('is_active', true)
                .order('order_index', { ascending: true })
              setBookedStops((routeStops as any) || [])
            }
          } else {
            setBookedStops([])
          }
        }
        
        // تحميل نقطة النزول/التحميل المختارة
        const rowData = requestRow as any
        if (rowData.selected_dropoff_stop_id) {
          const stopId = rowData.selected_dropoff_stop_id
          let { data: dropoffStop } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          if (!dropoffStop) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            dropoffStop = (res as any)?.data || null
          }
          setSelectedDropoffStop(dropoffStop ? { id: dropoffStop.id, name: dropoffStop.name } : null)
        } else {
          setSelectedDropoffStop(null)
        }
        
        if (rowData.selected_pickup_stop_id) {
          const stopId = rowData.selected_pickup_stop_id
          let { data: pickupStop } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          if (!pickupStop) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            pickupStop = (res as any)?.data || null
          }
          setSelectedPickupStop(pickupStop ? { id: pickupStop.id, name: pickupStop.name } : null)
        } else {
          setSelectedPickupStop(null)
        }
      } else {
        clearTripData()
      }
    } catch {
      clearTripData()
    }
  }, [clearTripData, supabase])

  return {
    bookedTrip,
    bookedStops,
    selectedDropoffStop,
    selectedPickupStop,
    assignedDrivers,
    loadTripData,
  }
}

