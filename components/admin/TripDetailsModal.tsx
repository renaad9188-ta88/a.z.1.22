'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, MapPin, Navigation, Bus, Users, Phone, Calendar, Clock, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/date-utils'

type Trip = {
  id: string
  route_id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
  is_active: boolean
  trip_type?: 'arrival' | 'departure' | null
}

type StopPoint = {
  id: string
  name: string
  lat: number
  lng: number
  order_index: number
}

type Driver = {
  id: string
  name: string
  phone: string
  vehicle_type: string
}

type DriverLiveLite = { driver_id: string; is_available: boolean; updated_at: string | null }

type Passenger = {
  id: string
  visitor_name: string
  companions_count: number | null
  city: string
  phone: string | null
  full_name: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  selectedDropoffStop?: { name: string } | null
  selectedPickupStop?: { name: string } | null
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

export default function TripDetailsModal({
  tripId,
  onClose,
  onUpdate,
}: {
  tripId: string
  onClose: () => void
  onUpdate?: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  
  const [loading, setLoading] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [passengers, setPassengers] = useState<Passenger[]>([])
  const [driverLiveMap, setDriverLiveMap] = useState<Record<string, DriverLiveLite | null>>({})

  const trackingAlert = (() => {
    if (!trip) return null
    const todayISO = new Date().toISOString().slice(0, 10)
    const isToday = String(trip.trip_date || '').slice(0, 10) === todayISO
    if (!isToday) return null
    if (drivers.length === 0) return { kind: 'warn' as const, text: 'لا يوجد سائق معيّن لهذه الرحلة.' }
    const now = Date.now()
    const FIVE_MIN = 5 * 60 * 1000

    let anyFresh = false
    let anyStale = false
    let anyOff = false

    for (const d of drivers) {
      const live = driverLiveMap[d.id]
      const on = Boolean(live?.is_available)
      const updatedAt = live?.updated_at ? new Date(live.updated_at).getTime() : NaN
      const fresh = on && Number.isFinite(updatedAt) && now - updatedAt < FIVE_MIN
      const stale = on && (!Number.isFinite(updatedAt) || now - updatedAt >= FIVE_MIN)
      if (!on) anyOff = true
      if (fresh) anyFresh = true
      if (stale) anyStale = true
    }

    if (anyFresh) return { kind: 'ok' as const, text: '✅ التتبع يعمل الآن (آخر تحديث خلال 5 دقائق).' }
    if (anyStale) return { kind: 'danger' as const, text: '🚨 التتبع متوقف أو آخر تحديث قديم. اتصل بالسائق فوراً.' }
    if (anyOff) return { kind: 'danger' as const, text: '🚨 السائق لم يشغّل التتبع (غير متاح). اتصل بالسائق.' }
    return { kind: 'warn' as const, text: '⚠️ لا توجد بيانات تتبع كافية.' }
  })()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          console.warn('Google Maps API key is missing')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('Failed to load Google Maps API:', e)
        toast.error('تعذر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    loadTripData()
  }, [tripId])

  useEffect(() => {
    const t = setInterval(() => {
      loadTripData(true)
    }, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const loadTripData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      
      // Load trip
      const { data: tripData, error: tripErr } = await supabase
        .from('route_trips')
        .select('id,route_id,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,is_active,trip_type')
        .eq('id', tripId)
        .single()
      
      if (tripErr) throw tripErr
      setTrip(tripData as Trip)
      
      // Load stop points
      const { data: stopsData, error: stopsErr } = await supabase
        .from('route_trip_stop_points')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      
      if (stopsErr) throw stopsErr
      setStopPoints((stopsData || []) as StopPoint[])
      
      // Load assigned drivers
      const { data: driversData, error: driversErr } = await supabase
        .from('route_trip_drivers')
        .select('drivers(id, name, phone, vehicle_type)')
        .eq('trip_id', tripId)
        .eq('is_active', true)
      
      if (driversErr) throw driversErr
      const driversList = (driversData || [])
        .map((d: any) => d.drivers)
        .filter(Boolean) as Driver[]
      setDrivers(driversList)

      // Load driver live status for clear tracking alert
      try {
        const ids = driversList.map((d) => d.id).filter(Boolean)
        if (ids.length > 0) {
          const { data: liveRows } = await supabase
            .from('driver_live_status')
            .select('driver_id,is_available,updated_at')
            .in('driver_id', ids)
          const map: Record<string, DriverLiveLite | null> = {}
          ;(liveRows || []).forEach((r: any) => {
            map[r.driver_id] = {
              driver_id: r.driver_id,
              is_available: Boolean(r.is_available),
              updated_at: r.updated_at || null,
            }
          })
          setDriverLiveMap(map)
        } else {
          setDriverLiveMap({})
        }
      } catch {
        setDriverLiveMap({})
      }
      
      // Load passengers booked on this trip (visit_requests.trip_id)
      const { data: passengersData, error: passengersErr } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          companions_count,
          city,
          user_id,
          selected_dropoff_stop_id,
          selected_pickup_stop_id
        `)
        .eq('trip_id', tripId)
        .neq('status', 'rejected')
      
      if (passengersErr) {
        console.error('Error loading passengers:', passengersErr)
      } else {
        // Load profiles separately
        const userIds = Array.from(new Set((passengersData || []).map((p: any) => p.user_id).filter(Boolean)))
        let profilesMap: Record<string, { phone: string | null; full_name: string | null }> = {}
        
        if (userIds.length > 0) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('user_id, phone, full_name')
            .in('user_id', userIds)
          
          if (!profErr && profiles) {
            profiles.forEach((p: any) => {
              profilesMap[p.user_id] = {
                phone: p.phone || null,
                full_name: p.full_name || null,
              }
            })
          }
        }
        
        // Load stop points for selected stops
        const stopIds = (passengersData || [])
          .map((p: any) => [p.selected_dropoff_stop_id, p.selected_pickup_stop_id])
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
        
        const passengersList = (passengersData || []).map((p: any) => ({
          id: p.id,
          visitor_name: p.visitor_name,
          companions_count: p.companions_count,
          city: p.city,
          phone: profilesMap[p.user_id]?.phone || null,
          full_name: profilesMap[p.user_id]?.full_name || null,
          selected_dropoff_stop_id: p.selected_dropoff_stop_id,
          selected_pickup_stop_id: p.selected_pickup_stop_id,
          selectedDropoffStop: p.selected_dropoff_stop_id ? stopsMap[p.selected_dropoff_stop_id] : null,
          selectedPickupStop: p.selected_pickup_stop_id ? stopsMap[p.selected_pickup_stop_id] : null,
        })) as Passenger[]
        setPassengers(passengersList)
      }
    } catch (e: any) {
      console.error('Load trip data error:', e)
      if (!silent) toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (!mapsReady || !trip || !mapRef.current) return
    if (!(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps

    // Initialize map
    if (!mapObjRef.current) {
      const center = { lat: trip.start_lat, lng: trip.start_lng }
      mapObjRef.current = new googleMaps.Map(mapRef.current!, {
        center,
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })
    }

    const map = mapObjRef.current

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Add start marker
    const startMarker = new googleMaps.Marker({
      position: { lat: trip.start_lat, lng: trip.start_lng },
      map,
      title: `نقطة الانطلاق: ${trip.start_location_name}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new googleMaps.Size(40, 40),
      },
      label: {
        text: 'بداية',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
      },
    })
    markersRef.current.push(startMarker)

    // Add stop points markers
    stopPoints.forEach((stop, idx) => {
      const stopMarker = new googleMaps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        title: `${idx + 1}. ${stop.name}`,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new googleMaps.Size(36, 36),
        },
        label: {
          text: String(idx + 1),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '11px',
        },
      })
      markersRef.current.push(stopMarker)
    })

    // Add end marker
    const endMarker = new googleMaps.Marker({
      position: { lat: trip.end_lat, lng: trip.end_lng },
      map,
      title: `نقطة الوصول: ${trip.end_location_name}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new googleMaps.Size(40, 40),
      },
      label: {
        text: 'نهاية',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
      },
    })
    markersRef.current.push(endMarker)

    // Draw route using DirectionsService
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We use custom markers
        polylineOptions: {
          strokeColor: '#3B82F6',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      })
    }

    const directionsService = new googleMaps.DirectionsService()
    const waypoints: google.maps.DirectionsWaypoint[] = stopPoints.map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
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
          
          // Fit bounds to show entire route
          const bounds = new googleMaps.LatLngBounds()
          bounds.extend({ lat: trip.start_lat, lng: trip.start_lng })
          stopPoints.forEach((stop) => bounds.extend({ lat: stop.lat, lng: stop.lng }))
          bounds.extend({ lat: trip.end_lat, lng: trip.end_lng })
          map.fitBounds(bounds, 50)
        } else {
          console.error('Directions request failed:', status)
        }
      }
    )
  }, [mapsReady, trip, stopPoints])


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">جاري تحميل بيانات الرحلة...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p className="text-red-600">تعذر تحميل بيانات الرحلة</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            إغلاق
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
              تفاصيل الرحلة: {trip.start_location_name} → {trip.end_location_name}
            </h3>
            {trip.trip_type && (
              <span className="inline-block text-xs font-extrabold px-2 py-1 rounded-full border border-blue-300 text-blue-800 bg-blue-50 mb-2">
                {trip.trip_type === 'departure' ? 'رحلة المغادرين' : 'رحلة القادمين'}
              </span>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatDate(trip.trip_date)}</span>
              </div>
              {trip.meeting_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>تجمع: {trip.meeting_time}</span>
                </div>
              )}
              {trip.departure_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>انطلاق: {trip.departure_time}</span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition ml-4"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {trackingAlert && (
            <div
              className={`rounded-xl border-2 p-3 sm:p-4 text-sm font-extrabold ${
                trackingAlert.kind === 'ok'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : trackingAlert.kind === 'danger'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {trackingAlert.text}
            </div>
          )}
          {/* Map */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-3 bg-blue-50 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                خريطة مسار الرحلة
              </h4>
            </div>
            <div ref={mapRef} className="w-full h-[400px] sm:h-[500px]" />
          </div>

          {/* Trip Sequence */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              تسلسل الرحلة
            </h4>
            <div className="space-y-3">
              {/* Start */}
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  بداية
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{trip.start_location_name}</p>
                  <p className="text-xs text-gray-600 mt-1">نقطة الانطلاق</p>
                </div>
              </div>

              {/* Stop Points */}
              {stopPoints.map((stop, idx) => (
                <div key={stop.id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{stop.name}</p>
                    <p className="text-xs text-gray-600 mt-1">محطة توقف</p>
                  </div>
                </div>
              ))}

              {/* End */}
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  نهاية
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{trip.end_location_name}</p>
                  <p className="text-xs text-gray-600 mt-1">نقطة الوصول</p>
                </div>
              </div>
            </div>
          </div>

          {/* Drivers */}
          {drivers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Bus className="w-5 h-5 text-green-600" />
                السائقون المعيّنون ({drivers.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{driver.name}</p>
                      <p className="text-xs text-gray-600">{driver.vehicle_type}</p>
                    </div>
                    <div className="flex gap-2">
                      {driver.phone && (
                        <>
                          <a
                            href={`https://wa.me/${driver.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                            title="واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a
                            href={`tel:${driver.phone}`}
                            className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                            title="اتصال"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passengers */}
          {passengers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h4 className="text-base sm:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                الركاب المسجلون ({passengers.length})
              </h4>
              <div className="space-y-2">
                {passengers.map((passenger) => (
                  <div key={passenger.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{passenger.visitor_name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 mt-1">
                        <span>المدينة: {passenger.city}</span>
                        <span>الأشخاص: {1 + (passenger.companions_count || 0)}</span>
                        {passenger.phone && <span>الهاتف: {passenger.phone}</span>}
                        {trip.trip_type === 'arrival' && passenger.selectedDropoffStop && (
                          <span className="text-blue-700 font-semibold">
                            نقطة النزول: {passenger.selectedDropoffStop.name}
                          </span>
                        )}
                        {trip.trip_type === 'departure' && passenger.selectedPickupStop && (
                          <span className="text-blue-700 font-semibold">
                            نقطة التحميل: {passenger.selectedPickupStop.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/admin/request/${passenger.id}/follow`}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold whitespace-nowrap"
                    >
                      عرض الطلب
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {passengers.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">لا يوجد ركاب مسجلون على هذه الرحلة بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

