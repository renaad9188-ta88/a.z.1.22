'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Clock, MapPin, Navigation, Users, Phone, User } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

type TripRow = {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
  trip_type?: 'arrival' | 'departure' | null
}

type StopPointRow = { id: string; name: string; lat: number; lng: number; order_index: number }

type PassengerRow = {
  id: string
  user_id?: string | null
  visitor_name: string
  companions_count: number | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  selectedDropoffStop?: { name: string } | null
  selectedPickupStop?: { name: string } | null
  profile?: { full_name: string | null; phone: string | null }
}

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export default function DriverTripOverview({ tripId }: { tripId: string }) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<TripRow | null>(null)
  const [stopPoints, setStopPoints] = useState<StopPointRow[]>([])
  const [passengers, setPassengers] = useState<PassengerRow[]>([])
  const [mapsReady, setMapsReady] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    if (!apiKey) return
    let mounted = true
    ;(async () => {
      try {
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('Failed to load Google Maps API:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    if (!tripId) return
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const loadAll = async () => {
    try {
      setLoading(true)

      // Load trip
      const { data: tripData, error: tripErr } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,trip_type,route_id')
        .eq('id', tripId)
        .maybeSingle()
      if (tripErr) throw tripErr
      if (!tripData) {
        toast.error('لم يتم العثور على الرحلة')
        return
      }
      setTrip(tripData as any)

      // Load stop points
      const { data: stopsData, error: stopsErr } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,lat,lng,order_index')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      if (stopsErr) throw stopsErr
      let currentStopPoints: StopPointRow[] = (stopsData || []) as any as StopPointRow[]
      
      if (currentStopPoints.length === 0) {
        const routeId = (tripData as any)?.route_id as string | undefined
        if (routeId) {
          const tripType: 'arrival' | 'departure' | null = ((tripData as any)?.trip_type as any) || null
          const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
          try {
            const { data: routeStops, error: rsErr } = await supabase
              .from('route_stop_points')
              .select('id,name,lat,lng,order_index,stop_kind')
              .eq('route_id', routeId)
              .eq('is_active', true)
              .in('stop_kind', allowedKinds as any)
              .order('order_index', { ascending: true })
            if (rsErr) throw rsErr
            currentStopPoints = ((routeStops || []) as any) as StopPointRow[]
          } catch {
            const { data: routeStops, error: rsErr } = await supabase
              .from('route_stop_points')
              .select('id,name,lat,lng,order_index')
              .eq('route_id', routeId)
              .eq('is_active', true)
              .order('order_index', { ascending: true })
            if (rsErr) throw rsErr
            currentStopPoints = ((routeStops || []) as any) as StopPointRow[]
          }
        }
      }
      
      setStopPoints(currentStopPoints)

      // Load passengers - تحميل الركاب المسجلين على هذه الرحلة
      const { data: paxData, error: paxErr } = await supabase
        .from('visit_requests')
        .select('id,visitor_name,companions_count,user_id,selected_dropoff_stop_id,selected_pickup_stop_id')
        .eq('trip_id', tripId)
        .neq('status', 'rejected') // استثناء المرفوضين فقط
        .order('created_at', { ascending: true })
      if (paxErr) {
        console.error('Error loading passengers:', paxErr)
        throw paxErr
      }

      const rows = (paxData || []) as any as PassengerRow[]
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))

      let profilesMap: Record<string, { full_name: string | null; phone: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs, error: profsErr } = await supabase.from('profiles').select('user_id,full_name,phone').in('user_id', userIds)
        if (profsErr) throw profsErr
        ;(profs || []).forEach((p: any) => {
          profilesMap[p.user_id] = { full_name: p.full_name || null, phone: p.phone || null }
        })
      }

      // Load stop names
      const stopIds = rows
        .map((r: any) => [r.selected_dropoff_stop_id, r.selected_pickup_stop_id])
        .flat()
        .filter(Boolean) as string[]
      
      let stopsMap: Record<string, { name: string }> = {}
      if (stopIds.length > 0) {
        const { data: stopsData } = await supabase
          .from('route_trip_stop_points')
          .select('id,name')
          .in('id', stopIds)
        ;(stopsData || []).forEach((s: any) => {
          stopsMap[s.id] = { name: s.name }
        })

        const missing = stopIds.filter((id) => !stopsMap[id])
        if (missing.length > 0) {
          const { data: routeStopsData } = await supabase
            .from('route_stop_points')
            .select('id,name')
            .in('id', missing)
          ;(routeStopsData || []).forEach((s: any) => {
            stopsMap[s.id] = { name: s.name }
          })
        }
      }

      const tripType = (tripData as any)?.trip_type || null
      const passengersWithStops = rows.map((r) => ({
        ...r,
        profile: r.user_id ? (profilesMap[r.user_id] || { full_name: null, phone: null }) : { full_name: null, phone: null },
        selectedDropoffStop: tripType === 'arrival' && r.selected_dropoff_stop_id ? stopsMap[r.selected_dropoff_stop_id] : null,
        selectedPickupStop: tripType === 'departure' && r.selected_pickup_stop_id ? stopsMap[r.selected_pickup_stop_id] : null,
      }))

      // Sort passengers by stop order (closest to start first)
      // Use currentStopPoints which was loaded above
      const sortedPassengers = [...passengersWithStops].sort((a, b) => {
        const stopA = tripType === 'arrival' ? a.selectedDropoffStop?.name : a.selectedPickupStop?.name
        const stopB = tripType === 'arrival' ? b.selectedDropoffStop?.name : b.selectedPickupStop?.name
        
        if (!stopA && !stopB) return 0
        if (!stopA) return 1
        if (!stopB) return -1

        // Find order index of stops using currentStopPoints
        const orderA = currentStopPoints.findIndex((s) => s.name === stopA)
        const orderB = currentStopPoints.findIndex((s) => s.name === stopB)
        
        if (orderA === -1 && orderB === -1) return 0
        if (orderA === -1) return 1
        if (orderB === -1) return -1
        
        return orderA - orderB
      })

      setPassengers(sortedPassengers)
    } catch (e: any) {
      console.error('DriverTripOverview load error:', e)
      toast.error('تعذر تحميل بيانات الرحلة')
    } finally {
      setLoading(false)
    }
  }

  // Render map
  useEffect(() => {
    if (!mapsReady || !trip || !mapRef.current || stopPoints.length === 0) return
    if (!(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: { lat: trip.start_lat, lng: trip.start_lng },
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })
    }
    const map = mapObjRef.current

    setTimeout(() => {
      try {
        googleMaps.event.trigger(map, 'resize')
        map.setCenter({ lat: trip.start_lat, lng: trip.start_lng })
      } catch {}
    }, 200)

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const startMarker = new googleMaps.Marker({
      position: { lat: trip.start_lat, lng: trip.start_lng },
      map,
      title: `نقطة الانطلاق: ${trip.start_location_name}`,
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new googleMaps.Size(32, 32) },
      label: { text: 'بداية', color: 'white', fontWeight: 'bold', fontSize: '10px' },
    })
    markersRef.current.push(startMarker)

    stopPoints.forEach((stop, idx) => {
      const stopMarker = new googleMaps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        title: `${idx + 1}. ${stop.name}`,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: { text: String(idx + 1), color: 'white', fontWeight: 'bold', fontSize: '10px' },
      })
      markersRef.current.push(stopMarker)
    })

    const endMarker = new googleMaps.Marker({
      position: { lat: trip.end_lat, lng: trip.end_lng },
      map,
      title: `نقطة الوصول: ${trip.end_location_name}`,
      icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new googleMaps.Size(32, 32) },
      label: { text: 'نهاية', color: 'white', fontWeight: 'bold', fontSize: '10px' },
    })
    markersRef.current.push(endMarker)

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#2563EB', strokeWeight: 4, strokeOpacity: 0.85 },
      })
    }

    const directionsService = new googleMaps.DirectionsService()
    const waypoints: google.maps.DirectionsWaypoint[] = stopPoints.map((s) => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true,
    }))

    directionsService.route(
      {
        origin: { lat: trip.start_lat, lng: trip.start_lng },
        destination: { lat: trip.end_lat, lng: trip.end_lng },
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        travelMode: googleMaps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === googleMaps.DirectionsStatus.OK && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result)
          const bounds = new googleMaps.LatLngBounds()
          bounds.extend({ lat: trip.start_lat, lng: trip.start_lng })
          stopPoints.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
          bounds.extend({ lat: trip.end_lat, lng: trip.end_lng })
          map.fitBounds(bounds, 50)
        }
      }
    )
  }, [mapsReady, trip, stopPoints])

  const getStopName = (passenger: PassengerRow) => {
    if (!trip) return '—'
    const tripType = trip.trip_type
    if (tripType === 'arrival') return passenger.selectedDropoffStop?.name || 'لم يحدد نقطة نزول'
    if (tripType === 'departure') return passenger.selectedPickupStop?.name || 'لم يحدد نقطة تحميل'
    return passenger.selectedDropoffStop?.name || passenger.selectedPickupStop?.name || '—'
  }

  const passengerCount = useMemo(() => {
    return passengers.reduce((sum, p) => sum + 1 + (p.companions_count || 0), 0)
  }, [passengers])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">جاري تحميل بيانات الرحلة...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 text-center">
        <p className="text-red-600">لم يتم العثور على الرحلة</p>
      </div>
    )
  }

  const tripType = trip.trip_type || null
  const isArrival = tripType === 'arrival'

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Trip Info Card */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-white mb-2 break-words">
                {trip.start_location_name} → {trip.end_location_name}
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-blue-100">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  {formatDate(trip.trip_date)}
                </span>
                {trip.meeting_time && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    تجمع: {trip.meeting_time.slice(0, 5)}
                  </span>
                )}
                {trip.departure_time && (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    انطلاق: {trip.departure_time.slice(0, 5)}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white/20 rounded-lg px-3 py-2 text-center w-full sm:w-auto min-w-[80px]">
              <div className="text-[10px] sm:text-xs text-blue-100 mb-1">عدد الركاب</div>
              <div className="text-xl sm:text-2xl font-extrabold text-white">{passengerCount}</div>
            </div>
          </div>
        </div>

        {/* Trip Sequence */}
        <div className="p-3 sm:p-4 md:p-6">
          <h4 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            تسلسل الرحلة
          </h4>
          <div className="space-y-2 sm:space-y-3">
            {/* Start */}
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                بداية
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{trip.start_location_name}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1">نقطة الانطلاق</p>
              </div>
            </div>

            {/* Stop Points */}
            {stopPoints.map((stop, idx) => (
              <div key={stop.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{stop.name}</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-1">
                    {isArrival ? 'نقطة نزول' : 'نقطة تحميل'} - {idx + 1} من {stopPoints.length}
                  </p>
                </div>
              </div>
            ))}

            {/* End */}
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                نهاية
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{trip.end_location_name}</p>
                <p className="text-[10px] sm:text-xs text-gray-600 mt-1">نقطة الوصول النهائية</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passengers List */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-3 sm:p-4 md:p-6">
          <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="break-words">قائمة الركاب ({passengerCount} شخص)</span>
          </h4>
          <p className="text-xs sm:text-sm text-purple-100 mt-1">
            مرتبة حسب {isArrival ? 'نقاط النزول' : 'نقاط التحميل'} (الأقرب أولاً)
          </p>
        </div>
        <div className="p-3 sm:p-4 md:p-6">
          {passengers.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm sm:text-base">لا يوجد ركاب مسجلون على هذه الرحلة</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {passengers.map((passenger, idx) => {
                const stopName = getStopName(passenger)
                const totalPeople = 1 + (passenger.companions_count || 0)
                return (
                  <div key={passenger.id} className="border border-gray-200 rounded-lg p-2 sm:p-3 md:p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{passenger.visitor_name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-600">
                              {totalPeople} {totalPeople === 1 ? 'شخص' : 'أشخاص'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] sm:text-xs md:text-sm">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 break-words">
                            <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="break-words">{stopName}</span>
                          </span>
                          {passenger.profile?.phone && (
                            <a
                              href={`tel:${passenger.profile.phone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 hover:bg-green-100 transition whitespace-nowrap"
                            >
                              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span>{passenger.profile.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      {mapsReady && trip && stopPoints.length > 0 && (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-3 sm:p-4 md:p-6">
            <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              خريطة الرحلة
            </h4>
          </div>
          <div ref={mapRef} className="w-full h-[300px] sm:h-[400px] md:h-[500px]" />
        </div>
      )}
    </div>
  )
}

