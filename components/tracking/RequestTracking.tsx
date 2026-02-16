'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { MapPin, Users, Navigation, Share2, Copy, Smartphone } from 'lucide-react'
import TrackingInfoCard from './TrackingInfoCard'
import SharingSection from './SharingSection'
import TrackingStatusCard from './TrackingStatusCard'

type LatLng = { lat: number; lng: number }

type RequestRow = {
  id: string
  user_id: string
  visitor_name: string
  companions_count: number | null
  companions_data: any | null
  travel_date: string
  city: string
  status: string
  arrival_date: string | null
  departure_date: string | null
  trip_status?: string | null
  vehicle_type?: string | null
  trip_id?: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
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
  stop_kind?: 'pickup' | 'dropoff' | 'both' | null
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
  const [tripInfo, setTripInfo] = useState<{
    trip_date: string
    meeting_time: string | null
    departure_time: string | null
    start_location_name: string
    end_location_name: string
    trip_type: 'arrival' | 'departure' | null
  } | null>(null)
  const [selectedStopPoint, setSelectedStopPoint] = useState<{ name: string } | null>(null)
  const [eta, setEta] = useState<{ durationText: string; distanceText?: string } | null>(null)
  const [sharingLocation, setSharingLocation] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [creatingShareLink, setCreatingShareLink] = useState(false)

  const peopleCount = useMemo(() => {
    if (!request) return 0
    // القادم (الزائر) + المرافقين
    const companions = safeNumber(request.companions_count, 0)
    return 1 + Math.max(0, companions)
  }, [request])

  const companionNames = useMemo(() => {
    const raw = (request as any)?.companions_data
    if (!raw || !Array.isArray(raw)) return []
    return raw
      .map((c: any) => (c?.fullName || c?.full_name || c?.name || c?.visitor_name || '').toString().trim())
      .filter(Boolean)
  }, [request])

  const shortCode = useMemo(() => requestId.slice(0, 8).toUpperCase(), [requestId])

  const tripStatus = (request as any)?.trip_status as string | null | undefined
  const shouldHideVehicle = useMemo(() => {
    const ts = (tripStatus || '').toLowerCase()
    return ts === 'arrived' || ts === 'completed' || (request?.status || '').toLowerCase() === 'completed'
  }, [tripStatus, request?.status])

  const vehicleMeta = useMemo(() => {
    const raw = ((request as any)?.vehicle_type || '') as string
    const v = raw.toLowerCase()
    const isCar =
      v.includes('car') || v.includes('sedan') || v.includes('taxi') || v.includes('سيارة') || v.includes('خصوصي')
    const kind: 'car' | 'bus' = isCar ? 'car' : 'bus'
    return {
      kind,
      emoji: kind === 'car' ? '🚗' : '🚌',
      label: kind === 'car' ? 'السيارة' : 'الباص',
      iconUrl:
        kind === 'car'
          ? 'http://maps.google.com/mapfiles/kml/shapes/cabs.png'
          : 'http://maps.google.com/mapfiles/ms/icons/bus.png',
    }
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

    const sortedStops = [...stops].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    const hasCustomTripStops = sortedStops.length > 0

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

      // نقاط التوقف: إذا السائق رسم "سير الرحلة" (trip_stops) نستخدمها بدل نقاط الخط الثابتة
      if (hasCustomTripStops) {
        for (const s of sortedStops) {
          const pos: LatLng = { lat: safeNumber(s.lat, 0), lng: safeNumber(s.lng, 0) }
          if (!pos.lat || !pos.lng) continue
          bounds.extend(pos)
          markersRef.current.push(
            new googleMaps.Marker({
              position: pos,
              map,
              title: s.title,
              icon: {
                path: googleMaps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              label: {
                text: String((s.order_index ?? 0) + 1),
                color: '#ffffff',
                fontWeight: '900',
                fontSize: '12px',
              },
            })
          )
        }
      } else {
        // نقاط التوقف الثابتة (route_stop_points) - بصورة حافلة
        const sortedRouteStops = [...routeStops].sort((a, b) => a.order_index - b.order_index)
        for (const stop of sortedRouteStops) {
          const pos: LatLng = { lat: stop.lat, lng: stop.lng }
          bounds.extend(pos)
          // أيقونة نقطة توقف (دائرة زرقاء مرقمة)
          markersRef.current.push(
            new googleMaps.Marker({
              position: pos,
              map,
              title: stop.name,
              icon: {
                path: googleMaps.SymbolPath.CIRCLE,
                scale: 9,
                fillColor: '#2563eb',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
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

      const waypointSource = hasCustomTripStops
        ? sortedStops.map((s) => ({ lat: safeNumber(s.lat, 0), lng: safeNumber(s.lng, 0) })).filter((p) => p.lat && p.lng)
        : [...routeStops].sort((a, b) => a.order_index - b.order_index).map((s) => ({ lat: s.lat, lng: s.lng }))

      const waypoints: google.maps.DirectionsWaypoint[] = waypointSource
        .slice(0, 23) // حد Google للـ waypoints في أغلب الخطط
        .map((p) => ({ location: p, stopover: true }))

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
          if (!driverLocation || shouldHideVehicle) {
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

    // نقاط التوقف المخصصة (من السائق) - trip_stops (في الوضع القديم فقط)
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
    if (driverLocation && !shouldHideVehicle) {
      if (!route) path.push(driverLocation) // فقط إذا ما كان في route system
      bounds.extend(driverLocation)
      
      const driverMarker = new googleMaps.Marker({
        position: driverLocation,
        map,
        title: `موقع ${vehicleMeta.label}`,
        icon: {
          url: vehicleMeta.iconUrl,
          scaledSize: new googleMaps.Size(42, 42),
        },
      })
      markersRef.current.push(driverMarker)

      // بطاقة صغيرة باسم الراكب فوق الحافلة (تظهر تلقائياً)
      if (request?.visitor_name) {
        const labelText =
          peopleCount > 1 ? `${request.visitor_name} (+${peopleCount - 1})` : request.visitor_name
        
        // بناء محتوى البطاقة بشكل أفضل
        let cardContent = `
          <div style="
            padding: 10px 14px;
            border-radius: 12px;
            border: 2px solid #3b82f6;
            background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-width: 200px;
            max-width: 300px;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="font-size: 20px;">${vehicleMeta.emoji}</span>
              <span style="font-size: 14px; font-weight: 800; color: #1e40af;">
                موقع ${vehicleMeta.label}
              </span>
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
              <div style="font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 4px;">
                ${labelText}
              </div>
        `
        
        // إضافة معلومات الرحلة إذا كانت متوفرة
        if (tripInfo) {
          const tripTypeLabel = tripInfo.trip_type === 'arrival' ? 'رحلة القادمين' : 'رحلة المغادرين'
          cardContent += `
              <div style="font-size: 11px; color: #6b7280; margin-top: 6px;">
                <div style="margin-bottom: 3px;">${tripTypeLabel}</div>
                <div style="margin-bottom: 3px;">${tripInfo.start_location_name} → ${tripInfo.end_location_name}</div>
          `
          if (tripInfo.departure_time) {
            cardContent += `<div>وقت الانطلاق: ${tripInfo.departure_time}</div>`
          }
          cardContent += `</div>`
        }
        
        // إضافة نقطة النزول/التحميل المختارة
        if (selectedStopPoint) {
          const stopLabel = tripInfo?.trip_type === 'arrival' ? 'نقطة النزول' : 'نقطة التحميل'
          cardContent += `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 11px; color: #059669; font-weight: 700;">
                  ${stopLabel}: ${selectedStopPoint.name}
                </div>
              </div>
          `
        }
        
        cardContent += `
            </div>
          </div>
        `
        
        const info = new googleMaps.InfoWindow({
          content: cardContent,
          disableAutoPan: true,
          pixelOffset: new googleMaps.Size(0, -50),
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
        .select(
          'id,user_id,visitor_name,companions_count,companions_data,travel_date,city,status,arrival_date,departure_date,route_id,trip_status,vehicle_type,assigned_driver_id,trip_id,selected_dropoff_stop_id,selected_pickup_stop_id'
        )
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

      // Load trip information if trip_id exists
      const tripId = (req as any)?.trip_id
      if (tripId) {
        try {
          const { data: tripData } = await supabase
            .from('route_trips')
            .select('trip_date,meeting_time,departure_time,start_location_name,end_location_name,trip_type')
            .eq('id', tripId)
            .maybeSingle()
          
          if (tripData) {
            setTripInfo({
              trip_date: tripData.trip_date,
              meeting_time: tripData.meeting_time,
              departure_time: tripData.departure_time,
              start_location_name: tripData.start_location_name,
              end_location_name: tripData.end_location_name,
              trip_type: tripData.trip_type as 'arrival' | 'departure' | null,
            })

            // Load selected stop point
            const selectedStopId = tripData.trip_type === 'arrival' 
              ? (req as any)?.selected_dropoff_stop_id 
              : (req as any)?.selected_pickup_stop_id
            
            if (selectedStopId) {
              // 1) Try trip stop points
              let { data: stopData } = await supabase
                .from('route_trip_stop_points')
                .select('name')
                .eq('id', selectedStopId)
                .maybeSingle()
              // 2) Fallback: route default stops
              if (!stopData) {
                const res = await supabase
                  .from('route_stop_points')
                  .select('name')
                  .eq('id', selectedStopId)
                  .maybeSingle()
                stopData = (res as any)?.data || null
              }
              if (stopData) setSelectedStopPoint({ name: (stopData as any).name })
            }
          }
        } catch (e) {
          console.error('Error loading trip info:', e)
        }
      }

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
          try {
            const tripType: 'arrival' | 'departure' | null = (tripInfo as any)?.trip_type || null
            const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : tripType === 'arrival' ? ['dropoff', 'both'] : ['pickup', 'dropoff', 'both']
            const { data: routeStopsData } = await supabase
              .from('route_stop_points')
              .select('id,route_id,name,description,lat,lng,order_index,stop_kind')
              .eq('route_id', routeData.id)
              .eq('is_active', true)
              .in('stop_kind', allowedKinds as any)
              .order('order_index', { ascending: true })
            if (routeStopsData) setRouteStops(routeStopsData as any)
          } catch {
            // Backward compatibility if stop_kind is not migrated yet
          const { data: routeStopsData } = await supabase
            .from('route_stop_points')
            .select('id,route_id,name,description,lat,lng,order_index')
            .eq('route_id', routeData.id)
            .eq('is_active', true)
            .order('order_index', { ascending: true })
            if (routeStopsData) setRouteStops(routeStopsData as any)
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

      // Driver current location: أولاً جرب driver_live_status (السائق متاح)
      const assignedDriverId = (req as any)?.assigned_driver_id
      let driverLoc: { lat: number; lng: number } | null = null

      if (assignedDriverId) {
        try {
          const { data: liveStatus } = await supabase
            .from('driver_live_status')
            .select('lat,lng,is_available')
            .eq('driver_id', assignedDriverId)
            .eq('is_available', true)
            .maybeSingle()
          
          if (liveStatus && liveStatus.lat && liveStatus.lng) {
            driverLoc = { lat: safeNumber(liveStatus.lat, 0), lng: safeNumber(liveStatus.lng, 0) }
          }
        } catch (e) {
          console.warn('Failed to load driver_live_status:', e)
        }
      }

      // Fallback: جرب trip_driver_locations (النظام القديم)
      if (!driverLoc) {
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
          driverLoc = { lat: safeNumber((loc as any).lat, 0), lng: safeNumber((loc as any).lng, 0) }
        }
      }

      setDriverLocation(driverLoc)
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
  }, [mapsReady, request, driverLocation, stops, route, routeStops, dropoffPoint, tripInfo, selectedStopPoint])

  // Realtime updates (if tables exist)
  useEffect(() => {
    if (!requestId || !request) return
    const assignedDriverId = (request as any)?.assigned_driver_id
    
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
    
    // Realtime subscription لـ driver_live_status (إذا كان السائق متاح)
    if (assignedDriverId) {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'driver_live_status', filter: `driver_id=eq.${assignedDriverId}` },
        () => loadData()
      )
    }
    
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, request])

  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success(okMsg)
    } catch (e) {
      console.error('Copy failed:', e)
      toast.error('تعذر النسخ')
    }
  }

  const shareMyLocationWhatsApp = async () => {
    try {
      if (typeof window === 'undefined') return
      setGeoError(null)
      const trackingUrl = window.location.href

      if (!(window as any).isSecureContext) {
        const msg = 'لا يمكن مشاركة الموقع إلا عبر اتصال آمن (HTTPS).'
        setGeoError(msg)
        toast.error(msg)
        return
      }
      if (!navigator?.geolocation) {
        const msg = 'الموقع غير مدعوم على هذا الجهاز'
        setGeoError(msg)
        toast.error(msg)
        return
      }
      setSharingLocation(true)

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`
      const code = requestId.slice(0, 8).toUpperCase()
      const msg =
        `موقعي الحالي (سوريا بلس (Syria Plus) خدمات)\n` +
        `كود الطلب: ${code}\n` +
        `الاسم: ${request?.visitor_name || ''}\n` +
        `${mapsLink}`

      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      console.error('Share location error:', e)
      const code = requestId.slice(0, 8).toUpperCase()
      const trackingUrl = typeof window !== 'undefined' ? window.location.href : ''

      // GeolocationPositionError codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT
      const errCode = typeof e?.code === 'number' ? e.code : undefined
      const msg =
        errCode === 1
          ? 'تم رفض صلاحية الموقع. فعّلها من إعدادات المتصفح ثم أعد المحاولة.'
          : errCode === 2
            ? 'تعذّر تحديد موقعك حالياً. جرّب تشغيل GPS/الإنترنت ثم أعد المحاولة.'
            : errCode === 3
              ? 'انتهت مهلة تحديد الموقع. جرّب مرة أخرى.'
              : 'تعذر الحصول على الموقع. يرجى السماح بالموقع من المتصفح.'

      setGeoError(msg)
      toast.error(msg)

      // Fallback: open WhatsApp with tracking link (so user can still share something useful)
      if (trackingUrl) {
        const fallbackText =
          `تعذّر إرسال موقعي الحالي.\n` +
          `كود الطلب: ${code}\n` +
          `الاسم: ${request?.visitor_name || ''}\n` +
          `رابط التتبع: ${trackingUrl}`
        window.open(`https://wa.me/?text=${encodeURIComponent(fallbackText)}`, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setSharingLocation(false)
    }
  }

  const createRelativesShareLink = async () => {
    try {
      if (userId === 'driver') return
      setCreatingShareLink(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول لإنشاء رابط مشاركة')
        return
      }
      const { data, error } = await supabase.rpc('create_tracking_share_link', { p_request_id: requestId, p_hours: 48 })
      if (error) throw error
      const token = String(data || '')
      if (!token) throw new Error('تعذر إنشاء الرابط')
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const url = `${origin}/share/${token}`
      await copyText(url, 'تم إنشاء ونسخ رابط مشاركة للأقارب')
    } catch (e: any) {
      console.error('createRelativesShareLink error:', e)
      toast.error(e?.message || 'تعذر إنشاء رابط المشاركة')
    } finally {
      setCreatingShareLink(false)
    }
  }

  return (
    <div className="page">
      <div className="page-container">
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-200">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                {tripInfo?.trip_type === 'departure' ? 'تتبّع المغادرون على الخريطة' : 'تتبّع القادمون على الخريطة'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {tripInfo 
                  ? driverLocation
                    ? `✅ يتم تتبع رحلتك الآن - موقع ${tripInfo.trip_type === 'departure' ? 'الباص' : 'السائق'} محدث لحظياً`
                    : `⏳ في انتظار بدء التتبع - سيتم تفعيله تلقائياً عند انطلاق الرحلة (${tripInfo.trip_type === 'departure' ? 'الباص' : 'السائق'} ومحطات ${tripInfo.trip_type === 'departure' ? 'التحميل' : 'النزول'})`
                  : driverLocation
                    ? '✅ يتم تتبع رحلتك الآن - موقع السائق محدث لحظياً'
                    : '⏳ في انتظار بدء التتبع - سيتم تفعيله تلقائياً عند انطلاق الرحلة'}
              </p>
            </div>
            <Link
              href={`/dashboard/request/${requestId}`}
              className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
            >
              العودة للتفاصيل
            </Link>
          </div>

          {/* بطاقة سريعة */}
          <TrackingInfoCard
            visitorName={request?.visitor_name || null}
            shortCode={shortCode}
            city={request?.city || null}
            peopleCount={peopleCount}
            tripInfo={tripInfo}
            selectedStopPoint={selectedStopPoint}
            companionNames={companionNames}
            onCopyCode={() => copyText(shortCode, 'تم نسخ كود الطلب')}
            onCopyLink={() => copyText(window.location.href, 'تم نسخ رابط التتبع')}
          />

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* على الموبايل: البطاقات تظهر أولاً، ثم الخريطة */}
            <div className="space-y-3 order-1 lg:order-2">
              <SharingSection
                sharingLocation={sharingLocation}
                geoError={geoError}
                onShareLocation={shareMyLocationWhatsApp}
                onCopyLink={() => copyText(window.location.href, 'تم نسخ رابط التتبع')}
                onCreateShareLink={userId === 'driver' ? undefined : createRelativesShareLink}
                creatingShareLink={creatingShareLink}
              />

              <TrackingStatusCard
                driverLocation={driverLocation}
                eta={eta}
                stopsCount={stops.length}
                loading={loading}
              />
            </div>

            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <div ref={mapRef} className="w-full h-[360px] sm:h-[420px] md:h-[520px]" />
              </div>
              {!mapsReady && (
                <div className="mt-3 text-xs sm:text-sm text-gray-600">
                  جاري تحميل الخريطة...
                </div>
              )}
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


