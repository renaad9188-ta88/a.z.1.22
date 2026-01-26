'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Navigation, Power } from 'lucide-react'

type LatLng = { lat: number; lng: number }

type TripRow = {
  id: string
  route_id: string
  trip_type?: string | null
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
}

type TripStopRow = { id: string; trip_id: string; name: string; lat: number; lng: number; order_index: number }

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

export default function DriverAvailabilityMap({ selectedTripId }: { selectedTripId?: string | null }) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastSentAtRef = useRef<number>(0)
  const lastUiAtRef = useRef<number>(0)

  const [loading, setLoading] = useState(true)
  const [mapsReady, setMapsReady] = useState(false)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [trip, setTrip] = useState<TripRow | null>(null)
  const [tripStops, setTripStops] = useState<TripStopRow[]>([])
  const [isAvailable, setIsAvailable] = useState(false)
  const [myLoc, setMyLoc] = useState<LatLng | null>(null)

  const todayISO = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
  }

  const render = () => {
    if (!mapsReady) {
      console.log('Map not ready yet (mapsReady:', mapsReady, ')')
      return
    }
    if (!mapElRef.current) {
      console.warn('Map element ref is not set, retrying in 200ms...')
      setTimeout(() => {
        if (mapElRef.current) {
          console.log('Map element ref is now set, rendering...')
          render()
        }
      }, 200)
      return
    }
    if (!(window as any).google?.maps) {
      console.warn('Google Maps API not loaded in window')
      return
    }
    console.log('Rendering map...')
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(mapElRef.current, {
        center: { lat: 32.5456, lng: 35.825 },
        zoom: 9,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: { position: googleMaps.ControlPosition.TOP_LEFT },
        zoomControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'greedy',
        scrollwheel: true,
      })
    }

    const map = mapRef.current
    clearMarkers()

    const bounds = new googleMaps.LatLngBounds()

    if (trip) {
      const start = { lat: trip.start_lat, lng: trip.start_lng }
      const end = { lat: trip.end_lat, lng: trip.end_lng }
      bounds.extend(start)
      bounds.extend(end)

      // رمز الباص للرحلة: نضعه على بداية الخط فقط لرحلات "القادمون"
      // (حتى لا يظهر رمز باص إضافي عند رحلات المغادرون التي غالباً تبدأ من عمان)
      const isDepartures = ['departures', 'departure'].includes(String((trip as any)?.trip_type || '').toLowerCase())
      if (!isDepartures) {
        markersRef.current.push(
          new googleMaps.Marker({
            position: start,
            map,
            title: 'باص الرحلة (بداية الخط)',
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
              scaledSize: new googleMaps.Size(40, 40),
            },
            animation: googleMaps.Animation.DROP,
          })
        )
      }

      markersRef.current.push(
        new googleMaps.Marker({
          position: start,
          map,
          title: trip.start_location_name,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
        })
      )

      const sortedStops = [...tripStops].sort((a, b) => a.order_index - b.order_index)
      const minOrderIndex = (() => {
        const nums = sortedStops.map((s: any) => Number(s?.order_index)).filter((n: any) => Number.isFinite(n))
        return nums.length ? Math.min(...nums) : 0
      })()
      for (const s of sortedStops) {
        const pos = { lat: s.lat, lng: s.lng }
        bounds.extend(pos)
        markersRef.current.push(
          new googleMaps.Marker({
            position: pos,
            map,
            title: s.name,
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            label: {
              text: String(minOrderIndex === 0 ? Number(s.order_index) + 1 : Number(s.order_index)),
              color: '#fff',
              fontWeight: '900',
            },
          })
        )
      }

      markersRef.current.push(
        new googleMaps.Marker({
          position: end,
          map,
          title: trip.end_location_name,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        })
      )

      // route on roads (blue)
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

      const waypoints: google.maps.DirectionsWaypoint[] = sortedStops
        .slice(0, 23)
        .map((s) => ({ location: { lat: s.lat, lng: s.lng }, stopover: true }))

      ;(async () => {
        try {
          const res = await directionsServiceRef.current!.route({
            origin: start,
            destination: end,
            waypoints,
            travelMode: googleMaps.TravelMode.DRIVING,
            optimizeWaypoints: false,
          })
          directionsRendererRef.current?.setDirections(res)
          const rb = res.routes?.[0]?.bounds
          if (rb) {
            if (myLoc) bounds.extend(myLoc)
            map.fitBounds(rb, { top: 70, bottom: 70, left: 50, right: 50 })
          } else {
            if (myLoc) bounds.extend(myLoc)
            map.fitBounds(bounds, 60)
          }
        } catch {
          if (myLoc) bounds.extend(myLoc)
          map.fitBounds(bounds, 60)
        }
      })()
    }

    // موقع السائق الحالي (نُظهره دائماً إذا كان متاح)
    // ملاحظة: لتجنب ظهور "باصين" على الخريطة، لا نستخدم أيقونة باص لموقع السائق أثناء وجود رحلة.
    if (myLoc) {
      console.log('Adding driver location marker at:', myLoc)
      bounds.extend(myLoc)
      markersRef.current.push(
        new googleMaps.Marker({
          position: myLoc,
          map,
          title: 'موقعي الحالي (السائق)',
          ...(trip
            ? {
                icon: {
                  path: googleMaps.SymbolPath.CIRCLE,
                  scale: 9,
                  fillColor: '#111827',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                },
                label: { text: 'س', color: '#fff', fontWeight: '900' },
              }
            : {
                icon: {
                  url: 'http://maps.google.com/mapfiles/ms/icons/bus.png', // بدون رحلة: أيقونة واضحة
                  scaledSize: new googleMaps.Size(48, 48),
                },
              }),
          animation: googleMaps.Animation.DROP, // تأثير سقوط عند الظهور
        })
      )
      
      // إضافة InfoWindow لموقع السائق
      const infoWindow = new googleMaps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; color: #1f2937;">
            📍 موقعي الحالي (السائق)<br>
            ${new Date().toLocaleTimeString('ar-JO')}
          </div>
        `,
      })
      // فتح InfoWindow تلقائياً (أو يمكن فتحه عند النقر على الماركر)
      setTimeout(() => {
        if (markersRef.current.length > 0) {
          const driverMarker = markersRef.current[markersRef.current.length - 1]
          infoWindow.open(map, driverMarker)
        }
      }, 500)

      // إذا ما كان في رحلة، ركز الخريطة على موقع السائق
      if (!trip) {
        map.setCenter(myLoc)
        map.setZoom(15)
      } else if (bounds.getNorthEast() && bounds.getSouthWest()) {
        // إذا في رحلة + موقع سائق، استخدم fitBounds
        map.fitBounds(bounds, 60)
      }
    } else if (!trip) {
      // إذا ما كان في رحلة ولا موقع سائق، اعرض منطقة افتراضية (الأردن/سوريا)
      map.setCenter({ lat: 32.5456, lng: 35.825 })
      map.setZoom(9)
    }
  }

  const loadAssignedCurrentTrip = async (driverId: string) => {
    // 1) trip ids assigned to driver
    const { data: rows, error } = await supabase
      .from('route_trip_drivers')
      .select('trip_id')
      .eq('driver_id', driverId)
      .eq('is_active', true)
    if (error) throw error
    const tripIds = (rows || []).map((r: any) => r.trip_id).filter(Boolean)
    if (tripIds.length === 0) return null

    // 2) load "current" trip: prefer today, else the next upcoming trip
    const { data: trips, error: tErr } = await supabase
      .from('route_trips')
      .select(
        'id,route_id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng'
      )
      .in('id', tripIds)
      .gte('trip_date', todayISO)
      .eq('is_active', true)
      .order('trip_date', { ascending: true })
      .order('departure_time', { ascending: true })
      .limit(1)
    if (tErr) throw tErr
    return (trips || [])[0] || null
  }

  const loadTripById = async (tripId: string) => {
    const { data, error } = await supabase
      .from('route_trips')
      .select(
        'id,route_id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng'
      )
      .eq('id', tripId)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return (data as any) || null
  }

  const loadStopsForTrip = async (t: TripRow | null) => {
    if (!t?.id) return []
    const { data: stops, error: sErr } = await supabase
      .from('route_trip_stop_points')
      .select('id,trip_id,name,lat,lng,order_index')
      .eq('trip_id', t.id)
      .order('order_index', { ascending: true })
    if (sErr) throw sErr
    if ((stops || []).length > 0) return (stops || []) as any

    // fallback to route fixed points
    const { data: routeStops, error: rsErr } = await supabase
      .from('route_stop_points')
      .select('id,name,lat,lng,order_index')
      .eq('route_id', t.route_id)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
    if (rsErr) throw rsErr
    return ((routeStops || []) as any[]).map((x) => ({ ...x, trip_id: t.id }))
  }

  const load = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driverRow, error: dErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (dErr) throw dErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق')
        return
      }
      setDriverId(driverRow.id)

      // Read current live status (فقط للحالة "متاح"، مش للموقع)
      const { data: liveRow } = await supabase
        .from('driver_live_status')
        .select('is_available')
        .eq('driver_id', driverRow.id)
        .maybeSingle()
      const wasAvailable = Boolean((liveRow as any)?.is_available)
      setIsAvailable(wasAvailable)
      
      // مهم: ما نقرأ الموقع القديم من قاعدة البيانات - لازم نجيب الموقع الحقيقي من المتصفح
      // لأن الموقع القديم ممكن يكون غير دقيق أو قديم
      console.log('Driver availability status:', wasAvailable ? 'متاح' : 'غير متاح')
      
      // إذا كان السائق متاح من قبل، شغّل watchPosition تلقائياً (وهو رح يجيب الموقع الحقيقي)
      if (wasAvailable && driverRow.id) {
        console.log('Driver was already available, starting watchPosition to get REAL location...')
        // تأخير بسيط لضمان أن load() انتهى
        setTimeout(() => {
          startWatch(driverRow.id)
        }, 500)
      }

      const t = selectedTripId ? await loadTripById(selectedTripId) : await loadAssignedCurrentTrip(driverRow.id)
      setTrip((t as any) || null)
      const stops = await loadStopsForTrip(t as any)
      setTripStops((stops || []) as any)
    } catch (e: any) {
      console.error('DriverAvailabilityMap load error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Reload trip/map when selection changes
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId])

  const upsertLive = async (driverId: string, patch: Partial<{ is_available: boolean; lat: number; lng: number }>) => {
    const payload: any = { driver_id: driverId, ...patch }
    const { error } = await supabase.from('driver_live_status').upsert(payload, { onConflict: 'driver_id' })
    if (error) throw error
  }

  const startWatch = (driverId: string) => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع')
      return
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    lastSentAtRef.current = 0
    lastUiAtRef.current = 0
    
    // طلب الموقع الحقيقي مباشرة (maximumAge: 0 يعني لا تستخدم cached location)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = pos.coords.accuracy // دقة الموقع بالمتر
        setMyLoc({ lat, lng })
        lastUiAtRef.current = Date.now()
        // إعادة رسم الخريطة مرة واحدة بعد الحصول على الموقع الأول
        if (mapsReady) {
          setTimeout(() => render(), 0)
        }
        try {
          await upsertLive(driverId, { is_available: true, lat, lng })
          toast.success(`تم تحديد موقعك الحالي بدقة ${Math.round(accuracy)} متر`)
        } catch (e) {
          toast.error('تعذر حفظ الموقع في قاعدة البيانات')
        }
      },
      (err) => {
        if (err.code === 1) {
          toast.error('تم رفض صلاحية الموقع. يرجى تفعيل صلاحيات الموقع في إعدادات المتصفح.')
        } else if (err.code === 3) {
          toast.error('انتهت مهلة الحصول على الموقع. تحقق من اتصال الإنترنت.')
        } else {
          toast.error('تعذر الحصول على الموقع: ' + err.message)
        }
        setIsAvailable(false)
      },
      { 
        enableHighAccuracy: true, // استخدم GPS للحصول على موقع دقيق
        maximumAge: 0, // لا تستخدم cached location - اجلب موقع جديد دائماً
        timeout: 20000 // مهلة 20 ثانية للحصول على موقع دقيق
      }
    )
    
    // بعدها شغّل watchPosition للتحديث المستمر (بعد الحصول على الموقع الأول)
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const now = Date.now()
        const THROTTLE_MS = 120000 // تحديث كل دقيقتين لتقليل الاستهلاك

        // 1) UI throttle: لا نحدث الواجهة/الخريطة إلا كل دقيقتين (لتجنب كثرة التحديث)
        if (now - lastUiAtRef.current >= THROTTLE_MS) {
          lastUiAtRef.current = now
          setMyLoc({ lat, lng })
          if (mapsReady) {
            setTimeout(() => render(), 0)
          }
        }

        // 2) DB throttle: حفظ في قاعدة البيانات كل دقيقتين
        if (now - lastSentAtRef.current < THROTTLE_MS) {
          return
        }
        lastSentAtRef.current = now
        try {
          await upsertLive(driverId, { is_available: true, lat, lng })
        } catch (e) {
        }
      },
      (err) => {
        if (err.code === 1) {
          toast.error('تم رفض صلاحية الموقع. يرجى تفعيل صلاحيات الموقع في إعدادات المتصفح.')
        } else {
          toast.error('تعذر تشغيل التتبع: ' + err.message)
        }
        setIsAvailable(false)
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
      },
      { 
        enableHighAccuracy: true, // استخدم GPS للموقع الدقيق
        maximumAge: 120000, // اقبل موقع cached إذا عمره أقل من دقيقتين
        timeout: 15000 
      }
    )
  }

  const stopWatch = async (driverId: string) => {
    if (watchIdRef.current !== null && navigator?.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    await upsertLive(driverId, { is_available: false })
  }

  const toggle = async () => {
    if (!driverId) return
    try {
      const next = !isAvailable
      setIsAvailable(next)
      if (next) {
        toast.success('تم التفعيل: متاح + تتبع مباشر')
        await upsertLive(driverId, { is_available: true })
        startWatch(driverId)
      } else {
        toast('تم الإيقاف')
        await stopWatch(driverId)
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'تعذر تحديث الحالة')
      setIsAvailable(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          console.warn('Google Maps API key is missing')
          return
        }
        console.log('Loading Google Maps API...')
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        console.log('Google Maps API loaded successfully')
        setMapsReady(true)
      } catch (e) {
        console.error('Failed to load Google Maps API:', e)
        toast.error('تعذر تحميل الخريطة: ' + (e as Error).message)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapsReady) {
      console.log('Waiting for mapsReady...')
      return
    }
    if (!mapElRef.current) {
      console.log('Waiting for mapElRef.current...')
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (mapElRef.current && mapsReady) {
          console.log('Map element is now ready, rendering...')
          render()
        }
      }, 300)
      return () => clearTimeout(timer)
    }
    // تأخير بسيط لضمان أن العنصر مربوط في DOM
    const timer = setTimeout(() => {
      console.log('Calling render() now...')
      render()
    }, 150)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, trip?.id, tripStops.length])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator?.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            خريطة الرحلة + حالة السائق
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {trip
              ? `الرحلة الحالية: ${trip.start_location_name} → ${trip.end_location_name} (تجمع: ${trip.meeting_time || '—'} | انطلاق: ${trip.departure_time || '—'})`
              : 'لا توجد رحلة معيّنة لك حالياً. اطلب من الإدارة تعيين رحلة لك.'}
          </p>
        </div>

        <button
          type="button"
          onClick={toggle}
          className={`px-4 py-2.5 rounded-lg transition text-sm font-extrabold inline-flex items-center gap-2 ${
            isAvailable ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
          }`}
          title="تشغيل/إيقاف الظهور والتتبع"
          disabled={loading}
        >
          <Power className="w-4 h-4" />
          {isAvailable ? 'غير متاح (إيقاف)' : 'متاح (تشغيل)'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">جاري التحميل...</div>
      ) : !apiKey ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠️ مفتاح Google Maps غير موجود. يرجى إضافة <code className="bg-white px-2 py-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> في ملف .env.local
        </div>
      ) : !mapsReady ? (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          جاري تحميل الخريطة... إذا لم تظهر، تأكد من اتصال الإنترنت وصحة مفتاح Google Maps.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div ref={mapElRef} className="w-full h-[320px] sm:h-[420px]" />
        </div>
      )}

      <div className="mt-3 text-[11px] sm:text-xs text-gray-500 flex items-center gap-2">
        <Navigation className="w-4 h-4" />
        التتبع يُرسل فقط عند تفعيل &quot;متاح&quot;، ويمكنك إيقافه فوراً.
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


