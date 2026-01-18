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

type RouteStopPoint = {
  id: string
  route_id: string
  name: string
  description: string | null
  lat: number
  lng: number
  order_index: number
}

type Route = {
  id: string
  name: string
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
}

type DropoffPoint = {
  id: string
  request_id: string
  name: string
  address: string | null
  lat: number
  lng: number
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

export default function RequestTracking({ requestId, userId }: { requestId: string; userId: string | 'driver' }) {
  const supabase = createSupabaseBrowserClient()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)
  const lastEtaCalcAtRef = useRef<number>(0)

  const [loading, setLoading] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)
  const [request, setRequest] = useState<RequestRow | null>(null)
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null)
  const [stops, setStops] = useState<StopRow[]>([])
  const [route, setRoute] = useState<Route | null>(null)
  const [routeStops, setRouteStops] = useState<RouteStopPoint[]>([])
  const [dropoffPoint, setDropoffPoint] = useState<DropoffPoint | null>(null)
  const [eta, setEta] = useState<{ durationText: string; distanceText?: string } | null>(null)

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
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
      directionsRendererRef.current = null
    }
  }

  const renderMap = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: driverLocation || DEFAULT_CENTER,
        zoom: 11,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: {
          position: googleMaps.ControlPosition.TOP_LEFT,
        },
        zoomControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'greedy',
        scrollwheel: true,
      })
    }

    const map = mapObjRef.current
    clearMap()

    const path: LatLng[] = []
    const bounds = new googleMaps.LatLngBounds()

    // إذا كان هناك خط محدد (route system)
    if (route) {
      // نقطة الانطلاق (ساحة المرجة - دمشق)
      const startPos: LatLng = { lat: route.start_lat, lng: route.start_lng }
      path.push(startPos)
      bounds.extend(startPos)
      
      markersRef.current.push(
        new googleMaps.Marker({
          position: startPos,
          map,
          title: route.start_location_name,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
            scaledSize: new googleMaps.Size(32, 32),
          },
        })
      )

      // نقاط التوقف الثابتة (route_stop_points) - بصورة حافلة
      const sortedRouteStops = [...routeStops].sort((a, b) => a.order_index - b.order_index)
      for (const stop of sortedRouteStops) {
        const pos: LatLng = { lat: stop.lat, lng: stop.lng }
        path.push(pos)
        bounds.extend(pos)
        
        // أيقونة حافلة للنقاط الثابتة
        markersRef.current.push(
          new googleMaps.Marker({
            position: pos,
            map,
            title: stop.name,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
              scaledSize: new googleMaps.Size(40, 40),
            },
            label: {
              text: String(stop.order_index + 1),
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '12px',
            },
          })
        )
      }

      // نقطة الوصول (مجمع الشرق الأوسط - عمان)
      const endPos: LatLng = { lat: route.end_lat, lng: route.end_lng }
      path.push(endPos)
      bounds.extend(endPos)
      
      markersRef.current.push(
        new googleMaps.Marker({
          position: endPos,
          map,
          title: route.end_location_name,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new googleMaps.Size(32, 32),
          },
        })
      )

      // نقطة النزول المخصصة (من المستخدم)
      if (dropoffPoint) {
        const dropoffPos: LatLng = { lat: dropoffPoint.lat, lng: dropoffPoint.lng }
        bounds.extend(dropoffPos)
        
        markersRef.current.push(
          new googleMaps.Marker({
            position: dropoffPos,
            map,
            title: dropoffPoint.name || 'نقطة النزول',
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            label: {
              text: '📍',
              fontSize: '20px',
            },
          })
        )
      }

      // ✅ مسار طرق حقيقي على الشوارع + حساب ETA
      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new googleMaps.DirectionsService()
      }

      const destination: LatLng = dropoffPoint
        ? { lat: dropoffPoint.lat, lng: dropoffPoint.lng }
        : { lat: route.end_lat, lng: route.end_lng }

      const waypoints: google.maps.DirectionsWaypoint[] = [...routeStops]
        .sort((a, b) => a.order_index - b.order_index)
        .slice(0, 23) // حد Google للـ waypoints في أغلب الخطط
        .map((s) => ({
          location: { lat: s.lat, lng: s.lng },
          stopover: true,
        }))

      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new googleMaps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: '#2563eb',
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        })
        directionsRendererRef.current.setMap(map)
      } else {
        directionsRendererRef.current.setMap(map)
      }

      // رسم المسار الكامل (من الانطلاق إلى الوجهة)
      ;(async () => {
        try {
          const res = await directionsServiceRef.current!.route({
            origin: startPos,
            destination,
            waypoints,
            travelMode: googleMaps.TravelMode.DRIVING,
            optimizeWaypoints: false,
          })
          directionsRendererRef.current?.setDirections(res)

          // Fit bounds على مسار الطرق (أفضل من حدود الماركرات)
          const routeBounds = res.routes?.[0]?.bounds
          if (routeBounds) {
            map.fitBounds(routeBounds, { top: 70, bottom: 70, left: 50, right: 50 })
          }
        } catch (e) {
          // إذا فشل Directions لأي سبب (لا نعطل الصفحة) ونترك الـ polyline fallback
          console.warn('Directions route failed, fallback to polyline:', e)
        }
      })()

      // ETA من موقع السائق الحالي إلى الوجهة (يتحدث مع الـ realtime)
      ;(async () => {
        try {
          if (!driverLocation) {
            setEta(null)
            return
          }

          const now = Date.now()
          if (now - lastEtaCalcAtRef.current < 15000) return // throttle 15s
          lastEtaCalcAtRef.current = now

          const etaRes = await directionsServiceRef.current!.route({
            origin: driverLocation,
            destination,
            travelMode: googleMaps.TravelMode.DRIVING,
          })

          const legs = etaRes.routes?.[0]?.legs || []
          const durationSec = legs.reduce((sum, l) => sum + (l.duration?.value || 0), 0)
          const distanceM = legs.reduce((sum, l) => sum + (l.distance?.value || 0), 0)

          const durationText =
            legs.length === 1 && legs[0].duration?.text
              ? legs[0].duration.text
              : durationSec > 0
                ? `${Math.round(durationSec / 60)} دقيقة`
                : 'غير متاح'

          const distanceText =
            legs.length === 1 && legs[0].distance?.text
              ? legs[0].distance.text
              : distanceM > 0
                ? `${(distanceM / 1000).toFixed(1)} كم`
                : undefined

          setEta({ durationText, distanceText })
        } catch (e) {
          console.warn('ETA calculation failed:', e)
          setEta(null)
        }
      })()
    } else {
      // Fallback: النظام القديم (بدون route system)
      const center = driverLocation || DEFAULT_CENTER
      path.push(center)
      bounds.extend(center)
      
      markersRef.current.push(
        new googleMaps.Marker({
          position: center,
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
            position: center,
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
    }

    // نقاط التوقف المخصصة (من السائق) - trip_stops
    const sortedStops = [...stops].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    for (const s of sortedStops) {
      const pos = { lat: safeNumber(s.lat, 0), lng: safeNumber(s.lng, 0) }
      if (!pos.lat || !pos.lng) continue
      if (!route) path.push(pos) // فقط إذا ما كان في route system
      bounds.extend(pos)
      
      markersRef.current.push(
        new googleMaps.Marker({
          position: pos,
          map,
          title: s.title,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png' },
        })
      )
    }

    // Marker: driver live location (Bus icon + small label)
    if (driverLocation) {
      if (!route) path.push(driverLocation) // فقط إذا ما كان في route system
      bounds.extend(driverLocation)
      
      const driverMarker = new googleMaps.Marker({
        position: driverLocation,
        map,
        title: 'موقع السائق',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
          scaledSize: new googleMaps.Size(42, 42),
        },
      })
      markersRef.current.push(driverMarker)

      // بطاقة صغيرة باسم الراكب فوق الحافلة (تظهر تلقائياً)
      if (request?.visitor_name) {
        const info = new googleMaps.InfoWindow({
          content: `
            <div style="
              padding: 6px 10px;
              border-radius: 12px;
              border: 1px solid #e5e7eb;
              background: rgba(255,255,255,0.95);
              box-shadow: 0 8px 20px rgba(0,0,0,0.12);
              font-family: Arial, sans-serif;
              font-size: 12px;
              font-weight: 800;
              color: #111827;
              white-space: nowrap;
            ">
              ${request.visitor_name}
            </div>
          `,
          disableAutoPan: true,
          pixelOffset: new googleMaps.Size(0, -44),
        })
        info.open({ map, anchor: driverMarker, shouldFocus: false })
      }
    }

    // رسم خط السير
    if (path.length > 1) {
      polylineRef.current = new googleMaps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      })
      polylineRef.current.setMap(map)
    }

    // Fit bounds
    if (bounds.getNorthEast() && bounds.getSouthWest()) {
      // fitBounds accepts either a number padding or {top,right,bottom,left}
      map.fitBounds(bounds, 60)
    } else {
      map.setCenter(path[0] || DEFAULT_CENTER)
      map.setZoom(11)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('visit_requests')
        .select('id,user_id,visitor_name,companions_count,travel_date,city,status,arrival_date,departure_date,route_id')
        .eq('id', requestId)

      // إذا لم يكن السائق، أضف شرط user_id
      if (userId !== 'driver') {
        query = query.eq('user_id', userId)
      }

      const { data: req, error: reqErr } = await query.maybeSingle()

      if (reqErr) throw reqErr
      if (!req) {
        toast.error('الطلب غير موجود')
        return
      }
      setRequest(req as any)

      // Load route and route stops (if route system exists)
      const { data: dropoffData } = await supabase
        .from('request_dropoff_points')
        .select('id,request_id,route_id,name,address,lat,lng')
        .eq('request_id', requestId)
        .maybeSingle()
      
      if (dropoffData) {
        setDropoffPoint(dropoffData as any)
        
        // Try to find route for this request (route_id on request has priority)
        const effectiveRouteId = (req as any)?.route_id || (dropoffData as any)?.route_id || null
        const routeQuery = supabase
          .from('routes')
          .select('id,name,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng')
          .eq('is_active', true)
        const { data: routeData } = effectiveRouteId
          ? await routeQuery.eq('id', effectiveRouteId).maybeSingle()
          : await routeQuery.order('created_at', { ascending: true }).limit(1).maybeSingle()
        
        if (routeData) {
          setRoute(routeData as any)
          
          // Load route stop points
          const { data: routeStopsData } = await supabase
            .from('route_stop_points')
            .select('id,route_id,name,description,lat,lng,order_index')
            .eq('route_id', routeData.id)
            .eq('is_active', true)
            .order('order_index', { ascending: true })
          
          if (routeStopsData) {
            setRouteStops(routeStopsData as any)
          }
        }
      }

      // Stops (may not exist yet) - custom stops added by driver
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
  }, [mapsReady, request, driverLocation, stops, route, routeStops, dropoffPoint])

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
                    <span className="text-gray-500">الوقت المتوقع للوصول</span>
                    <span className={`font-semibold ${eta ? 'text-blue-700' : 'text-gray-500'}`}>
                      {driverLocation
                        ? eta
                          ? eta.distanceText
                            ? `${eta.durationText} • ${eta.distanceText}`
                            : eta.durationText
                          : 'جاري الحساب...'
                        : 'غير متاح'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">محطات التوقف</span>
                    <span className="font-semibold tabular-nums">{stops.length}</span>
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2 leading-relaxed">
                    ملاحظة: سيتم تفعيل التتبع بعد الحجز والانطلاق.
                  </div>
                  {!loading && stops.length === 0 && !driverLocation && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>
                        ملاحظة: يلزم تفعيل جداول التتبع في Supabase (سأجهز لك ملف SQL جاهز) ثم يبدأ الإدمن بإدخال نقاط السائق/التوقف.
                      </p>
                      <p>
                        سيتم إضافة تفاصيل التتبّع وموقع الراكب مع السائق على الخريطة لتتبّع الرحلة ومعرفة أماكن النزول للراكب.
                      </p>
                      <p>نتمنى لكم السلامة وزيارة جميلة.</p>
                    </div>
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


