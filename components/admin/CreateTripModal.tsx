'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, MapPin, Plus, Trash2, Edit, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'

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

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).google?.maps) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')))
      return
    }

    const script = document.createElement('script')
    script.dataset.googleMaps = '1'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [useRouteDefaultStops, setUseRouteDefaultStops] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)
  const [addingStopFromMap, setAddingStopFromMap] = useState(false)
  const [editingLocation, setEditingLocation] = useState<'start' | 'end' | number | null>(null)
  
  // Trip basic info
  const [tripDate, setTripDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  
  // Locations
  const [startLocation, setStartLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultStart || null)
  const [endLocation, setEndLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultEnd || null)
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])
  
  // Recurring trips
  const [createRecurring, setCreateRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState(7)
  const [recurringEndDate, setRecurringEndDate] = useState('')

  // Map refs
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)

  // Load Google Maps
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('Maps load error:', e)
        toast.error('تعذر تحميل Google Maps')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

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
          if (stops.length > 0) {
            setUseRouteDefaultStops(false)
            setShowAdvanced(true)
          } else {
            setUseRouteDefaultStops(true)
          }
        }
      }
      
      if (editTripId || copyTripData) {
        loadStopPoints()
      }
    } else {
      setStopPoints([])
      setMeetingTime('')
      setDepartureTime('')
      setCreateRecurring(false)
      setRecurringDays(7)
      setRecurringEndDate('')
      setShowAdvanced(false)
      setUseRouteDefaultStops(true)
    }
  }, [editTripId, editTripDataId, copyTripDataId, editTripData, copyTripData, supabase])

  // Initialize map
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      const center = startLocation 
        ? { lat: startLocation.lat, lng: startLocation.lng }
        : { lat: 32.5456, lng: 35.825 }
      
      mapObjRef.current = new googleMaps.Map(mapRef.current!, {
        center,
        zoom: 9,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        zoomControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'greedy',
      })

      directionsServiceRef.current = new googleMaps.DirectionsService()
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      })
      directionsRendererRef.current.setMap(mapObjRef.current)

      infoWindowRef.current = new googleMaps.InfoWindow()

      // Click handler for adding stops
      mapObjRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!addingStopFromMap || !e.latLng) return
        if (stopPoints.length >= MAX_STOP_POINTS) {
          toast.error(`يمكنك إضافة ${MAX_STOP_POINTS} محطات كحد أقصى`)
          setAddingStopFromMap(false)
          return
        }

        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        
        // Use Geocoder to get address
        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const name = results[0].formatted_address || `محطة ${stopPoints.length + 1}`
            handleAddStop({ name, lat, lng })
            setAddingStopFromMap(false)
            toast.success('تم إضافة المحطة')
          } else {
            const name = `محطة ${stopPoints.length + 1}`
            handleAddStop({ name, lat, lng })
            setAddingStopFromMap(false)
            toast.success('تم إضافة المحطة')
          }
        })
      })
    }
  }, [mapsReady, addingStopFromMap, stopPoints.length])

  // Render map markers and route
  useEffect(() => {
    if (!mapsReady || !mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapObjRef.current

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    const allPoints: Array<{ lat: number; lng: number; name: string; type: 'start' | 'stop' | 'end'; index?: number }> = []

    // Start marker
    if (startLocation) {
      allPoints.push({ ...startLocation, type: 'start' })
      const marker = new googleMaps.Marker({
        position: { lat: startLocation.lat, lng: startLocation.lng },
        map,
        title: `الانطلاق: ${startLocation.name}`,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
        draggable: true,
      })
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const latLng = e.latLng
        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: latLng }, (results) => {
          const name = results && results[0] ? results[0].formatted_address : startLocation.name
          setStartLocation({ name, lat: latLng.lat(), lng: latLng.lng() })
        })
      })
      marker.addListener('click', () => {
        setEditingLocation('start')
      })
      markersRef.current.push(marker)
    }

    // Stop markers
    stopPoints.forEach((stop, idx) => {
      allPoints.push({ ...stop, type: 'stop', index: idx })
      const marker = new googleMaps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        title: `محطة ${idx + 1}: ${stop.name}`,
        label: {
          text: String(idx + 1),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        draggable: true,
      })
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const latLng = e.latLng
        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: latLng }, (results) => {
          const name = results && results[0] ? results[0].formatted_address : stop.name
          const newStops = [...stopPoints]
          newStops[idx] = { name, lat: latLng.lat(), lng: latLng.lng() }
          setStopPoints(newStops)
        })
      })
      marker.addListener('click', () => {
        setEditingLocation(idx)
      })
      markersRef.current.push(marker)
    })

    // End marker
    if (endLocation) {
      allPoints.push({ ...endLocation, type: 'end' })
      const marker = new googleMaps.Marker({
        position: { lat: endLocation.lat, lng: endLocation.lng },
        map,
        title: `الوصول: ${endLocation.name}`,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        draggable: true,
      })
      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const latLng = e.latLng
        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: latLng }, (results) => {
          const name = results && results[0] ? results[0].formatted_address : endLocation.name
          setEndLocation({ name, lat: latLng.lat(), lng: latLng.lng() })
        })
      })
      marker.addListener('click', () => {
        setEditingLocation('end')
      })
      markersRef.current.push(marker)
    }

    // Draw route with Directions API if we have start and end
    if (startLocation && endLocation && directionsServiceRef.current && directionsRendererRef.current) {
      const waypoints: google.maps.DirectionsWaypoint[] = stopPoints.map((stop) => ({
        location: { lat: stop.lat, lng: stop.lng },
        stopover: true,
      }))

      directionsServiceRef.current.route(
        {
          origin: { lat: startLocation.lat, lng: startLocation.lng },
          destination: { lat: endLocation.lat, lng: endLocation.lng },
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          travelMode: googleMaps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result)
          }
        }
      )
    } else if (allPoints.length > 1) {
      // Fallback: simple polyline
      const path = allPoints.map((p) => ({ lat: p.lat, lng: p.lng }))
      polylineRef.current = new googleMaps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      })
      polylineRef.current.setMap(map)
    }

    // Fit bounds
    if (allPoints.length > 0) {
      const bounds = new googleMaps.LatLngBounds()
      allPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
      map.fitBounds(bounds, 50)
    }
  }, [mapsReady, startLocation, endLocation, stopPoints, showAdvanced])

  const handleAddStop = (point: StopPoint) => {
    if (typeof editingLocation === 'number') {
      const newStops = [...stopPoints]
      newStops[editingLocation] = point
      setStopPoints(newStops)
      setEditingLocation(null)
    } else {
      if (stopPoints.length >= MAX_STOP_POINTS) {
        toast.error(`يمكنك إضافة ${MAX_STOP_POINTS} محطات كحد أقصى`)
        return
      }
      setStopPoints([...stopPoints, point])
    }
  }

  const handleRemoveStop = (index: number) => {
    setStopPoints(stopPoints.filter((_, i) => i !== index))
  }

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === stopPoints.length - 1) return
    
    const newStops = [...stopPoints]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]]
    setStopPoints(newStops)
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
      const tripTypeDb = tripType === 'departure' ? 'departure' : 'arrival'
      const stopsToSave = useRouteDefaultStops ? [] : stopPoints

      if (editTripId) {
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
          if (!confirm(`⚠️ تحذير: هذه الرحلة مرتبطة بـ ${count} طلب/طلبات (${names}${moreText}).\n\nتعديل الرحلة قد يؤثر على الحجوزات المرتبطة.\n\nهل أنت متأكد من المتابعة؟`)) {
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
        }

        const { error: delErr } = await supabase
          .from('route_trip_stop_points')
          .delete()
          .eq('trip_id', editTripId)

        if (delErr) throw delErr

        if (stopsToSave.length > 0) {
          const stopsData = stopsToSave.map((stop, idx) => ({
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

      const datesToCreate: string[] = []

      if (createRecurring) {
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
        datesToCreate.push(tripDate)
      }

      const createdTrips: string[] = []

      for (const dateStr of datesToCreate) {
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
        }

        if (stopsToSave.length > 0) {
          const stopsData = stopsToSave.map((stop, idx) => ({
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-7xl w-full mx-2 sm:mx-4 max-h-[95vh] overflow-hidden flex flex-col">
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

        {/* Content: Split layout */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Map (60%) */}
          <div className="flex-1 lg:w-3/5 border-r border-gray-200 flex flex-col">
            {showAdvanced && (
              <div className="p-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-bold text-blue-900">
                    {addingStopFromMap 
                      ? 'انقر على الخريطة لإضافة محطة جديدة' 
                      : 'انقر على المحطات لتعديلها أو اسحبها لتحريكها'}
                  </p>
                  {!addingStopFromMap && stopPoints.length < MAX_STOP_POINTS && (
                    <button
                      type="button"
                      onClick={() => setAddingStopFromMap(true)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة من الخريطة
                    </button>
                  )}
                  {addingStopFromMap && (
                    <button
                      type="button"
                      onClick={() => setAddingStopFromMap(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs font-semibold"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            )}
            <div ref={mapRef} className="flex-1 min-h-[400px] bg-gray-100" />
            {!apiKey && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200 text-sm text-yellow-800">
                ⚠️ مفتاح Google Maps غير موجود. لن تعمل الخريطة.
              </div>
            )}
          </div>

          {/* Right: Details Panel (40%) */}
          <div className="lg:w-2/5 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Simple vs Advanced */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">وضع المكتب</p>
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
                      الافتراضي: إنشاء سريع (تاريخ + أوقات). المحطات ستؤخذ من محطات الخط تلقائياً.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((p) => !p)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs sm:text-sm font-extrabold text-gray-900"
                  >
                    {showAdvanced ? 'إخفاء الإعدادات المتقدمة' : 'إعدادات متقدمة'}
                  </button>
                </div>
              </div>

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

              {/* Recurring Trips */}
              {showAdvanced && !editTripId && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createRecurring}
                      onChange={(e) => setCreateRecurring(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-gray-800">إنشاء رحلات متكررة يومياً</span>
                  </label>
                  
                  {createRecurring && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">عدد الأيام</label>
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
                          <label className="block text-xs font-medium text-gray-700 mb-1">أو تاريخ النهاية</label>
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
                    </div>
                  )}
                </div>
              )}

              {/* Route Details (Advanced) */}
              {showAdvanced && (
                <>
                  {/* Start Location */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">نقطة الانطلاق *</label>
                    {startLocation ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-800 truncate">{startLocation.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('اسم نقطة الانطلاق:', startLocation.name)
                            if (name) setStartLocation({ ...startLocation, name })
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-semibold"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">اسحب المحدد الأخضر على الخريطة</p>
                    )}
                  </div>

                  {/* Stop Points */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useRouteDefaultStops}
                          onChange={(e) => setUseRouteDefaultStops(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-extrabold text-gray-900">
                          استخدم محطات الخط الافتراضية (مستحسن)
                        </span>
                      </label>
                    </div>

                    {!useRouteDefaultStops && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-bold text-gray-800">
                            {tripType === 'departure' ? 'محطات الصعود' : 'محطات النزول'} ({stopPoints.length}/{MAX_STOP_POINTS})
                          </label>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {stopPoints.map((stop, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {idx + 1}
                              </span>
                              <span className="flex-1 text-xs sm:text-sm text-gray-800 truncate">{stop.name}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-30"
                                  title="نقل لأعلى"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStop(idx, 'down')}
                                  disabled={idx === stopPoints.length - 1}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-30"
                                  title="نقل لأسفل"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const name = prompt('اسم المحطة:', stop.name)
                                    if (name) {
                                      const newStops = [...stopPoints]
                                      newStops[idx] = { ...stop, name }
                                      setStopPoints(newStops)
                                    }
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  title="تعديل"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStop(idx)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* End Location */}
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">نقطة الوصول *</label>
                    {endLocation ? (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-800 truncate">{endLocation.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('اسم نقطة الوصول:', endLocation.name)
                            if (name) setEndLocation({ ...endLocation, name })
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-semibold"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">اسحب المحدد الأحمر على الخريطة</p>
                    )}
                  </div>
                </>
              )}

              {/* Simple mode summary */}
              {!showAdvanced && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900 mb-2">المسار</p>
                  <div className="text-xs sm:text-sm text-gray-700 space-y-1">
                    <div><span className="font-bold">الانطلاق:</span> {startLocation?.name || '—'}</div>
                    <div><span className="font-bold">الوصول:</span> {endLocation?.name || '—'}</div>
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
                    لتعديل المسار أو إضافة محطات خاصة، افتح &quot;الإعدادات المتقدمة&quot;.
                  </p>
                </div>
              )}
            </div>
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
      </div>
    </div>
  )
}
