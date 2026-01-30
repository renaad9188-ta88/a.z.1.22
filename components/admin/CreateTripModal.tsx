'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, MapPin, Plus, Trash2 } from 'lucide-react'
import LocationSelector from '@/components/driver/LocationSelector'

type Route = {
  id: string
  name: string
}

type StopPoint = {
  name: string
  lat: number
  lng: number
}

const MAX_STOP_POINTS = 7

export default function CreateTripModal({
  routeId,
  routeName,
  tripType = 'arrival',
  defaultStart,
  defaultEnd,
  onClose,
  onSuccess,
  editTripId,
  editTripData,
  copyTripData,
}: {
  routeId: string
  routeName: string
  tripType?: 'arrival' | 'departure'
  defaultStart?: { name: string; lat: number; lng: number } | null
  defaultEnd?: { name: string; lat: number; lng: number } | null
  onClose: () => void
  onSuccess?: () => void
  editTripId?: string | null
  editTripData?: any
  copyTripData?: any
}) {
  const supabase = createSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  
  // Trip basic info
  const [tripDate, setTripDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  
  // Locations
  const [startLocation, setStartLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultStart || null)
  const [endLocation, setEndLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultEnd || null)
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])
  
  // Location selector modals
  const [showStartSelector, setShowStartSelector] = useState(false)
  const [showEndSelector, setShowEndSelector] = useState(false)
  const [showStopSelector, setShowStopSelector] = useState(false)
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null)
  
  // Recurring trips
  const [createRecurring, setCreateRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState(7)
  const [recurringEndDate, setRecurringEndDate] = useState('')

  const buildPreviewPoints = (override?: { selection?: 'start' | 'stop' | 'end'; editingIdx?: number | null }) => {
    const pts: Array<{ lat: number; lng: number; kind: 'start' | 'stop' | 'end'; label?: string }> = []
    if (startLocation) pts.push({ lat: startLocation.lat, lng: startLocation.lng, kind: 'start', label: 'بداية' })
    stopPoints.forEach((s, idx) => {
      // If editing a stop, keep its position too (initial is already placed); label is index+1
      if (override?.editingIdx != null && idx === override.editingIdx) {
        pts.push({ lat: s.lat, lng: s.lng, kind: 'stop', label: String(idx + 1) })
        return
      }
      pts.push({ lat: s.lat, lng: s.lng, kind: 'stop', label: String(idx + 1) })
    })
    if (endLocation) pts.push({ lat: endLocation.lat, lng: endLocation.lng, kind: 'end', label: 'نهاية' })
    return pts
  }

  // Set default date to today (only if not editing/copying)
  const editTripDataId = editTripData?.id
  const copyTripDataId = copyTripData?.id
  
  useEffect(() => {
    if (!editTripId && !editTripData && !copyTripData) {
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      setTripDate(`${yyyy}-${mm}-${dd}`)
    }
  }, [editTripId, editTripDataId, copyTripDataId])
  
  // Load trip data for editing or copying
  useEffect(() => {
    if (editTripData || copyTripData) {
      const tripData = editTripData || copyTripData
      
      // If copying, set date to today; if editing, use existing date
      if (copyTripData) {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        setTripDate(`${yyyy}-${mm}-${dd}`)
      } else if (editTripId) {
        setTripDate(tripData.trip_date || '')
      }
      
      setMeetingTime(tripData.meeting_time || '')
      setDepartureTime(tripData.departure_time || '')
      setStartLocation({
        name: tripData.start_location_name,
        lat: tripData.start_lat,
        lng: tripData.start_lng,
      })
      setEndLocation({
        name: tripData.end_location_name,
        lat: tripData.end_lat,
        lng: tripData.end_lng,
      })
      
      // Load stop points
      const loadStopPoints = async () => {
        const tripIdToLoad = editTripId || (copyTripData ? copyTripData.id : null)
        if (!tripIdToLoad) return
        
        const { data: stops, error } = await supabase
          .from('route_trip_stop_points')
          .select('name, lat, lng')
          .eq('trip_id', tripIdToLoad)
          .order('order_index', { ascending: true })
        
        if (!error && stops) {
          setStopPoints(stops.map((s: any) => ({
            name: s.name,
            lat: s.lat,
            lng: s.lng,
          })))
        }
      }
      
      if (editTripId || copyTripData) {
        loadStopPoints()
      }
    } else {
      // Reset form when not editing/copying
      setStopPoints([])
      setMeetingTime('')
      setDepartureTime('')
      setCreateRecurring(false)
      setRecurringDays(7)
      setRecurringEndDate('')
    }
  }, [editTripId, editTripDataId, copyTripDataId, editTripData, copyTripData, supabase])

  const handleAddStop = (point: StopPoint) => {
    if (editingStopIndex !== null) {
      // Edit existing stop
      const newStops = [...stopPoints]
      newStops[editingStopIndex] = point
      setStopPoints(newStops)
      setEditingStopIndex(null)
    } else {
      // Add new stop
      if (stopPoints.length >= MAX_STOP_POINTS) {
        toast.error(`يمكنك إضافة ${MAX_STOP_POINTS} محطات توقف كحد أقصى`)
        return
      }
      setStopPoints([...stopPoints, point])
    }
    setShowStopSelector(false)
  }

  const handleRemoveStop = (index: number) => {
    setStopPoints(stopPoints.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!tripDate) {
      toast.error('يرجى تحديد تاريخ الرحلة')
      return
    }
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

    try {
      setSaving(true)

      // Normalize trip type to DB canonical values (singular: 'arrival' or 'departure')
      const tripTypeDb = tripType === 'departure' ? 'departure' : 'arrival'

      // If editing, update existing trip
      if (editTripId) {
        // ✅ التحقق من وجود طلبات مرتبطة بالرحلة
        const { data: linkedRequests, error: checkErr } = await supabase
          .from('visit_requests')
          .select('id, visitor_name')
          .eq('trip_id', editTripId)
          .limit(10)
        
        if (checkErr) throw checkErr
        
        if (linkedRequests && linkedRequests.length > 0) {
          const count = linkedRequests.length
          const names = linkedRequests.slice(0, 3).map((r: any) => r.visitor_name).join('، ')
          const moreText = count > 3 ? ` و${count - 3} طلب آخر` : ''
          const confirmMessage = `⚠️ تحذير: هذه الرحلة مرتبطة بـ ${count} طلب/طلبات (${names}${moreText}).\n\nتعديل الرحلة قد يؤثر على الحجوزات المرتبطة.\n\nهل أنت متأكد من المتابعة؟`
          
          if (!confirm(confirmMessage)) {
            setSaving(false)
            return
          }
        }
        
        const { error: updateErr } = await supabase
          .from('route_trips')
          .update({
            trip_date: tripDate,
            meeting_time: meetingTime || null,
            departure_time: departureTime,
            start_location_name: startLocation.name,
            start_lat: startLocation.lat,
            start_lng: startLocation.lng,
            end_location_name: endLocation.name,
            end_lat: endLocation.lat,
            end_lng: endLocation.lng,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTripId)

        if (updateErr) throw updateErr

        // ✅ Logging: تسجيل تحديث الرحلة
        try {
          const { logTripUpdated } = await import('@/lib/audit')
          await logTripUpdated(editTripId, editTripData || {}, {
            trip_date: tripDate,
            meeting_time: meetingTime || null,
            departure_time: departureTime,
            start_location_name: startLocation.name,
            end_location_name: endLocation.name,
          })
        } catch (logErr) {
          console.error('Error logging trip update:', logErr)
          // لا نوقف العملية إذا فشل الـ logging
        }

        // Update stop points: delete old and insert new
        const { error: delErr } = await supabase
          .from('route_trip_stop_points')
          .delete()
          .eq('trip_id', editTripId)

        if (delErr) throw delErr

        if (stopPoints.length > 0) {
          const stopsData = stopPoints.map((stop, idx) => ({
            trip_id: editTripId,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            order_index: idx,
          }))

          const { error: stopsErr } = await supabase
            .from('route_trip_stop_points')
            .insert(stopsData)

          if (stopsErr) throw stopsErr
        }

        toast.success('تم تحديث الرحلة بنجاح')
        onSuccess?.()
        onClose()
        return
      }

      // Create new trip(s)
      // Determine dates to create trips for
      const datesToCreate: string[] = []

      if (createRecurring) {
        // Create recurring trips
        const startDate = new Date(tripDate)
        const endDate = recurringEndDate
          ? new Date(recurringEndDate)
          : new Date(startDate.getTime() + (recurringDays - 1) * 24 * 60 * 60 * 1000)

        const currentDate = new Date(startDate)
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0]
          datesToCreate.push(dateStr)
          currentDate.setDate(currentDate.getDate() + 1)
        }
      } else {
        // Single trip
        datesToCreate.push(tripDate)
      }

      // Create trips
      const createdTrips: string[] = []

      for (const dateStr of datesToCreate) {
        // 1) Create trip
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
            is_active: true,
          })
          .select('id')
          .single()

        if (tripErr) throw tripErr
        createdTrips.push(trip.id)

        // ✅ Logging: تسجيل إنشاء رحلة جديدة
        try {
          const { logTripCreated } = await import('@/lib/audit')
          await logTripCreated(trip.id, {
            route_id: routeId,
            trip_type: tripTypeDb,
            trip_date: dateStr,
            start_location_name: startLocation.name,
            end_location_name: endLocation.name,
          })
        } catch (logErr) {
          console.error('Error logging trip creation:', logErr)
          // لا نوقف العملية إذا فشل الـ logging
        }

        // 2) Create stop points
        if (stopPoints.length > 0) {
          const stopsData = stopPoints.map((stop, idx) => ({
            trip_id: trip.id,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            order_index: idx,
          }))

          const { error: stopsErr } = await supabase
            .from('route_trip_stop_points')
            .insert(stopsData)

          if (stopsErr) throw stopsErr
        }
      }

      toast.success(`تم إنشاء ${createdTrips.length} رحلة بنجاح`)
      onSuccess?.()
      onClose()
    } catch (e: any) {
      console.error('Create trip error:', e)
      toast.error(e?.message || 'تعذر إنشاء الرحلة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {editTripId 
              ? (tripType === 'departure' ? 'تعديل رحلة المغادرين' : 'تعديل رحلة القادمين')
              : (tripType === 'departure' ? 'إنشاء رحلة المغادرين' : 'إنشاء رحلة القادمين')
            } - {routeName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div lang="en" dir="ltr">
              <label className="block text-sm font-bold text-gray-800 mb-2">تاريخ الرحلة *</label>
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                lang="en"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">وقت التجمع</label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">وقت الانطلاق *</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Recurring Trips Option */}
          {!editTripId && (
            <div className="border-t border-gray-200 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRecurring}
                  onChange={(e) => setCreateRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-800">
                  إنشاء رحلات متكررة يومياً
                </span>
              </label>
              
              {createRecurring && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        عدد الأيام
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={recurringDays}
                        onChange={(e) => setRecurringDays(parseInt(e.target.value) || 7)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div lang="en" dir="ltr">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        أو تاريخ النهاية
                      </label>
                      <input
                        type="date"
                        value={recurringEndDate}
                        onChange={(e) => setRecurringEndDate(e.target.value)}
                        min={tripDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        lang="en"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    سيتم إنشاء رحلات يومية بنفس المسار ونقاط التوقف من {tripDate} حتى{' '}
                    {recurringEndDate || 
                      new Date(new Date(tripDate).getTime() + (recurringDays - 1) * 24 * 60 * 60 * 1000)
                        .toISOString().split('T')[0]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Start Location */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">نقطة الانطلاق *</label>
            {startLocation ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-800">{startLocation.name}</span>
                <button
                  type="button"
                  onClick={() => setShowStartSelector(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold"
                >
                  تعديل
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowStartSelector(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-sm font-semibold text-gray-700"
              >
                + تحديد نقطة الانطلاق
              </button>
            )}
          </div>

          {/* Stop Points */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">
              {tripType === 'departure' 
                ? `نقاط التحميل (الصعود) (${stopPoints.length}/${MAX_STOP_POINTS}) (اختياري)`
                : `نقاط النزول (التوقف) (${stopPoints.length}/${MAX_STOP_POINTS}) (اختياري)`}
            </label>
            <p className="text-xs text-gray-600 mb-2">
              {tripType === 'departure' 
                ? 'حدد نقاط التحميل التي سيركب منها الركاب عند المغادرة'
                : 'حدد نقاط النزول التي سينزل فيها الركاب عند القدوم'}
            </p>
            <div className="space-y-2">
              {stopPoints.map((stop, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-800 truncate">{stop.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStopIndex(idx)
                        setShowStopSelector(true)
                      }}
                      className="px-2 sm:px-3 py-1.5 sm:py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-semibold whitespace-nowrap"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(idx)}
                      className="p-1.5 sm:p-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {stopPoints.length < MAX_STOP_POINTS && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStopIndex(null)
                    setShowStopSelector(true)
                  }}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-sm font-semibold text-gray-700"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  {tripType === 'departure' ? 'إضافة نقطة تحميل (صعود)' : 'إضافة نقطة نزول (توقف)'}
                </button>
              )}
            </div>
          </div>

          {/* End Location */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">نقطة الوصول *</label>
            {endLocation ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-800">{endLocation.name}</span>
                <button
                  type="button"
                  onClick={() => setShowEndSelector(true)}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-semibold"
                >
                  تعديل
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEndSelector(true)}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-sm font-semibold text-gray-700"
              >
                + تحديد نقطة الوصول
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-semibold"
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !tripDate || !departureTime || !startLocation || !endLocation}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving 
              ? 'جارٍ الحفظ...' 
              : editTripId 
                ? 'حفظ التعديلات' 
                : 'إنشاء الرحلة'}
          </button>
        </div>

        {/* Location Selector Modals */}
        {showStartSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-3 sm:p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">تحديد نقطة الانطلاق</h4>
                <LocationSelector
                  title="نقطة الانطلاق"
                  initial={startLocation}
                  selectionKind="start"
                  previewPoints={buildPreviewPoints()}
                  onSelect={(loc) => {
                    setStartLocation(loc)
                    setShowStartSelector(false)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowStartSelector(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {showEndSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-3 sm:p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">تحديد نقطة الوصول</h4>
                <LocationSelector
                  title="نقطة الوصول"
                  initial={endLocation}
                  selectionKind="end"
                  previewPoints={buildPreviewPoints()}
                  onSelect={(loc) => {
                    setEndLocation(loc)
                    setShowEndSelector(false)
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowEndSelector(false)}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {showStopSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-3 sm:p-4">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <h4 className="text-lg font-bold text-gray-800 mb-4">
                  {editingStopIndex !== null
                    ? `${tripType === 'departure' ? 'تعديل نقطة التحميل (الصعود)' : 'تعديل نقطة النزول (التوقف)'} ${editingStopIndex + 1}`
                    : tripType === 'departure'
                    ? 'إضافة نقطة تحميل (صعود) جديدة'
                    : 'إضافة نقطة نزول (توقف) جديدة'}
                </h4>
                <LocationSelector
                  title={
                    editingStopIndex !== null
                      ? `${tripType === 'departure' ? 'نقطة التحميل (الصعود)' : 'نقطة النزول (التوقف)'} ${editingStopIndex + 1}`
                      : tripType === 'departure'
                      ? 'نقطة التحميل (الصعود)'
                      : 'نقطة النزول (التوقف)'
                  }
                  initial={editingStopIndex !== null ? stopPoints[editingStopIndex] : null}
                  selectionKind="stop"
                  previewPoints={buildPreviewPoints({ editingIdx: editingStopIndex })}
                  onSelect={handleAddStop}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowStopSelector(false)
                    setEditingStopIndex(null)
                  }}
                  className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

