import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { PublicTripMapRow, UserHint } from '../types'
import { normalizeStops } from '../utils'

export function useTripData() {
  const supabase = createSupabaseBrowserClient()
  const [loadingTrip, setLoadingTrip] = useState(false)
  const [tripRow, setTripRow] = useState<PublicTripMapRow | null>(null)

  const fetchTripMap = async (kind: 'arrivals' | 'departures', userHint: UserHint | null) => {
    try {
      setLoadingTrip(true)
      
      // إذا كان المستخدم لديه رحلة محجوزة، حمّل رحلته بدلاً من الرحلة العامة
      // لكن فقط إذا كانت الرحلة اليوم أو قريبة (خلال 7 أيام)
      if (userHint?.trip_id && userHint?.trip_date) {
        const today = new Date().toISOString().split('T')[0]
        const tripDateStr = new Date(userHint.trip_date + 'T00:00:00').toISOString().split('T')[0]
        const tripDate = new Date(userHint.trip_date + 'T00:00:00')
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)
        const daysDiff = Math.ceil((tripDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // عرض رحلة المستخدم فقط إذا كانت اليوم أو خلال 7 أيام قادمة
        const isTripActive = tripDateStr === today || (daysDiff >= 0 && daysDiff <= 7)
        
        if (isTripActive) {
          const { data: tripData, error: tripError } = await supabase
            .from('route_trips')
            .select(`
              id,
              route_id,
              trip_type,
              trip_date,
              meeting_time,
              departure_time,
              start_location_name,
              start_lat,
              start_lng,
              end_location_name,
              end_lat,
              end_lng,
              is_active
            `)
            .eq('id', userHint.trip_id)
            .eq('is_active', true)
            .maybeSingle()
          
          if (!tripError && tripData) {
            // Load route info
            const { data: routeData } = await supabase
              .from('routes')
              .select('id, name, start_location_name, start_lat, start_lng, end_location_name, end_lat, end_lng')
              .eq('id', tripData.route_id)
              .maybeSingle()
            
            // Load trip stop points
            const { data: stopsData } = await supabase
              .from('route_trip_stop_points')
              .select('id, trip_id, name, lat, lng, order_index')
              .eq('trip_id', userHint.trip_id)
              .order('order_index', { ascending: true })
            const tripStopsRows = (stopsData || []) as any[]
            let stops = tripStopsRows.map((s: any) => ({
              name: s.name,
              lat: s.lat,
              lng: s.lng,
              order_index: s.order_index || 0,
            }))

            // Fallback: use route default stops if trip has no custom points
            if (stops.length === 0 && tripData?.route_id) {
              const tripType: 'arrival' | 'departure' | null = (tripData.trip_type as any) || null
              const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
              try {
                const { data: routeStops } = await supabase
                  .from('route_stop_points')
                  .select('id,name,lat,lng,order_index,stop_kind')
                  .eq('route_id', tripData.route_id)
                  .eq('is_active', true)
                  .in('stop_kind', allowedKinds as any)
                  .order('order_index', { ascending: true })
                stops = (routeStops || []).map((s: any) => ({
                  name: s.name,
                  lat: s.lat,
                  lng: s.lng,
                  order_index: s.order_index || 0,
                }))
              } catch {
                const { data: routeStops } = await supabase
                  .from('route_stop_points')
                  .select('id,name,lat,lng,order_index')
                  .eq('route_id', tripData.route_id)
                  .eq('is_active', true)
                  .order('order_index', { ascending: true })
                stops = (routeStops || []).map((s: any) => ({
                  name: s.name,
                  lat: s.lat,
                  lng: s.lng,
                  order_index: s.order_index || 0,
                }))
              }
            }
            
            // Create trip row format
            const userTripRow: PublicTripMapRow = {
              id: tripData.id,
              route_id: tripData.route_id,
              trip_id: tripData.id,
              trip_type: tripData.trip_type,
              trip_date: tripData.trip_date,
              meeting_time: tripData.meeting_time,
              departure_time: tripData.departure_time,
              start_location_name: tripData.start_location_name || routeData?.start_location_name || '',
              start_lat: tripData.start_lat || routeData?.start_lat || 0,
              start_lng: tripData.start_lng || routeData?.start_lng || 0,
              end_location_name: tripData.end_location_name || routeData?.end_location_name || '',
              end_lat: tripData.end_lat || routeData?.end_lat || 0,
              end_lng: tripData.end_lng || routeData?.end_lng || 0,
              stops: stops,
              is_demo: false,
            }
            
            setTripRow(userTripRow)
            return
          }
        }
      }
      
      // Fallback to public trip map (للغير مسجلين أو إذا لم تكن رحلة المستخدم نشطة)
      const { data, error } = await supabase.rpc('get_public_trip_map', { p_kind: kind })
      if (error) throw error
      const row = (Array.isArray(data) ? data[0] : data) as PublicTripMapRow | null
      
      // التحقق من أن الرحلة ليست بتاريخ قديم (يجب أن تكون اليوم أو في المستقبل)
      if (row && row.trip_date) {
        const today = new Date().toISOString().split('T')[0]
        const tripDateStr = new Date(row.trip_date + 'T00:00:00').toISOString().split('T')[0]
        const tripDate = new Date(row.trip_date + 'T00:00:00')
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)
        const daysDiff = Math.ceil((tripDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // عرض الرحلة فقط إذا كانت اليوم أو في المستقبل (وليس في الماضي)
        if (daysDiff < 0) {
          // الرحلة قديمة، لا نعرضها
          setTripRow(null)
          return
        }
      }
      
      setTripRow(row || null)
    } catch (e: any) {
      console.error('HomeTransportMap load trip map error:', e)
      setTripRow(null)
    } finally {
      setLoadingTrip(false)
    }
  }

  const getStopsList = () => {
    if (!tripRow?.stops) return []
    return normalizeStops(tripRow.stops)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  }

  return {
    tripRow,
    setTripRow,
    loadingTrip,
    fetchTripMap,
    getStopsList,
  }
}



