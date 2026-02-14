import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'
import { notifyCustomMessage } from '@/lib/notifications'
import type { ReqRow } from '../types'

export function useAvailableTrips(request: ReqRow | null) {
  const supabase = createSupabaseBrowserClient()
  const [showAvailableTrips, setShowAvailableTrips] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<any[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [tripStopsById, setTripStopsById] = useState<Record<string, any[]>>({})
  const [loadingStopsId, setLoadingStopsId] = useState<string | null>(null)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const [selectedStopByTrip, setSelectedStopByTrip] = useState<Record<string, string>>({})
  const [bookingStep, setBookingStep] = useState<'arrival' | 'departure'>('arrival')
  const [calculatedDepartureDate, setCalculatedDepartureDate] = useState<string | null>(null)

  const loadTripStops = async (tripId: string) => {
    if (tripStopsById[tripId]) return // already loaded
    try {
      setLoadingStopsId(tripId)
      const { data: tripStops } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,order_index')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      
      const stops = (tripStops as any) || []
      if (stops.length > 0) {
        setTripStopsById((p) => ({ ...p, [tripId]: stops }))
      } else {
        // Fallback: load from route_stop_points
        const trip = availableTrips.find((t) => t.id === tripId)
        if (trip?.route_id) {
          const tripType: 'arrival' | 'departure' | null = (trip.trip_type as any) || null
          const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
          try {
            const { data: routeStops } = await supabase
              .from('route_stop_points')
              .select('id,name,order_index')
              .eq('route_id', trip.route_id)
              .eq('is_active', true)
              .in('stop_kind', allowedKinds as any)
              .order('order_index', { ascending: true })
            setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
          } catch {
            const { data: routeStops } = await supabase
              .from('route_stop_points')
              .select('id,name,order_index')
              .eq('route_id', trip.route_id)
              .eq('is_active', true)
              .order('order_index', { ascending: true })
            setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
          }
        }
      }
    } catch (e) {
      console.error('Error loading trip stops:', e)
    } finally {
      setLoadingStopsId(null)
    }
  }

  const toggleTripStops = async (tripId: string) => {
    const next = expandedTripId === tripId ? null : tripId
    setExpandedTripId(next)
    if (next) await loadTripStops(tripId)
  }

  const loadAvailableTrips = async (tripType?: 'arrival' | 'departure') => {
    try {
      setLoadingTrips(true)
      const today = new Date().toISOString().split('T')[0]
      const filterType = tripType || bookingStep

      let query = supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
        .eq('trip_type', filterType)

      // في حال المغادرة، إذا لدينا موعد قدوم، نقرّب النتائج حول موعد المغادرة المتوقع (شهر بعد القدوم)
      if (filterType === 'departure' && request?.arrival_date) {
        const arrivalDate = new Date(request.arrival_date)
        const expectedDeparture = new Date(arrivalDate)
        expectedDeparture.setMonth(expectedDeparture.getMonth() + 1)
        const expected = expectedDeparture.toISOString().split('T')[0]
        setCalculatedDepartureDate(expected)

        const weekBefore = new Date(expectedDeparture)
        weekBefore.setDate(weekBefore.getDate() - 7)
        const weekAfter = new Date(expectedDeparture)
        weekAfter.setDate(weekAfter.getDate() + 7)
        query = query
          .gte('trip_date', weekBefore.toISOString().split('T')[0])
          .lte('trip_date', weekAfter.toISOString().split('T')[0])
      } else {
        setCalculatedDepartureDate(null)
      }

      const { data, error } = await query
      if (error) throw error
      setAvailableTrips((data as any) || [])
    } catch (e) {
      console.error('Error loading admin available trips:', e)
      toast.error('تعذر تحميل الرحلات المتاحة')
      setAvailableTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const openBookingModal = async (step: 'arrival' | 'departure') => {
    setBookingStep(step)
    setSelectedStopByTrip({})
    setExpandedTripId(null)
    setShowAvailableTrips(true)
    await loadAvailableTrips(step)
  }

  const handleAdminBookTrip = async (tripId: string, onReload: () => void) => {
    if (!request) return
    try {
      const trip = availableTrips.find((t) => t.id === tripId)
      if (!trip) return toast.error('الرحلة غير موجودة')

      const tripType: 'arrival' | 'departure' = (trip.trip_type as any) || bookingStep
      const selectedStopId = selectedStopByTrip[tripId] || null
      const stopName =
        selectedStopId && tripStopsById[tripId]
          ? tripStopsById[tripId].find((s: any) => s.id === selectedStopId)?.name
          : null

      const updateData: any = {
        trip_id: tripId,
        trip_status: 'pending_arrival',
        updated_at: new Date().toISOString(),
      }
      if (tripType === 'arrival') {
        updateData.arrival_date = trip.trip_date
        updateData.selected_dropoff_stop_id = selectedStopId
      } else {
        updateData.departure_date = trip.trip_date
        updateData.selected_pickup_stop_id = selectedStopId
      }

      const tripInfo = `${trip.start_location_name} → ${trip.end_location_name} (${formatDate(trip.trip_date)})`
      const adminNote = `\n\n=== حجز من الإدارة ===\nتم حجز رحلة ${tripType === 'arrival' ? 'قدوم' : 'مغادرة'} بواسطة الإدارة\n${tripInfo}${stopName ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopName}` : ''}\nتاريخ الحجز: ${new Date().toISOString()}`
      updateData.admin_notes = ((request.admin_notes || '') as string) + adminNote

      const { error } = await supabase.from('visit_requests').update(updateData).eq('id', request.id)
      if (error) throw error

      toast.success('تم حجز الرحلة للمستخدم')
      setShowAvailableTrips(false)
      setSelectedStopByTrip({})
      await onReload()

      // إشعار سريع للمستخدم (اختياري)
      try {
        await notifyCustomMessage(
          request.user_id,
          request.id,
          `تم حجز رحلة ${tripType === 'arrival' ? 'قدوم' : 'مغادرة'} لك من قبل الإدارة.\n${tripInfo}${stopName ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopName}` : ''}`
        )
      } catch (e) {
        console.error('Error notifying user about admin booking:', e)
      }
    } catch (e: any) {
      console.error('handleAdminBookTrip error:', e)
      toast.error(e?.message || 'تعذر حجز الرحلة')
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
    bookingStep,
    calculatedDepartureDate,
    loadTripStops,
    toggleTripStops,
    loadAvailableTrips,
    openBookingModal,
    handleAdminBookTrip,
  }
}

