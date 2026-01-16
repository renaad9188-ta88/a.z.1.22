'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { MapPin, Users, Navigation } from 'lucide-react'

type LatLng = { lat: number; lng: number }

type RequestRow = {
  id: string
  user_id: string
  visitor_name: string
  companions_count: number | null
  travel_date: string
  city: string
  status: string
  arrival_date: string | null
  departure_date: string | null
}

type StopRow = {
  id: string
  request_id: string
  title: string
  lat: number
  lng: number
  order_index: number
}

type DriverLocationRow = {
  id: string
  request_id: string
  lat: number
  lng: number
  updated_at: string
}

const DEFAULT_CENTER: LatLng = { lat: 32.5456, lng: 35.825 } // معبر جابر تقريباً

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

function safeNumber(v: any, fallback: number) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export default function RequestTracking({ requestId, userId }: { requestId: string; userId: string }) {
  const supabase = createSupabaseBrowserClient()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  const [loading, setLoading] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)
  const [request, setRequest] = useState<RequestRow | null>(null)
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null)
  const [stops, setStops] = useState<StopRow[]>([])

  const peopleCount = useMemo(() => {
    if (!request) return 0
    // القادم (الزائر) + المرافقين
    const companions = safeNumber(request.companions_count, 0)
    return 1 + Math.max(0, companions)
  }, [request])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const clearMap = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
  }

  const renderMap = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: driverLocation || DEFAULT_CENTER,
        zoom: 11,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
      })
    }

    const map = mapObjRef.current
    clearMap()

    // Marker: border (default reference)
    markersRef.current.push(
      new googleMaps.Marker({
        position: DEFAULT_CENTER,
        map,
        title: 'المعبر جابر',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
      })
    )

    // Marker: القادم (رمزي + عدد الأشخاص)
    if (request) {
      const labelText = peopleCount > 1 ? `${request.visitor_name} (+${peopleCount - 1})` : request.visitor_name
      markersRef.current.push(
        new googleMaps.Marker({
          position: DEFAULT_CENTER,
          map,
          title: labelText,
          label: {
            text: String(peopleCount),
            color: '#111827',
            fontWeight: '700',
          },
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#22c55e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        })
      )
    }

    // Marker: driver live location
    if (driverLocation) {
      markersRef.current.push(
        new googleMaps.Marker({
          position: driverLocation,
          map,
          title: 'موقع السائق',
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        })
      )
    }

    // Stops markers + route polyline (border -> stops -> driver)
    const path: LatLng[] = [DEFAULT_CENTER]
    const sortedStops = [...stops].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    for (const s of sortedStops) {
      const pos = { lat: safeNumber(s.lat, 0), lng: safeNumber(s.lng, 0) }
      if (!pos.lat || !pos.lng) continue
      path.push(pos)
      markersRef.current.push(
        new googleMaps.Marker({
          position: pos,
          map,
          title: s.title,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' },
        })
      )
    }
    if (driverLocation) path.push(driverLocation)

    polylineRef.current = new googleMaps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 4,
    })
    polylineRef.current.setMap(map)

    // Fit bounds
    const bounds = new googleMaps.LatLngBounds()
    path.forEach(p => bounds.extend(p))
    map.fitBounds(bounds, 60)
  }

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: req, error: reqErr } = await supabase
        .from('visit_requests')
        .select('id,user_id,visitor_name,companions_count,travel_date,city,status,arrival_date,departure_date')
        .eq('id', requestId)
        .eq('user_id', userId)
        .maybeSingle()

      if (reqErr) throw reqErr
      if (!req) {
        toast.error('الطلب غير موجود')
        return
      }
      setRequest(req as any)

      // Stops (may not exist yet)
      const { data: stopsData, error: stopsErr } = await supabase
        .from('trip_stops')
        .select('id,request_id,title,lat,lng,order_index')
        .eq('request_id', requestId)
        .order('order_index', { ascending: true })

      if (stopsErr) {
        // 42P01: relation does not exist (before SQL is applied)
        if ((stopsErr as any).code !== '42P01') {
          console.error('Stops load error:', stopsErr)
        }
        setStops([])
      } else {
        setStops((stopsData || []) as any)
      }

      // Driver current location (may not exist yet)
      const { data: loc, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('id,request_id,lat,lng,updated_at')
        .eq('request_id', requestId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (locErr) {
        if ((locErr as any).code !== '42P01') {
          console.error('Driver location load error:', locErr)
        }
        setDriverLocation(null)
      } else if (loc) {
        setDriverLocation({ lat: safeNumber((loc as any).lat, 0), lng: safeNumber((loc as any).lng, 0) })
      } else {
        setDriverLocation(null)
      }
    } catch (e: any) {
      console.error('Tracking load error:', e)
      toast.error('حدث خطأ أثناء تحميل التتبع')
    } finally {
      setLoading(false)
    }
  }

  // Load maps
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          toast.error('مفتاح Google Maps غير موجود')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error(e)
        toast.error('تعذّر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  // Load data
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, userId])

  // Render map when ready/data changes
  useEffect(() => {
    if (!mapsReady) return
    setTimeout(() => renderMap(), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, request, driverLocation, stops])

  // Realtime updates (if tables exist)
  useEffect(() => {
    if (!requestId) return
    const channel = supabase
      .channel(`trip-tracking-${requestId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_driver_locations', filter: `request_id=eq.${requestId}` },
        () => loadData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_stops', filter: `request_id=eq.${requestId}` },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  return (
    <div className="page">
      <div className="page-container">
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                تتبّع القادمون على الخريطة
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                مشاهدة موقع السائق ومحطات التوقف (تحديث لحظي عند توفره)
              </p>
            </div>
            <Link
              href={`/dashboard/request/${requestId}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              العودة للتفاصيل
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div ref={mapRef} className="w-full h-[360px] sm:h-[420px] md:h-[520px]" />
              </div>
              {!mapsReady && (
                <div className="mt-3 text-xs sm:text-sm text-gray-600">
                  جاري تحميل الخريطة...
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Users className="w-5 h-5 text-green-600" />
                  معلومات القادم
                </div>
                <div className="mt-2 text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">الاسم</span>
                    <span className="font-semibold truncate">{request?.visitor_name || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">عدد الأشخاص</span>
                    <span className="font-semibold tabular-nums">{request ? peopleCount : '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-500">المدينة</span>
                    <span className="font-semibold">{request?.city || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 font-bold text-gray-800">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  حالة التتبّع
                </div>
                <div className="mt-2 text-sm text-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">موقع السائق</span>
                    <span className={`font-semibold ${driverLocation ? 'text-green-700' : 'text-gray-500'}`}>
                      {driverLocation ? 'متاح' : 'غير متاح بعد'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">محطات التوقف</span>
                    <span className="font-semibold tabular-nums">{stops.length}</span>
                  </div>
                  {!loading && stops.length === 0 && !driverLocation && (
                    <p className="text-xs text-gray-500">
                      ملاحظة: يلزم تفعيل جداول التتبع في Supabase (سأجهز لك ملف SQL جاهز) ثم يبدأ الإدمن بإدخال نقاط السائق/التوقف.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


