'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowRight, Bus, Calendar, Clock, MapPin, Navigation, Users } from 'lucide-react'
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
  notes: string | null
}

type StopPointRow = { id: string; name: string; lat: number; lng: number; order_index: number }

type PassengerRow = {
  id: string
  visitor_name: string
  companions_count: number | null
  user_id: string
  trip_status: string | null
  arrival_date: string | null
  request_dropoff_points?: Array<{ name: string; address: string | null; lat: number; lng: number }>
}

type ProfileRow = { user_id: string; full_name: string | null; phone: string | null }

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

export default function DriverTripDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const tripId = String((params as any)?.id || '')

  const [loading, setLoading] = useState(true)
  const [trip, setTrip] = useState<TripRow | null>(null)
  const [stopPoints, setStopPoints] = useState<StopPointRow[]>([])
  const [passengers, setPassengers] = useState<Array<PassengerRow & { profile?: { full_name: string | null; phone: string | null } }>>([])
  const [mapsReady, setMapsReady] = useState(false)
  const [errorText, setErrorText] = useState<string>('')

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
      setErrorText('')

      const { data: auth } = await supabase.auth.getUser()
      if (!auth?.user) {
        toast.error('يجب تسجيل الدخول أولاً')
        router.push('/auth/login')
        return
      }

      // Ensure driver role
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (profErr) throw profErr
      if (!profile || String(profile.role || '').toLowerCase() !== 'driver') {
        toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة')
        router.push('/dashboard')
        return
      }

      // Load trip (RLS should restrict to assigned trips)
      const { data: tripData, error: tripErr } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,notes')
        .eq('id', tripId)
        .maybeSingle()
      if (tripErr) throw tripErr
      if (!tripData) {
        setTrip(null)
        setErrorText('لم يتم العثور على الرحلة أو لا تملك صلاحية لرؤيتها. تأكد أن الإدارة عيّنتك على هذه الرحلة وأن RLS مطبق.')
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
      setStopPoints((stopsData || []) as any)

      // Load passengers linked by trip_id
      const { data: paxData, error: paxErr } = await supabase
        .from('visit_requests')
        .select('id,visitor_name,companions_count,user_id,trip_status,arrival_date,request_dropoff_points(name,address,lat,lng)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
      if (paxErr) throw paxErr

      const rows = (paxData || []) as any as PassengerRow[]
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)))

      let profilesMap: Record<string, { full_name: string | null; phone: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs, error: profsErr } = await supabase.from('profiles').select('user_id,full_name,phone').in('user_id', userIds)
        if (profsErr) throw profsErr
        ;(profs || []).forEach((p: ProfileRow) => {
          profilesMap[p.user_id] = { full_name: p.full_name || null, phone: p.phone || null }
        })
      }

      setPassengers(
        rows.map((r) => ({
          ...r,
          profile: profilesMap[r.user_id] || { full_name: null, phone: null },
        }))
      )
    } catch (e: any) {
      console.error('Driver trip details load error:', e)
      setErrorText(e?.message || 'تعذر تحميل تفاصيل الرحلة')
      toast.error('تعذر تحميل تفاصيل الرحلة')
    } finally {
      setLoading(false)
    }
  }

  const passengerCount = useMemo(() => {
    return passengers.reduce((sum, p) => sum + 1 + (p.companions_count || 0), 0)
  }, [passengers])

  useEffect(() => {
    if (!mapsReady || !trip || !mapRef.current) return
    if (!(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps

    // init map
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

    // clear markers
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
          map.fitBounds(bounds, 30)
        }
      }
    )
  }, [mapsReady, trip, stopPoints])

  if (loading) {
    return (
      <div className="page">
        <div className="page-container">
          <div className="card">
            <div className="p-6 text-center text-gray-600">جاري تحميل تفاصيل الرحلة...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-container">
        <Link
          href="/driver"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة السائق</span>
        </Link>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Bus className="w-6 h-6 text-blue-600" />
                  تفاصيل الرحلة
                </h1>
                {trip && (
                  <p className="text-sm text-gray-600 mt-1 truncate">
                    {trip.start_location_name} → {trip.end_location_name}
                  </p>
                )}
              </div>
              {trip && (
                <div className="text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>إجمالي الركاب: </span>
                    <span className="font-bold text-gray-900">{passengerCount}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {errorText && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{errorText}</div>
            )}

            {trip && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-gray-600">التاريخ</div>
                      <div className="font-bold text-gray-900">{formatDate(trip.trip_date)}</div>
                    </div>
                  </div>
                  {trip.meeting_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-gray-600">وقت التجمع</div>
                        <div className="font-bold text-gray-900">{trip.meeting_time}</div>
                      </div>
                    </div>
                  )}
                  {trip.departure_time && (
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-gray-600">وقت الانطلاق</div>
                        <div className="font-bold text-gray-900">{trip.departure_time}</div>
                      </div>
                    </div>
                  )}
                </div>
                {trip.notes && <div className="mt-3 text-sm text-gray-700">ملاحظات: {trip.notes}</div>}
              </div>
            )}

            {/* Map */}
            {trip && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-blue-50 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    خريطة خط السير
                  </h3>
                  {!apiKey && <span className="text-xs text-red-700">مفتاح Google Maps غير موجود</span>}
                </div>
                <div ref={mapRef} className="w-full h-[320px] sm:h-[420px]" />
              </div>
            )}

            {/* Stops */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Navigation className="w-4 h-4 text-blue-600" />
                محطات التوقف ({stopPoints.length})
              </h3>
              {stopPoints.length === 0 ? (
                <p className="text-sm text-gray-600">لا توجد محطات توقف محددة لهذه الرحلة.</p>
              ) : (
                <div className="space-y-2">
                  {stopPoints.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-gray-900">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Passengers */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                الركاب ({passengers.length})
              </h3>
              {passengers.length === 0 ? (
                <p className="text-sm text-gray-600">لا يوجد ركاب مسجلين على هذه الرحلة بعد.</p>
              ) : (
                <div className="space-y-2">
                  {passengers.map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{p.visitor_name}</div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1 space-y-1">
                            {p.profile?.full_name && <div>المستخدم: {p.profile.full_name}</div>}
                            {p.profile?.phone && <div>الهاتف: {p.profile.phone}</div>}
                            <div>عدد الأشخاص: {1 + (p.companions_count || 0)}</div>
                            {p.arrival_date && <div>تاريخ القدوم: {formatDate(p.arrival_date)}</div>}
                            {p.request_dropoff_points?.[0]?.name && (
                              <div>نقطة النزول: {p.request_dropoff_points[0].name}</div>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/driver/passenger/${p.id}`}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold whitespace-nowrap"
                        >
                          تفاصيل الراكب
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


