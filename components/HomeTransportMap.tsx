'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { Bus, Calendar, Clock, MapPin, Plane, Route } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

const BORDER_CENTER = { lat: 32.5456, lng: 35.825 } // معبر جابر تقريباً

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
    // Important: use places library to avoid breaking other pages in SPA navigation.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

type LatLng = { lat: number; lng: number }

type PublicTripMapRow = {
  trip_id: string | null
  trip_type: 'arrivals' | 'departures' | string | null
  trip_date: string | null
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string | null
  start_lat: number | null
  start_lng: number | null
  end_location_name: string | null
  end_lat: number | null
  end_lng: number | null
  stops: Array<{ name: string; lat: number; lng: number; order_index: number }> | any
  is_demo: boolean | null
}

type UserHint = {
  request_id: string
  visitor_name: string
  trip_id: string | null
}

export default function HomeTransportMap() {
  const supabase = createSupabaseBrowserClient()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const inViewRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)

  const [ready, setReady] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [mode, setMode] = useState<'arrivals' | 'departures'>('arrivals')
  const [loadingTrip, setLoadingTrip] = useState(false)
  const [tripRow, setTripRow] = useState<PublicTripMapRow | null>(null)
  const [userHint, setUserHint] = useState<UserHint | null>(null)
  const [loadingUserHint, setLoadingUserHint] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const clearPolyline = () => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
  }

  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
      directionsRendererRef.current = null
    }
  }

  const clearMap = () => {
    clearMarkers()
    clearPolyline()
    clearDirections()
  }

  const iconStop = (googleMaps: typeof google.maps) =>
    ({
      path: googleMaps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    }) as any

  const iconBus = (googleMaps: typeof google.maps) =>
    ({
      path: googleMaps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#f59e0b',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    }) as any

  const initMap = () => {
    if (!mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(mapElRef.current, {
        center: BORDER_CENTER,
        zoom: 10,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true, // Satellite / Map
        mapTypeControlOptions: {
          position: googleMaps.ControlPosition.TOP_LEFT,
        },
        zoomControl: true,
        zoomControlOptions: {
          position: googleMaps.ControlPosition.LEFT_CENTER,
        },
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy', // mobile-friendly pan/zoom
        scrollwheel: true,
      })
    }
  }

  const normalizeStops = (raw: any): Array<{ name: string; lat: number; lng: number; order_index: number }> => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    // sometimes comes as json string
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const ensureDemoStops = (
    stopsIn: Array<{ name: string; lat: number; lng: number; order_index: number }>,
    start: LatLng,
    end: LatLng
  ) => {
    // We want a nicer "demo" with exactly 4 visible stop points.
    const target = 4
    const base = (stopsIn || [])
      .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
      .map((s, idx) => ({
        name: s.name || `نقطة توقف ${idx + 1}`,
        lat: Number(s.lat),
        lng: Number(s.lng),
        order_index: Number.isFinite(Number(s.order_index)) ? Number(s.order_index) : idx,
      }))
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

    if (base.length >= target) return base.slice(0, target)

    const out = [...base]
    // Generate missing stops by interpolating between start/end with a slight zigzag so it looks "متعرّج"
    for (let i = out.length; i < target; i++) {
      const t = (i + 1) / (target + 1) // between 0..1
      const lat = start.lat + (end.lat - start.lat) * t
      const lng = start.lng + (end.lng - start.lng) * t
      const zig = (i % 2 === 0 ? 1 : -1) * 0.08
      out.push({
        name: `نقطة توقف ${i + 1}`,
        lat: lat + zig * 0.02,
        lng: lng + zig * 0.03,
        order_index: i,
      })
    }
    return out
  }

  const fetchTripMap = async (kind: 'arrivals' | 'departures') => {
    try {
      setLoadingTrip(true)
      const { data, error } = await supabase.rpc('get_public_trip_map', { p_kind: kind })
      if (error) throw error
      const row = (Array.isArray(data) ? data[0] : data) as PublicTripMapRow | null
      setTripRow(row || null)
    } catch (e: any) {
      console.error('HomeTransportMap load trip map error:', e)
      setTripRow(null)
    } finally {
      setLoadingTrip(false)
    }
  }

  const renderTrip = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapRef.current

    clearMap()

    const start: LatLng | null =
      tripRow?.start_lat != null && tripRow?.start_lng != null
        ? { lat: Number(tripRow.start_lat), lng: Number(tripRow.start_lng) }
        : null

    const end: LatLng | null =
      tripRow?.end_lat != null && tripRow?.end_lng != null
        ? { lat: Number(tripRow.end_lat), lng: Number(tripRow.end_lng) }
        : null

    const baseStops = normalizeStops(tripRow?.stops)
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .slice(0, 7)

    const stops =
      tripRow?.is_demo && start && end ? ensureDemoStops(baseStops as any, start, end) : (baseStops as any)

    if (!start || !end) {
      // fallback center
      map.setCenter(BORDER_CENTER)
      map.setZoom(10)
      return
    }

    const bounds = new googleMaps.LatLngBounds()
    bounds.extend(start)
    bounds.extend(end)

    // Start marker (green)
    markersRef.current.push(
      new googleMaps.Marker({
        position: start,
        map,
        title: tripRow?.start_location_name || 'نقطة البداية',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      })
    )

    // Bus marker (amber) near start (slight offset so it doesn't overlap)
    markersRef.current.push(
      new googleMaps.Marker({
        position: { lat: start.lat + 0.002, lng: start.lng + 0.002 },
        map,
        title: 'الباص',
        icon: iconBus(googleMaps),
        label: {
          text: '🚌',
          color: '#111827',
          fontWeight: '900',
          fontSize: '14px',
        },
        zIndex: 50,
      })
    )

    // Stop markers (blue numbered circles)
    stops.forEach((s: { name: string; lat: number; lng: number; order_index: number }, idx: number) => {
      const pos = { lat: Number(s.lat), lng: Number(s.lng) }
      if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return
      bounds.extend(pos)
      markersRef.current.push(
        new googleMaps.Marker({
          position: pos,
          map,
          title: s.name || `نقطة توقف ${idx + 1}`,
          icon: iconStop(googleMaps),
          label: { text: String(idx + 1), color: '#ffffff', fontWeight: '900', fontSize: '12px' },
        })
      )
    })

    // End marker (red)
    markersRef.current.push(
      new googleMaps.Marker({
        position: end,
        map,
        title: tripRow?.end_location_name || 'نقطة النهاية',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      })
    )

    // Draw route on roads (preferred) using Directions API; fallback to polyline if it fails
    const path: LatLng[] = [
      start,
      ...stops.map((s: { lat: number; lng: number }) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      end,
    ]
    map.fitBounds(bounds, 60)

    const waypoints: google.maps.DirectionsWaypoint[] = path
      .slice(1, Math.max(1, path.length - 1))
      .slice(0, 23) // Google max waypoints
      .map((p) => ({ location: { lat: p.lat, lng: p.lng }, stopover: true }))

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new googleMaps.DirectionsService()
    }
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: true,
        polylineOptions: { strokeColor: '#2563eb', strokeOpacity: 0.9, strokeWeight: 5 },
      })
      directionsRendererRef.current.setMap(map)
    } else {
      directionsRendererRef.current.setMap(map)
    }

    directionsServiceRef.current
      .route({
        origin: start,
        destination: end,
        waypoints,
        travelMode: googleMaps.TravelMode.DRIVING,
        optimizeWaypoints: false,
      })
      .then((res) => {
        directionsRendererRef.current?.setDirections(res)
      })
      .catch((e) => {
        console.warn('HomeTransportMap directions failed; falling back to polyline', e)
        clearDirections()
        polylineRef.current = new googleMaps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        })
        polylineRef.current.setMap(map)
      })
  }

  const loadUserHint = async () => {
    try {
      setLoadingUserHint(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setUserHint(null)
        return
      }

      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, visitor_name, trip_id, created_at, admin_notes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setUserHint(null)
        return
      }

      // show even if draft; but keep it safe/minimal
      setUserHint({
        request_id: data.id,
        visitor_name: (data as any).visitor_name || 'الراكب',
        trip_id: (data as any).trip_id || null,
      })
    } catch (e) {
      console.error('HomeTransportMap load user hint error:', e)
      setUserHint(null)
    } finally {
      setLoadingUserHint(false)
    }
  }

  useEffect(() => {
    // Lazy-load Google Maps only when the map area is in view (big perf win on slow phones)
    if (!inViewRef.current) return
    const el = inViewRef.current
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true)
          obs.disconnect()
        }
      },
      { root: null, threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setErrorText('مفتاح Google Maps غير موجود')
          return
        }
        if (!shouldLoad) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setReady(true)
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setErrorText('تعذّر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey, shouldLoad])

  useEffect(() => {
    if (!ready) return
    initMap()
    fetchTripMap(mode)
    loadUserHint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    if (!ready) return
    fetchTripMap(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready])

  useEffect(() => {
    if (!ready) return
    renderTrip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(tripRow)])

  const tripLabel = useMemo(() => {
    const isArr = mode === 'arrivals'
    const badge = isArr ? 'القادمون' : 'المغادرون'
    const demo = tripRow?.is_demo ? 'نموذج' : 'رحلة حالية'
    const startName = tripRow?.start_location_name || ''
    const endName = tripRow?.end_location_name || ''
    const route = startName && endName ? `${startName} → ${endName}` : null
    return { badge, demo, route }
  }, [mode, tripRow])

  const dateText = useMemo(() => {
    // Demo: always show today's date (each day by itself)
    if (tripRow?.is_demo) {
      const today = new Date().toISOString().slice(0, 10)
      try {
        return formatDate(today)
      } catch {
        return today
      }
    }
    if (!tripRow?.trip_date) return null
    try {
      return formatDate(tripRow.trip_date)
    } catch {
      return tripRow.trip_date
    }
  }, [tripRow?.trip_date])

  const timeText = useMemo(() => {
    // Demo: always show a morning time
    if (tripRow?.is_demo) return '06:30'
    const t = tripRow?.departure_time || tripRow?.meeting_time
    if (!t) return null
    return String(t).slice(0, 5)
  }, [tripRow?.departure_time, tripRow?.meeting_time])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              خريطة تسلسل الرحلة والمسار
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
              رحلة حالية إن وجدت — وإن لم توجد نعرض نموذج رحلة مع نقاط التوقف ورسم المسار
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMode('arrivals')}
              className={[
                'px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition',
                mode === 'arrivals'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
              aria-label="القادمون"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5" />
                القادمون
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('departures')}
              className={[
                'px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition',
                mode === 'departures'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
              aria-label="المغادرون"
            >
              <span className="inline-flex items-center gap-1.5">
                <Plane className="w-3.5 h-3.5 rotate-180" />
                المغادرون
              </span>
            </button>
          </div>
        </div>

        {errorText ? (
          <div className="p-5 text-sm text-gray-700">{errorText}</div>
        ) : (
          <div ref={inViewRef} className="w-full relative">
            {!shouldLoad && (
              <div className="w-full h-[280px] sm:h-[360px] md:h-[420px] flex items-center justify-center bg-gray-50 text-sm text-gray-600">
                جاري تحميل الخريطة...
              </div>
            )}
            <div
              ref={mapElRef}
              className={`${shouldLoad ? '' : 'hidden'} w-full h-[280px] sm:h-[360px] md:h-[420px]`}
            />

            {/* Overlay: Trip meta */}
            {shouldLoad && (
              <div className="pointer-events-none absolute inset-0">
                {/* Trip meta (top-right) */}
                <div className="pointer-events-none absolute top-3 right-3 left-3 sm:left-auto">
                  <div className="pointer-events-auto bg-white/85 backdrop-blur-md rounded-lg shadow-md border border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0 w-full sm:w-[min(22rem,calc(100vw-1.5rem))]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Bus className="w-4.5 h-4.5 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-extrabold text-gray-900 truncate">
                        {tripLabel.badge} — {loadingTrip ? 'جاري التحميل...' : tripLabel.demo}
                      </div>
                      <div className="text-[10px] text-gray-600 truncate">
                        {tripLabel.route || 'مسار افتراضي'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-700">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-gray-600" />
                      {dateText || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-gray-600" />
                      {timeText || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold whitespace-nowrap">
                      <Route className="w-3.5 h-3.5" />
                      نقاط توقف: {normalizeStops(tripRow?.stops).length}
                    </span>
                  </div>
                  </div>
                </div>

                {/* Overlay: user hint */}
                {userHint && (
                  <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:right-auto">
                    <div className="pointer-events-auto bg-white/85 backdrop-blur-md rounded-lg shadow-md border border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2.5 w-full sm:w-[min(18rem,calc(100vw-1.5rem))]">
                    <div className="text-[11px] sm:text-xs font-extrabold text-gray-900 break-words leading-tight">
                      {userHint.visitor_name}
                    </div>
                    <div className="text-[10px] text-gray-700 mt-1 leading-relaxed line-clamp-2">
                      {userHint.trip_id
                        ? 'تتبّع الرحلة متاح الآن.'
                        : 'سيتوفر لك تتبّع الرحلة عند بداية رحلة الراكب.'}
                    </div>
                    <div className="mt-2">
                      {userHint.trip_id ? (
                        <Link
                          href={`/dashboard/request/${userHint.request_id}/track`}
                          className="inline-flex items-center justify-center w-full px-3 py-2 rounded-lg bg-green-600 text-white text-[11px] font-extrabold hover:bg-green-700 transition"
                        >
                          فتح تتبّع الرحلة
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/request/${userHint.request_id}/follow`}
                          className="inline-flex items-center justify-center w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-[11px] font-extrabold hover:bg-blue-700 transition"
                        >
                          متابعة الطلب
                        </Link>
                      )}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


