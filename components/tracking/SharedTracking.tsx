'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'
import Link from 'next/link'
import { ArrowRight, Bus, Calendar, Clock, MapPin, Phone, MessageCircle, RefreshCw } from 'lucide-react'

type LatLng = { lat: number; lng: number }

type SharedPayload = {
  request?: {
    id: string
    visitor_name: string
    companions_count: number
    status: string
    trip_status: string | null
    trip_id: string | null
    selected_dropoff_stop_id?: string | null
    selected_pickup_stop_id?: string | null
  } | null
  trip?: {
    id: string
    trip_date: string | null
    meeting_time: string | null
    departure_time: string | null
    trip_type: string | null
    start_location_name: string | null
    start_lat: number | null
    start_lng: number | null
    end_location_name: string | null
    end_lat: number | null
    end_lng: number | null
  } | null
  stops?: Array<{ id: string; name: string; lat: number; lng: number; order_index: number }>
  driver?: { id: string; name: string; phone: string | null; vehicle_type?: string | null } | null
  live?: { lat: number | null; lng: number | null; updated_at: string | null; is_available: boolean | null } | null
} | null

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export default function SharedTracking({ token }: { token: string }) {
  const supabase = createSupabaseBrowserClient()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [payload, setPayload] = useState<SharedPayload>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const driverPhoneDigits = useMemo(() => {
    const raw = payload?.driver?.phone || ''
    return raw ? String(raw).replace(/[^\d]/g, '') : ''
  }, [payload?.driver?.phone])

  const driverCallDigits = useMemo(() => {
    const raw = payload?.driver?.phone || ''
    return raw ? String(raw).replace(/[^\d+]/g, '') : ''
  }, [payload?.driver?.phone])

  const tripCenter: LatLng | null = useMemo(() => {
    const t = payload?.trip
    if (!t?.start_lat || !t?.start_lng) return null
    return { lat: Number(t.start_lat), lng: Number(t.start_lng) }
  }, [payload?.trip])

  const driverLoc: LatLng | null = useMemo(() => {
    const live = payload?.live
    if (!live?.lat || !live?.lng) return null
    return { lat: Number(live.lat), lng: Number(live.lng) }
  }, [payload?.live])

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
  }

  const renderMap = () => {
    if (!mapsReady || !mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    const center = driverLoc || tripCenter || { lat: 32.5456, lng: 35.825 }
    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapElRef.current, {
        center,
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      })
    } else {
      mapObjRef.current.setCenter(center)
    }

    const map = mapObjRef.current
    clearMarkers()

    const t = payload?.trip
    if (t?.start_lat && t?.start_lng) {
      const m = new googleMaps.Marker({
        map,
        position: { lat: Number(t.start_lat), lng: Number(t.start_lng) },
        title: t.start_location_name || 'بداية الرحلة',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      })
      markersRef.current.push(m)
    }
    if (t?.end_lat && t?.end_lng) {
      const m = new googleMaps.Marker({
        map,
        position: { lat: Number(t.end_lat), lng: Number(t.end_lng) },
        title: t.end_location_name || 'نهاية الرحلة',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      })
      markersRef.current.push(m)
    }
    if (driverLoc) {
      const m = new googleMaps.Marker({
        map,
        position: driverLoc,
        title: payload?.driver?.name ? `السائق: ${payload.driver.name}` : 'موقع السائق',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/bus.png' },
      })
      markersRef.current.push(m)
    }

    // Fit bounds if we have more than one point
    const pts: LatLng[] = []
    if (t?.start_lat && t?.start_lng) pts.push({ lat: Number(t.start_lat), lng: Number(t.start_lng) })
    if (t?.end_lat && t?.end_lng) pts.push({ lat: Number(t.end_lat), lng: Number(t.end_lng) })
    if (driverLoc) pts.push(driverLoc)
    if (pts.length >= 2) {
      const bounds = new googleMaps.LatLngBounds()
      pts.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds)
    }
  }

  const loadShared = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setErrorText(null)

      const { data, error } = await supabase.rpc('get_shared_tracking', { p_token: token })
      if (error) throw error
      if (!data) {
        setPayload(null)
        setErrorText('الرابط غير صالح أو انتهت صلاحيته.')
        return
      }
      setPayload(data as any)
    } catch (e: any) {
      console.error('SharedTracking load error:', e)
      setErrorText(e?.message || 'تعذر تحميل التتبع')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setErrorText('Google Maps API Key غير مضبوط.')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e: any) {
        console.error('SharedTracking maps error:', e)
        setErrorText('تعذر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    loadShared(false)
    // refresh live every 30s
    const t = setInterval(() => loadShared(true), 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    renderMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, payload?.trip, payload?.live, payload?.driver])

  const trip = payload?.trip
  const req = payload?.request
  const live = payload?.live

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل التتبع...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        <div className="mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-semibold">
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </Link>
        </div>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-gray-900">تتبع رحلة</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                هذا رابط مشاركة خاص — لا تشاركه إلا مع الأشخاص الموثوقين.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadShared(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-xs sm:text-sm font-bold disabled:opacity-50"
              title="تحديث"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>

          {errorText ? (
            <div className="p-4 sm:p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{errorText}</div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-700">
                  <span className="inline-flex items-center gap-2 font-extrabold text-gray-900">
                    <Bus className="w-4 h-4 text-blue-600" />
                    {req?.visitor_name || 'الراكب'}
                  </span>
                  {trip?.trip_date && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 border border-blue-100 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-blue-700" />
                      {formatDate(trip.trip_date)}
                    </span>
                  )}
                  {(trip?.departure_time || trip?.meeting_time) && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 font-bold">
                      <Clock className="w-3.5 h-3.5 text-gray-600" />
                      {String(trip.departure_time || trip.meeting_time).slice(0, 5)}
                    </span>
                  )}
                  {trip?.start_location_name && trip?.end_location_name && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 font-bold">
                      <MapPin className="w-3.5 h-3.5 text-gray-600" />
                      {trip.start_location_name} → {trip.end_location_name}
                    </span>
                  )}
                </div>

                {payload?.driver && (
                  <div className="mt-3 border-t border-gray-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-gray-900">
                        السائق: {payload.driver.name || '—'}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-600">
                        {payload.driver.vehicle_type || ''} {payload.driver.phone ? `• ${payload.driver.phone}` : ''}
                      </p>
                      {live?.updated_at && (
                        <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
                          آخر تحديث للموقع: {new Date(live.updated_at).toLocaleString('ar')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {driverPhoneDigits && (
                        <a
                          href={`https://wa.me/${driverPhoneDigits}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-extrabold"
                        >
                          <MessageCircle className="w-4 h-4" />
                          واتساب السائق
                        </a>
                      )}
                      {driverCallDigits && (
                        <a
                          href={`tel:${driverCallDigits}`}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-extrabold"
                        >
                          <Phone className="w-4 h-4" />
                          اتصال
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div ref={mapElRef} className="w-full h-[360px] sm:h-[480px]" />
              </div>

              <div className="text-[11px] sm:text-xs text-gray-600">
                ملاحظة: يظهر الموقع فقط عندما يكون السائق فعّل “متاح” ويتم تحديثه تلقائياً.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


