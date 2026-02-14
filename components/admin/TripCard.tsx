'use client'

import { useState } from 'react'
import { MapPin, Navigation, Calendar, Clock, Users, Edit, Bus, X, Trash2, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface TripCardProps {
  trip: {
    id: string
    trip_type?: 'arrival' | 'departure'
    arrival_date?: string | null
    meeting_time?: string | null
    departure_time?: string | null
    start_location_name?: string
    end_location_name?: string
    is_active?: boolean
  }
  routeId: string
  isArrival: boolean
  passengersCount: number
  assignedDrivers: Array<{ id: string; name: string }>
  driverLiveMap?: Record<string, { is_available: boolean; updated_at?: string | null } | null>
  availableDrivers: Array<{ id: string; name: string; vehicle_type: string }>
  onEdit: (tripId: string) => void
  onViewDetails: (tripId: string) => void
  onShowPassengers: (tripId: string) => void
  onAssignDriver: (tripId: string, driverId: string) => void
  onUnassignDriver: (tripId: string, driverId: string) => void
  onReloadTrips?: () => void
}

export default function TripCard({
  trip,
  routeId,
  isArrival,
  passengersCount,
  assignedDrivers,
  driverLiveMap,
  availableDrivers,
  onEdit,
  onViewDetails,
  onShowPassengers,
  onAssignDriver,
  onUnassignDriver,
  onReloadTrips,
}: TripCardProps) {
  const supabase = createSupabaseBrowserClient()
  const [busy, setBusy] = useState(false)
  const tripDate = new Date(trip.arrival_date || '')
  const todayISO = new Date().toISOString().slice(0, 10)
  const isToday = String(trip.arrival_date || '').slice(0, 10) === todayISO
  const isActive = trip.is_active !== false

  const cancelTrip = async () => {
    if (!confirm('إلغاء هذه الرحلة (تعطيلها)؟')) return
    try {
      setBusy(true)
      const { error } = await supabase.from('route_trips').update({ is_active: false, updated_at: new Date().toISOString() } as any).eq('id', trip.id)
      if (error) throw error
      // also disable driver assignments for this trip
      await supabase.from('route_trip_drivers').update({ is_active: false } as any).eq('trip_id', trip.id)
      toast.success('تم إلغاء الرحلة')
      onReloadTrips?.()
    } catch (e: any) {
      console.error('cancelTrip error:', e)
      toast.error(e?.message || 'تعذر إلغاء الرحلة')
    } finally {
      setBusy(false)
    }
  }

  const deleteTrip = async () => {
    if (!confirm('حذف هذه الرحلة نهائياً؟')) return
    try {
      setBusy(true)
      // Guard: if any bookings exist, do not delete; offer cancel instead
      const { count } = await supabase
        .from('visit_requests')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', trip.id)
        .neq('status', 'rejected')

      if ((count || 0) > 0) {
        toast.error('لا يمكن حذف الرحلة لأنها تحتوي على حجوزات. يمكنك إلغاء الرحلة بدلاً من ذلك.')
        return
      }

      // Clean related rows first (safe)
      await supabase.from('route_trip_drivers').delete().eq('trip_id', trip.id)
      await supabase.from('route_trip_stop_points').delete().eq('trip_id', trip.id)
      const { error } = await supabase.from('route_trips').delete().eq('id', trip.id)
      if (error) throw error
      toast.success('تم حذف الرحلة')
      onReloadTrips?.()
    } catch (e: any) {
      console.error('deleteTrip error:', e)
      toast.error(e?.message || 'تعذر حذف الرحلة')
    } finally {
      setBusy(false)
    }
  }

  const trackingState = (() => {
    if (!isToday) return null
    if (!assignedDrivers || assignedDrivers.length === 0) return null
    if (!driverLiveMap) return { kind: 'unknown' as const, text: 'حالة التتبع غير معروفة' }

    const now = Date.now()
    const FIVE_MIN = 5 * 60 * 1000

    let anyOn = false
    let anyFresh = false
    let anyStale = false
    let anyOff = false

    for (const d of assignedDrivers) {
      const live = driverLiveMap[d.id]
      const on = Boolean(live?.is_available)
      if (on) anyOn = true
      if (!on) anyOff = true

      const updatedAt = live?.updated_at ? new Date(live.updated_at).getTime() : NaN
      const fresh = on && Number.isFinite(updatedAt) && now - updatedAt < FIVE_MIN
      const stale = on && (!Number.isFinite(updatedAt) || now - updatedAt >= FIVE_MIN)
      if (fresh) anyFresh = true
      if (stale) anyStale = true
    }

    if (anyFresh) return { kind: 'live' as const, text: 'التتبع يعمل الآن' }
    if (anyOn && anyStale) return { kind: 'stale' as const, text: '⚠️ التتبع متوقف/آخر تحديث قديم' }
    if (anyOff && !anyOn) return { kind: 'off' as const, text: 'التتبع غير مفعل من السائق' }
    return { kind: 'unknown' as const, text: 'حالة التتبع غير معروفة' }
  })()

  return (
    <div
      className={`group relative bg-white rounded-xl border-2 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 ${
        isArrival
          ? 'border-green-200 hover:border-green-400'
          : 'border-purple-200 hover:border-purple-400'
      }`}
    >
      {/* Gradient Header */}
      <div
        className={`h-2 ${
          isArrival
            ? 'bg-gradient-to-r from-green-500 via-emerald-500 to-green-600'
            : 'bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700'
        }`}
      />
      
      <div className="p-4 sm:p-5">
        {/* Trip Type Badge & Quick Actions */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold ${
              isArrival
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-purple-100 text-purple-800 border border-purple-300'
            }`}
          >
            {isArrival ? '🟢 القادمون' : '🟣 المغادرون'}
          </span>
          
          {/* Quick Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(trip.id)}
              className="px-2 sm:px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold"
              title="تعديل"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>تعديل</span>
            </button>
            {isActive && (
              <button
                onClick={cancelTrip}
                disabled={busy}
                className="px-2 sm:px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold disabled:opacity-50"
                title="إلغاء الرحلة"
              >
                <Ban className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>إلغاء</span>
              </button>
            )}
            <button
              onClick={deleteTrip}
              disabled={busy}
              className="px-2 sm:px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold disabled:opacity-50"
              title="حذف نهائي (بدون حجوزات)"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>حذف</span>
            </button>
          </div>
        </div>

        {!isActive && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 text-[11px] sm:text-xs font-extrabold">
              ⚫ هذه الرحلة ملغاة (غير نشطة)
            </span>
          </div>
        )}

        {/* Route Info */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 ${
              isArrival ? 'text-green-600' : 'text-purple-600'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                {trip.start_location_name}
              </p>
              <div className="flex items-center gap-1 my-1">
                <div className={`flex-1 h-0.5 ${
                  isArrival ? 'bg-green-200' : 'bg-purple-200'
                }`} />
                <Navigation className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  isArrival ? 'text-green-500' : 'text-purple-500'
                }`} />
                <div className={`flex-1 h-0.5 ${
                  isArrival ? 'bg-green-200' : 'bg-purple-200'
                }`} />
              </div>
              <p className="font-extrabold text-gray-900 text-xs sm:text-sm leading-tight truncate">
                {trip.end_location_name}
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
            <span className="font-semibold text-gray-700 truncate">
              {tripDate.toLocaleDateString('ar-JO', {
                weekday: 'long'
              })}, <span lang="en" dir="ltr">{String(tripDate.getDate()).padStart(2, '0')}/{String(tripDate.getMonth() + 1).padStart(2, '0')}/{tripDate.getFullYear()}</span>
            </span>
          </div>
          {trip.meeting_time && (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-600">
                تجمع: <span className="font-semibold">{trip.meeting_time}</span>
              </span>
            </div>
          )}
          {trip.departure_time && (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-600">
                انطلاق: <span className="font-semibold">{trip.departure_time}</span>
              </span>
            </div>
          )}
        </div>

        {/* Tracking status (today only) */}
        {trackingState && (
          <div className="mb-3 sm:mb-4">
            <div
              className={`px-3 py-2 rounded-xl border-2 text-[11px] sm:text-xs font-extrabold ${
                trackingState.kind === 'live'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : trackingState.kind === 'stale'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : trackingState.kind === 'off'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-gray-50 border-gray-200 text-gray-800'
              }`}
            >
              {trackingState.text}
            </div>
          </div>
        )}

        {/* Passengers Count */}
        <div className="mb-3 sm:mb-4 pt-2 sm:pt-3 border-t border-gray-100">
          <button
            onClick={() => onShowPassengers(trip.id)}
            className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-gray-700 hover:text-blue-600 transition cursor-pointer w-full text-right"
            disabled={passengersCount === 0}
          >
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>
              عدد الحاجزين: <span className={`font-bold ${passengersCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {passengersCount}
              </span>
            </span>
          </button>
        </div>

        {/* Assigned Drivers */}
        {assignedDrivers.length > 0 && (
          <div className="mb-3 sm:mb-4 pt-2 sm:pt-3 border-t border-gray-100">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">السائقون المعيّنون:</p>
            <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2">
              {assignedDrivers.map((driver) => (
                <span
                  key={driver.id}
                  className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-50 text-gray-700 rounded-lg text-[10px] sm:text-xs font-medium border border-gray-200 group/driver"
                >
                  <Bus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="truncate max-w-[80px] sm:max-w-none">{driver.name}</span>
                  <button
                    onClick={() => onUnassignDriver(trip.id, driver.id)}
                    className="ml-1 p-0.5 text-red-600 hover:bg-red-100 rounded transition opacity-0 group-hover/driver:opacity-100"
                    title="إزالة السائق"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Assign Driver Dropdown */}
        <div className="mb-3 sm:mb-4 pt-2 sm:pt-3 border-t border-gray-100">
          <label className="block text-[10px] sm:text-xs font-semibold text-gray-700 mb-1.5 sm:mb-2">
            {assignedDrivers.length > 0 
              ? 'إضافة سائق آخر:' 
              : 'ربط سائق بالرحلة:'}
          </label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAssignDriver(trip.id, e.target.value)
                e.target.value = ''
              }
            }}
            disabled={!isActive}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-gray-900 bg-white border border-gray-300 rounded-lg text-[10px] sm:text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">اختر سائق...</option>
            {availableDrivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name} - {driver.vehicle_type}
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 sm:pt-3 border-t border-gray-100">
          <button
            onClick={() => onViewDetails(trip.id)}
            className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-[10px] sm:text-xs font-semibold"
          >
            عرض التفاصيل
          </button>
          <button
            onClick={() => onEdit(trip.id)}
            disabled={!isActive}
            className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition text-[10px] sm:text-xs font-extrabold disabled:opacity-50"
          >
            تعديل
          </button>
        </div>
      </div>
    </div>
  )
}

