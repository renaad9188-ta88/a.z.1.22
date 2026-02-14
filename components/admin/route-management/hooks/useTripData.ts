import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { RouteTripLite, Driver, Passenger, TripListFilter } from '../types'

export function useTripData(tripListFilter: TripListFilter, expandedRouteTrips: Record<string, boolean>) {
  const supabase = createSupabaseBrowserClient()
  const [routeTrips, setRouteTrips] = useState<Record<string, RouteTripLite[]>>({})
  const [routeTripsLoading, setRouteTripsLoading] = useState<Record<string, boolean>>({})
  const [tripAssignedDrivers, setTripAssignedDrivers] = useState<Record<string, Driver[]>>({})
  const [tripPassengers, setTripPassengers] = useState<Record<string, Passenger[]>>({})

  const loadTripsForRoute = async (routeId: string) => {
    try {
      setRouteTripsLoading((p) => ({ ...p, [routeId]: true }))
      // Load trips from route_trips table (admin-created trips)
      const todayISO = new Date().toISOString().slice(0, 10)
      let q = supabase
        .from('route_trips')
        .select('id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,is_active,created_at')
        .eq('route_id', routeId)

      // Default for office: upcoming trips only
      if (tripListFilter === 'upcoming') {
        q = q.eq('is_active', true)
        q = q.gte('trip_date', todayISO).order('trip_date', { ascending: true }).order('departure_time', { ascending: true })
      } else if (tripListFilter === 'ended') {
        q = q.lt('trip_date', todayISO).order('trip_date', { ascending: false }).order('departure_time', { ascending: false })
      } else {
        q = q.order('trip_date', { ascending: true }).order('departure_time', { ascending: true })
      }

      const { data: tripsData, error: tripsErr } = await q
      
      if (tripsErr) throw tripsErr
      
      // Format as RouteTripLite for display
      const formattedTrips = (tripsData || []).map((trip: any) => ({
        id: trip.id,
        visitor_name: `${trip.start_location_name} → ${trip.end_location_name}`,
        city: trip.start_location_name,
        companions_count: 0,
        arrival_date: trip.trip_date,
        is_active: Boolean(trip.is_active),
        trip_status: trip.is_active ? 'مجدولة' : 'ملغاة',
        created_at: trip.created_at,
        meeting_time: trip.meeting_time,
        departure_time: trip.departure_time,
        start_location_name: trip.start_location_name,
        end_location_name: trip.end_location_name,
        start_lat: trip.start_lat,
        start_lng: trip.start_lng,
        end_lat: trip.end_lat,
        end_lng: trip.end_lng,
        trip_type: (trip.trip_type as any) || 'arrival',
      }))
      
      setRouteTrips((p) => ({ ...p, [routeId]: formattedTrips as any[] }))
      
      // Load assigned drivers and passengers for each trip
      const tripIds = formattedTrips.map((t: any) => t.id)
      if (tripIds.length > 0) {
        // Load assigned drivers
        const { data: assignments, error: assignErr } = await supabase
          .from('route_trip_drivers')
          .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
          .in('trip_id', tripIds)
          .eq('is_active', true)
        
        if (!assignErr && assignments) {
          const driversByTrip: Record<string, Driver[]> = {}
          assignments.forEach((a: any) => {
            if (a.drivers && a.trip_id) {
              if (!driversByTrip[a.trip_id]) driversByTrip[a.trip_id] = []
              driversByTrip[a.trip_id].push(a.drivers as Driver)
            }
          })
          setTripAssignedDrivers((p) => ({ ...p, ...driversByTrip }))
        }
        
        // Load passengers for each trip
        const { data: passengersData, error: passengersErr } = await supabase
          .from('visit_requests')
          .select('id, visitor_name, companions_count, user_id, trip_id')
          .in('trip_id', tripIds)
          .neq('trip_status', 'rejected')
        
        if (!passengersErr && passengersData) {
          const userIds = Array.from(new Set(passengersData.map((p: any) => p.user_id).filter(Boolean)))
          let profilesMap: Record<string, { phone: string | null; full_name: string | null; whatsapp_phone: string | null; jordan_phone: string | null }> = {}
          
          if (userIds.length > 0) {
            const { data: profiles, error: profErr } = await supabase
              .from('profiles')
              .select('user_id, phone, full_name, whatsapp_phone, jordan_phone')
              .in('user_id', userIds)
            
            if (!profErr && profiles) {
              profiles.forEach((p: any) => {
                profilesMap[p.user_id] = {
                  phone: p.phone || null,
                  full_name: p.full_name || null,
                  whatsapp_phone: p.whatsapp_phone || null,
                  jordan_phone: p.jordan_phone || null,
                }
              })
            }
          }
          
          const passengersByTrip: Record<string, Passenger[]> = {}
          passengersData.forEach((p: any) => {
            if (!passengersByTrip[p.trip_id]) passengersByTrip[p.trip_id] = []
            passengersByTrip[p.trip_id].push({
              id: p.id,
              visitor_name: p.visitor_name,
              companions_count: p.companions_count || 0,
              phone: profilesMap[p.user_id]?.phone || null,
              full_name: profilesMap[p.user_id]?.full_name || null,
              whatsapp_phone: profilesMap[p.user_id]?.whatsapp_phone || null,
              jordan_phone: profilesMap[p.user_id]?.jordan_phone || null,
            })
          })
          
          setTripPassengers((prev) => ({ ...prev, ...passengersByTrip }))
        }
      }
    } catch (e: any) {
      console.error('loadTripsForRoute error:', e)
      toast.error(e?.message || 'تعذر تحميل رحلات هذا الخط')
      setRouteTrips((p) => ({ ...p, [routeId]: [] }))
    } finally {
      setRouteTripsLoading((p) => ({ ...p, [routeId]: false }))
    }
  }

  // Note: The parent component handles reloading trips when filter changes

  return {
    routeTrips,
    routeTripsLoading,
    tripAssignedDrivers,
    tripPassengers,
    loadTripsForRoute,
    setTripAssignedDrivers,
  }
}

