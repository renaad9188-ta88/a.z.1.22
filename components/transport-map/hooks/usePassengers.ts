import { useState, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { LatLng, PassengerInfo } from '../types'

interface UsePassengersProps {
  driverLocation: LatLng | null
}

export function usePassengers({ driverLocation }: UsePassengersProps) {
  const supabase = createSupabaseBrowserClient()
  const [passengers, setPassengers] = useState<PassengerInfo[]>([])
  const [loadingPassengers, setLoadingPassengers] = useState(false)
  const [tripType, setTripType] = useState<'arrival' | 'departure' | null>(null)
  const directionsServiceForEtaRef = useRef<google.maps.DirectionsService | null>(null)

  const loadPassengersForTrip = async (tripId: string) => {
    try {
      setLoadingPassengers(true)
      
      const { data: tripData } = await supabase
        .from('route_trips')
        .select('trip_type')
        .eq('id', tripId)
        .maybeSingle()
      
      const type = (tripData?.trip_type === 'departure' || tripData?.trip_type === 'departures') 
        ? 'departure' 
        : 'arrival'
      setTripType(type)

      const { data: passengersData, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          selected_dropoff_stop_id,
          selected_pickup_stop_id
        `)
        .eq('trip_id', tripId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })

      if (error) throw error

      const stopIds = (passengersData || [])
        .map((p: any) => type === 'arrival' ? p.selected_dropoff_stop_id : p.selected_pickup_stop_id)
        .filter(Boolean) as string[]

      let stopsMap: Record<string, { name: string; lat: number; lng: number }> = {}
      if (stopIds.length > 0) {
        const { data: stopsData } = await supabase
          .from('route_trip_stop_points')
          .select('id, name, lat, lng')
          .in('id', stopIds)
        
        ;(stopsData || []).forEach((s: any) => {
          stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
        })

        const missing = stopIds.filter((id) => !stopsMap[id])
        if (missing.length > 0) {
          const { data: routeStopsData } = await supabase
            .from('route_stop_points')
            .select('id, name, lat, lng')
            .in('id', missing)
          ;(routeStopsData || []).forEach((s: any) => {
            stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
          })
        }
      }

      const passengersList: PassengerInfo[] = (passengersData || []).map((p: any) => {
        const stopId = type === 'arrival' ? p.selected_dropoff_stop_id : p.selected_pickup_stop_id
        const stopInfo = stopId ? stopsMap[stopId] : null
        
        return {
          id: p.id,
          visitor_name: p.visitor_name,
          selected_dropoff_stop_id: p.selected_dropoff_stop_id,
          selected_pickup_stop_id: p.selected_pickup_stop_id,
          dropoff_stop_name: type === 'arrival' ? stopInfo?.name || null : null,
          pickup_stop_name: type === 'departure' ? stopInfo?.name || null : null,
          eta: null,
        }
      })

      setPassengers(passengersList)

      if (driverLocation && (window as any).google?.maps) {
        await calculatePassengerETAs(passengersList, stopsMap, type)
      }
    } catch (e) {
      console.error('Error loading passengers:', e)
      setPassengers([])
    } finally {
      setLoadingPassengers(false)
    }
  }

  const calculatePassengerETAs = async (
    passengersList: PassengerInfo[],
    stopsMap: Record<string, { name: string; lat: number; lng: number }>,
    type: 'arrival' | 'departure'
  ) => {
    if (!driverLocation || !(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps
    if (!directionsServiceForEtaRef.current) {
      directionsServiceForEtaRef.current = new googleMaps.DirectionsService()
    }

    const updatedPassengers = await Promise.all(
      passengersList.map(async (passenger) => {
        const stopId = type === 'arrival' 
          ? passenger.selected_dropoff_stop_id 
          : passenger.selected_pickup_stop_id
        
        if (!stopId || !stopsMap[stopId]) {
          return { ...passenger, eta: null }
        }

        const stopLocation = stopsMap[stopId]
        const destination = { lat: stopLocation.lat, lng: stopLocation.lng }

        try {
          const result = await directionsServiceForEtaRef.current!.route({
            origin: driverLocation,
            destination,
            travelMode: googleMaps.TravelMode.DRIVING,
          })

          const legs = result.routes?.[0]?.legs || []
          const durationSec = legs.reduce((sum, l) => sum + (l.duration?.value || 0), 0)
          const distanceM = legs.reduce((sum, l) => sum + (l.distance?.value || 0), 0)

          const durationText =
            legs.length === 1 && legs[0].duration?.text
              ? legs[0].duration.text
              : durationSec > 0
                ? `${Math.round(durationSec / 60)} دقيقة`
                : 'غير متاح'

          const distanceText =
            legs.length === 1 && legs[0].distance?.text
              ? legs[0].distance.text
              : distanceM > 0
                ? `${Math.round(distanceM / 1000)} كم`
                : 'غير متاح'

          return {
            ...passenger,
            eta: {
              durationText,
              distanceText,
            },
          }
        } catch (e) {
          console.error('Error calculating ETA for passenger:', e)
          return { ...passenger, eta: null }
        }
      })
    )

    setPassengers(updatedPassengers)
  }

  return {
    passengers,
    loadingPassengers,
    tripType,
    loadPassengersForTrip,
  }
}

