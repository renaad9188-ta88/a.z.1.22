'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, MapPin, Plus, Trash2, Edit, ArrowUp, ArrowDown } from 'lucide-react'
import { loadGoogleMaps } from './trip-creation/utils'
import { useDateSelection } from './trip-creation/hooks/useDateSelection'
import { useRouteStops } from './trip-creation/hooks/useRouteStops'
import { useTripStops } from './trip-creation/hooks/useTripStops'
import { useTripSave } from './trip-creation/hooks/useTripSave'
import type { StopKind, LocationPoint } from './trip-creation/types'
import { MAX_STOP_POINTS } from './trip-creation/types'

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

  const stopKindForTrip: StopKind = tripType === 'departure' ? 'pickup' : 'dropoff'
  const stopLabel = tripType === 'departure' ? 'محطات الصعود' : 'محطات النزول'
  const stopLabelSingular = tripType === 'departure' ? 'محطة صعود' : 'محطة نزول'

  const [saving, setSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [useRouteDefaultStops, setUseRouteDefaultStops] = useState(true)

  // Days selection
  const [createMode, setCreateMode] = useState<'single' | 'span' | 'pick'>('span')
  const [tripDate, setTripDate] = useState('')
  const [spanDays, setSpanDays] = useState(7)
  const [pickStart, setPickStart] = useState('')
  const [pickEnd, setPickEnd] = useState('')
  const [pickedMap, setPickedMap] = useState<Record<string, boolean>>({})

  // Trip basic info
  const [meetingTime, setMeetingTime] = useState('')
  const [departureTime, setDepartureTime] = useState('')

  // Locations (editable by dragging + name prompt)
  const [startLocation, setStartLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultStart || null)
  const [endLocation, setEndLocation] = useState<{ name: string; lat: number; lng: number } | null>(defaultEnd || null)

  // Per-trip custom stops
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])

  // Route default stops (filtered by trip type)
  const [routeStops, setRouteStops] = useState<RouteStopRow[]>([])
  const [routeStopsLoading, setRouteStopsLoading] = useState(false)
  const [editingRouteStops, setEditingRouteStops] = useState(false)

  // Map
  const [mapsReady, setMapsReady] = useState(false)
  const [mapAddMode, setMapAddMode] = useState<'none' | 'trip_stop' | 'route_stop'>('none')
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)

  const pickDatesList = useMemo(() => dateRangeDays(pickStart, pickEnd), [pickStart, pickEnd])

  const selectedDates = useMemo(() => {
    if (editTripId) return tripDate ? [tripDate] : []

    if (createMode === 'single') return tripDate ? [tripDate] : []

    if (createMode === 'span') {
      if (!tripDate) return []
      const start = new Date(tripDate + 'T00:00:00')
      if (isNaN(start.getTime())) return []
      const n = Math.max(1, Math.min(30, Number(spanDays) || 1))
      const out: string[] = []
      const cur = new Date(start)
      for (let i = 0; i < n; i++) {
        out.push(toYmd(cur))
        cur.setDate(cur.getDate() + 1)
      }
      return out
    }

    // pick
    return pickDatesList.filter((d) => pickedMap[d])
  }, [createMode, editTripId, pickDatesList, pickedMap, spanDays, tripDate])

  const activeStopPoints = useMemo(() => {
    if (useRouteDefaultStops) {
      return (routeStops || []).map((s) => ({ name: s.name, lat: Number(s.lat), lng: Number(s.lng) }))
    }
    return stopPoints
  }, [routeStops, stopPoints, useRouteDefaultStops])

  // Set initial dates (today) if not editing/copying
  useEffect(() => {
    if (editTripId || editTripData || copyTripData) return
    const todayYmd = toYmd(new Date())
    setTripDate(todayYmd)
    setPickStart(todayYmd)
    setPickEnd(toYmd(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)))
  }, [editTripId, editTripData, copyTripData])

  // Load trip data for editing/copying
  useEffect(() => {
    const tripData = editTripData || copyTripData
    if (!tripData) return

    if (copyTripData) {
      const todayYmd = toYmd(new Date())
      setTripDate(todayYmd)
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

    const loadTripStops = async () => {
      const tripIdToLoad = editTripId || (copyTripData ? copyTripData.id : null)
      if (!tripIdToLoad) return
      const { data: stops, error } = await supabase
        .from('route_trip_stop_points')
        .select('name,lat,lng')
        .eq('trip_id', tripIdToLoad)
        .order('order_index', { ascending: true })
      if (!error && stops) {
        setStopPoints((stops as any[]).map((s: any) => ({ name: s.name, lat: s.lat, lng: s.lng })))
        if ((stops as any[]).length > 0) setUseRouteDefaultStops(false)
      }
    }

    loadTripStops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTripId, editTripData?.id, copyTripData?.id])


  // Google Maps load
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

  // init map once
  useEffect(() => {
    if (!mapsReady || !mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      const center = startLocation ? { lat: startLocation.lat, lng: startLocation.lng } : { lat: 32.5456, lng: 35.825 }
      mapObjRef.current = new googleMaps.Map(mapElRef.current, {
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

      mapObjRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const mode = mapAddMode
        if (mode === 'none') return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()

        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, async (results) => {
          const name = results && results[0] ? results[0].formatted_address : stopLabelSingular

          if (mode === 'trip_stop') {
            const added = addStopPoint({ name, lat, lng })
            if (!added) {
              toast.error(`يمكنك إضافة ${MAX_STOP_POINTS} محطات كحد أقصى`)
            } else {
              toast.success('تمت إضافة محطة للرحلة')
            }
            setMapAddMode('none')
            return
          }

          // mode === 'route_stop'
          try {
            const nextIdx = (routeStops || []).reduce((m, s) => Math.max(m, Number(s.order_index || 0)), -1) + 1
            const { error } = await supabase.from('route_stop_points').insert({
              route_id: routeId,
              name,
              description: null,
              lat,
              lng,
              order_index: nextIdx,
              is_active: true,
              stop_kind: stopKindForTrip,
            } as any)
            if (error) throw error
            toast.success('تمت إضافة محطة للخط')
            await loadRouteStops()
          } catch (err: any) {
            console.error('add route stop error:', err)
            toast.error(err?.message || 'تعذر إضافة محطة للخط')
          } finally {
            setMapAddMode('none')
          }
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady])

  // render markers + route polyline
  useEffect(() => {
    if (!mapsReady || !mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapObjRef.current

    // clear markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    const pointsForRoute = activeStopPoints
    const allPts: Array<{ lat: number; lng: number }> = []

    // start
    if (startLocation) {
      allPts.push({ lat: startLocation.lat, lng: startLocation.lng })
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
      markersRef.current.push(marker)
    }

    // stops
    pointsForRoute.forEach((s, idx) => {
      allPts.push({ lat: s.lat, lng: s.lng })
      const draggable = useRouteDefaultStops ? editingRouteStops : true
      const marker = new googleMaps.Marker({
        position: { lat: s.lat, lng: s.lng },
        map,
        title: `${stopLabelSingular} ${idx + 1}: ${s.name}`,
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
        draggable,
      })

      marker.addListener('dragend', async (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const latLng = e.latLng
        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: latLng }, async (results) => {
          const name = results && results[0] ? results[0].formatted_address : s.name
          if (!useRouteDefaultStops) {
            setStopPoints((prev) => prev.map((x, i) => (i === idx ? { name, lat: latLng.lat(), lng: latLng.lng() } : x)))
            return
          }

          // route stops update only when editing
          if (!editingRouteStops) return
          const row = routeStops[idx]
          if (!row?.id) return
          try {
            const { error } = await supabase
              .from('route_stop_points')
              .update({ name, lat: latLng.lat(), lng: latLng.lng(), updated_at: new Date().toISOString() } as any)
              .eq('id', row.id)
            if (error) throw error
            await loadRouteStops()
          } catch (err) {
            console.error('route stop drag update error:', err)
          }
        })
      })

      markersRef.current.push(marker)
    })

    // end
    if (endLocation) {
      allPts.push({ lat: endLocation.lat, lng: endLocation.lng })
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
      markersRef.current.push(marker)
    }

    // directions (nice route)
    if (startLocation && endLocation && directionsServiceRef.current && directionsRendererRef.current) {
      const waypoints: google.maps.DirectionsWaypoint[] = pointsForRoute.map((p) => ({
        location: { lat: p.lat, lng: p.lng },
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
          if (status === 'OK' && directionsRendererRef.current) directionsRendererRef.current.setDirections(result)
        }
      )
    } else if (allPts.length > 1) {
      polylineRef.current = new googleMaps.Polyline({
        path: allPts,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      })
      polylineRef.current.setMap(map)
    }

    if (allPts.length > 0) {
      const bounds = new googleMaps.LatLngBounds()
      allPts.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds, 60)
    }
  }, [
    activeStopPoints,
    editingRouteStops,
    endLocation,
    loadRouteStops,
    mapsReady,
    routeStops,
    startLocation,
    supabase,
    useRouteDefaultStops,
  ])

  const moveInList = (kind: 'route' | 'trip', index: number, dir: -1 | 1) => {
    if (kind === 'trip') {
      moveStopPoint(index, dir)
      return
    }
    moveRouteStop(index, dir)
  }

  const editName = (kind: 'route' | 'trip', index: number) => {
    if (kind === 'trip') {
      const cur = stopPoints[index]
      const name = prompt('اسم المحطة:', cur?.name || '')
      if (name) editStopPointName(index, name)
      return
    }
    editRouteStopName(index)
  }

  const removeStop = (kind: 'route' | 'trip', index: number) => {
    if (kind === 'trip') {
      removeStopPoint(index)
      return
    }
    removeRouteStop(index)
  }

  const handleSave = async () => {
    await saveTrip(
      selectedDates,
      meetingTime,
      departureTime,
      startLocation,
      endLocation,
      stopPoints,
      useRouteDefaultStops,
      editTripId
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-7xl w-full mx-2 sm:mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            {editTripId ? 'تعديل' : 'إنشاء'} {tripType === 'departure' ? 'رحلات المغادرين' : 'رحلات القادمين'} — {routeName}
          </h3>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Map */}
          <div className="flex-1 lg:w-3/5 border-r border-gray-200 flex flex-col">
            {showAdvanced && (
              <div className="p-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-bold text-blue-900">
                    {mapAddMode === 'route_stop'
                      ? `انقر على الخريطة لإضافة ${stopLabelSingular} للخط`
                      : mapAddMode === 'trip_stop'
                      ? `انقر على الخريطة لإضافة ${stopLabelSingular} لهذه الرحلة`
                      : 'اسحب العلامات لتعديل المسار'}
                  </p>

                  <div className="flex items-center gap-2">
                    {editingRouteStops && (
                      <button
                        type="button"
                        onClick={() => setMapAddMode(mapAddMode === 'route_stop' ? 'none' : 'route_stop')}
                        className="px-3 py-1.5 bg-white border border-blue-300 text-blue-800 rounded-lg hover:bg-blue-50 text-xs font-extrabold"
                        disabled={saving}
                      >
                        <Plus className="w-3 h-3 inline ml-1" />
                        إضافة محطة للخط
                      </button>
                    )}

                    {!useRouteDefaultStops && (
                      <button
                        type="button"
                        onClick={() => setMapAddMode(mapAddMode === 'trip_stop' ? 'none' : 'trip_stop')}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-extrabold"
                        disabled={saving}
                      >
                        <Plus className="w-3 h-3 inline ml-1" />
                        إضافة محطة للرحلة
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={mapElRef} className="flex-1 min-h-[400px] bg-gray-100" />

            {!apiKey && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200 text-sm text-yellow-800">
                ⚠️ مفتاح Google Maps غير موجود. لن تعمل الخريطة.
              </div>
            )}
          </div>

          {/* Panel */}
          <div className="lg:w-2/5 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-gray-900">الإنشاء في خطوة واحدة</p>
                    <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
                      نفس القسم فقط: {tripType === 'departure' ? 'مغادرون (صعود)' : 'قادمون (نزول)'} — بدون خلط.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((p) => !p)}
                    className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs sm:text-sm font-extrabold text-gray-900"
                  >
                    {showAdvanced ? 'إخفاء' : 'إظهار'} الخريطة والتفاصيل
                  </button>
                </div>
              </div>

              {/* Days */}
              {!editTripId ? (
                <div className="border border-gray-200 rounded-xl p-3">
                  <p className="text-sm font-extrabold text-gray-900 mb-3">إنشاء مرن للأيام</p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateMode('single')}
                      className={`px-3 py-2 rounded-lg text-xs font-extrabold border ${
                        createMode === 'single' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      يوم واحد
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMode('span')}
                      className={`px-3 py-2 rounded-lg text-xs font-extrabold border ${
                        createMode === 'span' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      عدة أيام متتالية
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMode('pick')}
                      className={`px-3 py-2 rounded-lg text-xs font-extrabold border ${
                        createMode === 'pick' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      اختيار أيام
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <div lang="en" dir="ltr">
                      <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ البداية</label>
                      <input
                        type="date"
                        value={tripDate}
                        onChange={(e) => setTripDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        lang="en"
                      />
                    </div>

                    {createMode === 'span' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">عدد الأيام</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={spanDays}
                          onChange={(e) => setSpanDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <p className="mt-1 text-[11px] text-gray-500">مثال: 2 أو 3 أيام أو 7 أيام (أسبوع).</p>
                      </div>
                    )}

                    {createMode === 'pick' && (
                      <>
                        <div className="grid grid-cols-2 gap-2" lang="en" dir="ltr">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">من</label>
                            <input
                              type="date"
                              value={pickStart}
                              onChange={(e) => setPickStart(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              lang="en"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">إلى</label>
                            <input
                              type="date"
                              value={pickEnd}
                              onChange={(e) => setPickEnd(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              lang="en"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const m: Record<string, boolean> = {}
                              pickDatesList.forEach((d) => (m[d] = true))
                              setPickedMap(m)
                            }}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-extrabold"
                          >
                            تحديد الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => setPickedMap({})}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-extrabold"
                          >
                            إلغاء التحديد
                          </button>
                        </div>

                        <div className="max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1">
                          {pickDatesList.length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-2">اختر نطاق تواريخ صحيح.</p>
                          ) : (
                            pickDatesList.map((d) => (
                              <label key={d} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-xs font-extrabold text-gray-900" lang="en" dir="ltr">
                                  {d}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={Boolean(pickedMap[d])}
                                  onChange={(e) => setPickedMap((p) => ({ ...p, [d]: e.target.checked }))}
                                  className="w-4 h-4"
                                />
                              </label>
                            ))
                          )}
                        </div>
                      </>
                    )}

                    <div className="text-xs text-gray-700">
                      <span className="font-extrabold">سيتم إنشاء:</span> {selectedDates.length} رحلة
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-3">
                  <p className="text-sm font-extrabold text-gray-900 mb-3">تعديل رحلة واحدة</p>
                  <div lang="en" dir="ltr">
                    <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الرحلة</label>
                    <input
                      type="date"
                      value={tripDate}
                      onChange={(e) => setTripDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      lang="en"
                    />
                  </div>
                </div>
              )}

              {/* Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {/* Start/End */}
              {showAdvanced && (
                <div className="border border-gray-200 rounded-xl p-3 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">نقطة الانطلاق</label>
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <MapPin className="w-4 h-4 text-green-700" />
                      <span className="text-xs font-extrabold text-gray-900 flex-1 truncate">{startLocation?.name || '—'}</span>
                      {startLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('اسم نقطة الانطلاق:', startLocation.name)
                            if (name) setStartLocation({ ...startLocation, name })
                          }}
                          className="p-1.5 rounded-lg border border-green-200 hover:bg-green-100"
                          title="تعديل الاسم"
                        >
                          <Edit className="w-4 h-4 text-green-800" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">نقطة الوصول</label>
                    <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <MapPin className="w-4 h-4 text-red-700" />
                      <span className="text-xs font-extrabold text-gray-900 flex-1 truncate">{endLocation?.name || '—'}</span>
                      {endLocation && (
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('اسم نقطة الوصول:', endLocation.name)
                            if (name) setEndLocation({ ...endLocation, name })
                          }}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-100"
                          title="تعديل الاسم"
                        >
                          <Edit className="w-4 h-4 text-red-800" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500">يمكنك أيضاً سحب العلامات على الخريطة لتعديل الإحداثيات.</p>
                </div>
              )}

              {/* Stops */}
              <div className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-extrabold text-gray-900">{stopLabel} (لنفس القسم فقط)</p>
                  <button
                    type="button"
                    onClick={() => setEditingRouteStops((p) => !p)}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-extrabold"
                    disabled={saving}
                  >
                    {editingRouteStops ? 'إنهاء تعديل محطات الخط' : 'تعديل محطات الخط هنا'}
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRouteDefaultStops}
                    onChange={(e) => setUseRouteDefaultStops(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900">
                    استخدم محطات الخط الافتراضية لهذه الرحلة (مستحسن)
                  </span>
                </label>
                <p className="text-[11px] text-gray-600 mt-1">
                  عند التفعيل: لا نحفظ محطات خاصة للرحلة. أي تعديل للمحطات هنا ينعكس على الرحلات القادمة تلقائياً.
                </p>

                {routeStopsLoading ? (
                  <div className="text-center py-4 text-xs text-gray-600">جاري تحميل محطات الخط...</div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {(routeStops || []).length === 0 ? (
                      <div className="text-center py-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600">
                        لا توجد محطات ضمن هذا القسم. {editingRouteStops ? 'استخدم "إضافة محطة للخط" من الخريطة.' : ''}
                      </div>
                    ) : (
                      (routeStops || []).map((s, idx) => (
                        <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-extrabold">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-xs sm:text-sm font-bold text-gray-900 truncate">{s.name}</span>
                          {editingRouteStops && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveInList('route', idx, -1)}
                                disabled={idx === 0 || saving}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30"
                                title="أعلى"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveInList('route', idx, 1)}
                                disabled={idx === routeStops.length - 1 || saving}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30"
                                title="أسفل"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => editName('route', idx)}
                                disabled={saving}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4 text-blue-700" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStop('route', idx)}
                                disabled={saving}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4 text-red-700" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {!useRouteDefaultStops && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <p className="text-xs font-extrabold text-gray-900 mb-2">محطات خاصة لهذه الرحلة (استثناء)</p>
                    <p className="text-[11px] text-gray-600 mb-2">
                      هذه المحطات لا تغيّر محطات الخط. استخدم زر &quot;إضافة محطة للرحلة&quot; من الخريطة.
                    </p>
                    {stopPoints.length === 0 ? (
                      <div className="text-center py-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-xs text-gray-600">
                        لا يوجد محطات خاصة للرحلة.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {stopPoints.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-extrabold">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-xs sm:text-sm font-bold text-gray-900 truncate">{s.name}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveInList('trip', idx, -1)}
                                disabled={idx === 0}
                                className="p-1.5 rounded-lg border border-blue-200 hover:bg-white disabled:opacity-30"
                                title="أعلى"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveInList('trip', idx, 1)}
                                disabled={idx === stopPoints.length - 1}
                                className="p-1.5 rounded-lg border border-blue-200 hover:bg-white disabled:opacity-30"
                                title="أسفل"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => editName('trip', idx)}
                                className="p-1.5 rounded-lg border border-blue-200 hover:bg-white"
                                title="تعديل"
                              >
                                <Edit className="w-4 h-4 text-blue-700" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStop('trip', idx)}
                                className="p-1.5 rounded-lg border border-blue-200 hover:bg-white"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4 text-red-700" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
            disabled={saving || selectedDates.length === 0 || !departureTime || !startLocation || !endLocation}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'جارٍ الحفظ...' : editTripId ? 'حفظ التعديل' : `إنشاء ${selectedDates.length} رحلة`}
          </button>
        </div>
      </div>
    </div>
  )
}


