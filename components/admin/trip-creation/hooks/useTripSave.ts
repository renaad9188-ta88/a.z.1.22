import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { StopPoint, LocationPoint } from '../types'

export function useTripSave(
  routeId: string,
  tripType: 'arrival' | 'departure',
  onSuccess?: () => void,
  onClose?: () => void
) {
  const supabase = createSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)

  const saveTrip = async (
    selectedDates: string[],
    meetingTime: string,
    departureTime: string,
    startLocation: LocationPoint | null,
    endLocation: LocationPoint | null,
    stopPoints: StopPoint[],
    useRouteDefaultStops: boolean,
    editTripId?: string | null,
    isActive: boolean = true
  ) => {
    if (!departureTime) {
      toast.error('يرجى تحديد وقت الانطلاق')
      return
    }
    if (!startLocation) {
      toast.error('يرجى تحديد نقطة الانطلاق')
      return
    }
    if (!endLocation) {
      toast.error('يرجى تحديد نقطة الوصول')
      return
    }
    if (selectedDates.length === 0) {
      toast.error('اختر يوم واحد على الأقل لإنشاء الرحلات')
      return
    }

    try {
      setSaving(true)
      const tripTypeDb = tripType === 'departure' ? 'departure' : 'arrival'
      const stopsToSave = useRouteDefaultStops ? [] : stopPoints

      if (editTripId) {
        const { error: updateErr } = await supabase
          .from('route_trips')
          .update({
            trip_date: selectedDates[0],
            meeting_time: meetingTime || null,
            departure_time: departureTime,
            start_location_name: startLocation.name,
            start_lat: startLocation.lat,
            start_lng: startLocation.lng,
            end_location_name: endLocation.name,
            end_lat: endLocation.lat,
            end_lng: endLocation.lng,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTripId)
        if (updateErr) throw updateErr

        // Update stop points: delete old and insert new
        const { error: delErr } = await supabase.from('route_trip_stop_points').delete().eq('trip_id', editTripId)
        if (delErr) throw delErr
        if (stopsToSave.length > 0) {
          const rows = stopsToSave.map((s, idx) => ({ trip_id: editTripId, name: s.name, lat: s.lat, lng: s.lng, order_index: idx }))
          const { error: insErr } = await supabase.from('route_trip_stop_points').insert(rows as any)
          if (insErr) throw insErr
        }

        toast.success('تم تحديث الرحلة بنجاح')
        onSuccess?.()
        onClose?.()
        return
      }

      // Create new trips
      for (const dateStr of selectedDates) {
        const { data: trip, error: tripErr } = await supabase
          .from('route_trips')
          .insert({
            route_id: routeId,
            trip_type: tripTypeDb,
            trip_date: dateStr,
            meeting_time: meetingTime || null,
            departure_time: departureTime,
            start_location_name: startLocation.name,
            start_lat: startLocation.lat,
            start_lng: startLocation.lng,
            end_location_name: endLocation.name,
            end_lat: endLocation.lat,
            end_lng: endLocation.lng,
            is_active: isActive,
          })
          .select('id')
          .single()
        if (tripErr) throw tripErr

        if (stopsToSave.length > 0) {
          const rows = stopsToSave.map((s, idx) => ({ trip_id: trip.id, name: s.name, lat: s.lat, lng: s.lng, order_index: idx }))
          const { error: insErr } = await supabase.from('route_trip_stop_points').insert(rows as any)
          if (insErr) throw insErr
        }
      }

      toast.success(`تم إنشاء ${selectedDates.length} رحلة بنجاح`)
      onSuccess?.()
      onClose?.()
    } catch (e: any) {
      console.error('Create trip error:', e)
      toast.error(e?.message || 'تعذر إنشاء الرحلات')
    } finally {
      setSaving(false)
    }
  }

  return {
    saving,
    saveTrip,
  }
}

