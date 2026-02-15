'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { Bus, Calendar, Clock, MapPin, Plane, Route, ChevronLeft, Users, Navigation, ChevronDown, ChevronUp, X, Map, Satellite, LocateFixed } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import MapControls from './map/MapControls'
import TripMetaCard from './map/TripMetaCard'
import UserHintCard from './map/UserHintCard'
import StopsListModal from './map/StopsListModal'
import DriverInfoModal from './map/DriverInfoModal'
import PassengerListModal from './map/PassengerListModal'
import TripModeSelector from './map/TripModeSelector'
import MapHeader from './map/MapHeader'
import MapMinimizeButtons from './map/MapMinimizeButtons'
import { BORDER_CENTER, normalizeStops, ensureDemoStops } from './map/mapHelpers'
import { useMapInitialization } from './transport-map/hooks/useMapInitialization'
import { useTripData } from './transport-map/hooks/useTripData'
import { useUserHint } from './transport-map/hooks/useUserHint'
import { useDriverLocation } from './transport-map/hooks/useDriverLocation'
import { useMapUI } from './transport-map/hooks/useMapUI'
import type { LatLng, PassengerInfo, PublicTripMapRow, UserHint } from './transport-map/types'

export default function HomeTransportMap() {
  const supabase = createSupabaseBrowserClient()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const inViewRef = useRef<HTMLDivElement | null>(null)
  const directionsServiceForEtaRef = useRef<google.maps.DirectionsService | null>(null)
  const [passengers, setPassengers] = useState<PassengerInfo[]>([])
  const [loadingPassengers, setLoadingPassengers] = useState(false)
  const [tripType, setTripType] = useState<'arrival' | 'departure' | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Map Initialization Hook
  const {
    mapRef,
    markersRef,
    polylineRef,
    directionsRendererRef,
    directionsServiceRef,
    ready,
    errorText,
    shouldLoad,
    clearMap,
    clearMarkers,
    clearPolyline,
    clearDirections,
    initMap,
  } = useMapInitialization(apiKey, inViewRef, mapElRef)

  // Trip Data Hook
  const {
    tripRow,
    setTripRow,
    loadingTrip,
    fetchTripMap,
    getStopsList,
  } = useTripData()

  // User Hint Hook
  const {
    userHint,
    setUserHint,
    loadingUserHint,
    loadUserHint,
  } = useUserHint()

  // Map UI Hook
  const {
    mode,
    setMode,
    mapType,
    setMapType,
    showPassengerList,
    setShowPassengerList,
    isPassengerListMinimized,
    setIsPassengerListMinimized,
    isDriverInfoMinimized,
    setIsDriverInfoMinimized,
    isTripMetaHidden,
    setIsTripMetaHidden,
    showStopsList,
    setShowStopsList,
    isStopsListMinimized,
    setIsStopsListMinimized,
    showDriverInfo,
    setShowDriverInfo,
    isLoggedIn,
    hasUserTrip,
    toggleMapType,
  } = useMapUI(userHint, mapRef)

  // Driver Location Hook
  const {
    driverLocation,
    driverLocationLoading,
    driverInfo,
    setDriverInfo,
    loadDriverLocation,
  } = useDriverLocation(isLoggedIn, hasUserTrip)

  const iconStop = (googleMaps: typeof google.maps) =>
    ({
      path: googleMaps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    }) as any


  // Determine if trip is arrival or departure
  const isArrivalTrip = mode === 'arrivals' || (tripRow?.trip_type === 'arrivals' || tripRow?.trip_type === 'arrival')



  const renderTrip = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapRef.current

    clearMap()

    const rawStart: LatLng | null =
      tripRow?.start_lat != null && tripRow?.start_lng != null
        ? { lat: Number(tripRow.start_lat), lng: Number(tripRow.start_lng) }
        : null

    const rawEnd: LatLng | null =
      tripRow?.end_lat != null && tripRow?.end_lng != null
        ? { lat: Number(tripRow.end_lat), lng: Number(tripRow.end_lng) }
        : null

    const baseStops = normalizeStops(tripRow?.stops)
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .slice(0, 7)

    // Sometimes "departures" data may come with start/end still oriented like arrivals.
    // If user selected departures and start is شمال (lat أكبر) من end, swap for display.
    const wantsDepartures =
      mode === 'departures' ||
      ['departures', 'departure'].includes(String((tripRow as any)?.trip_type || '').toLowerCase())
    const shouldSwapForDepartures =
      wantsDepartures && rawStart && rawEnd && Number.isFinite(rawStart.lat) && Number.isFinite(rawEnd.lat) && rawStart.lat > rawEnd.lat

    const startTitle = shouldSwapForDepartures ? tripRow?.end_location_name : tripRow?.start_location_name
    const endTitle = shouldSwapForDepartures ? tripRow?.start_location_name : tripRow?.end_location_name

    const start: LatLng | null = shouldSwapForDepartures ? rawEnd : rawStart
    const end: LatLng | null = shouldSwapForDepartures ? rawStart : rawEnd

    const displayBaseStops = shouldSwapForDepartures ? baseStops.slice().reverse() : baseStops
    const stops =
      tripRow?.is_demo && start && end
        ? ensureDemoStops(displayBaseStops as any, start, end)
        : (displayBaseStops as any)

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
        title: startTitle || 'نقطة البداية',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      })
    )

    // Bus marker - يجب أن يكون في نقطة البداية حسب نوع الرحلة
    // للقدوم (arrivals): الباص في start (الشام)
    // للمغادرة (departures): الباص في start (عمان)  
    // لكن للمستخدم المسجل الذي لديه رحلة يظهر في موقع السائق المباشر
    let busPosition: LatLng

    if (isLoggedIn && hasUserTrip && driverLocation) {
      // إذا كان هناك موقع سائق مباشر، استخدمه
      busPosition = driverLocation
    } else if (start) {
      // الباص يبدأ من نقطة البداية (start) دائماً
      // لأن fetchTripMap يجلب الرحلة الصحيحة حسب النوع (arrivals/departures)
      // لذا start سيكون صحيحاً حسب النوع:
      // - للقدوم: start = الشام (سوريا)
      // - للمغادرة: start = عمان (الأردن)
      busPosition = start
    } else {
      // Fallback
      busPosition = BORDER_CENTER
    }

    const busMarker = new googleMaps.Marker({
      position: busPosition,
      map,
      title: (isLoggedIn && hasUserTrip && driverLocation) ? 'موقع الباص (مباشر)' : 'الباص',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
        scaledSize: new googleMaps.Size(40, 40),
        anchor: new googleMaps.Point(20, 40), // anchor point في أسفل منتصف الصورة (x: نصف العرض, y: كامل الارتفاع)
      },
      zIndex: 50,
    })
    markersRef.current.push(busMarker)
    
    // Add click listener to bus marker to show driver info - فقط للمستخدم المسجل الذي لديه رحلة
    if (isLoggedIn && hasUserTrip) {
      busMarker.addListener('click', async () => {
      setShowDriverInfo(true)
      
      // Load driver info if not already loaded
      if (!driverInfo) {
        try {
          let assignedDriverId: string | null = null
          let routeId: string | null = null

          // Try to get driver from visit_requests (assigned_driver_id)
          if (userHint?.request_id) {
            const { data: requestData } = await supabase
              .from('visit_requests')
              .select('assigned_driver_id, route_id')
              .eq('id', userHint.request_id)
              .maybeSingle()
            
            assignedDriverId = (requestData as any)?.assigned_driver_id || null
            routeId = (requestData as any)?.route_id || null
          }

          // If no assigned driver from visit_requests, try route_trip_drivers
          if (!assignedDriverId && userHint?.trip_id) {
            const { data: tripDriverData } = await supabase
              .from('route_trip_drivers')
              .select('driver_id')
              .eq('trip_id', userHint.trip_id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle()
            
            if (tripDriverData) {
              assignedDriverId = (tripDriverData as any)?.driver_id || null
            }

            // Get route_id from trip
            if (!routeId) {
              const { data: tripData } = await supabase
                .from('route_trips')
                .select('route_id')
                .eq('id', userHint.trip_id)
                .maybeSingle()
              
              routeId = (tripData as any)?.route_id || null
            }
          }

          // Load driver info
          if (assignedDriverId) {
            const { data: driverData } = await supabase
              .from('drivers')
              .select('id, name, phone')
              .eq('id', assignedDriverId)
              .maybeSingle()

            // Load route info for company phone (if exists)
            let companyPhone: string | null = null
            if (routeId) {
              const { data: routeData } = await supabase
                .from('routes')
                .select('company_phone, contact_phone')
                .eq('id', routeId)
                .maybeSingle()
              
              companyPhone = (routeData as any)?.company_phone || (routeData as any)?.contact_phone || null
            }

            if (driverData) {
              setDriverInfo({
                name: driverData.name || 'السائق',
                phone: driverData.phone || '',
                company_phone: companyPhone,
              })
            } else {
              setDriverInfo({
                name: 'غير محدد',
                phone: 'غير متاح',
                company_phone: null,
              })
            }
          } else {
            setDriverInfo({
              name: 'غير محدد',
              phone: 'غير متاح',
              company_phone: null,
            })
          }
        } catch (e) {
          console.error('Error loading driver info:', e)
          setDriverInfo({
            name: 'خطأ في التحميل',
            phone: 'غير متاح',
            company_phone: null,
          })
        }
      }
      })
    }
    
    // If driver location exists, extend bounds to include it - فقط للمستخدم المسجل
    if (driverLocation && isLoggedIn && hasUserTrip) {
      bounds.extend(driverLocation)
    }

    // Show user card above bus marker - فقط للمستخدم المسجل الذي لديه رحلة
    if (isLoggedIn && hasUserTrip && userHint?.trip_id && userHint?.trip_date) {
      const today = new Date().toISOString().split('T')[0]
      const tripDateStr = new Date(userHint.trip_date + 'T00:00:00').toISOString().split('T')[0]
      const isTripToday = tripDateStr === today
      
      // حساب تاريخ الرحلة (اليوم أو في المستقبل القريب - حتى 7 أيام)
      const tripDate = new Date(userHint.trip_date + 'T00:00:00')
      const daysUntilTrip = Math.floor((tripDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      const isTripSoon = daysUntilTrip >= 0 && daysUntilTrip <= 7
      
      // Show card if trip is today, soon, OR if driver is moving (has live location)
      if (isTripToday || isTripSoon || driverLocation) {
        const peopleCount = 1 + (userHint.companions_count || 0)
        const routeInfo = userHint.start_location_name && userHint.end_location_name
          ? `${userHint.start_location_name} → ${userHint.end_location_name}`
          : 'المسار غير محدد'
        
        // Detect screen size for responsive InfoWindow
        const isMobile = window.innerWidth < 640
        
        // Calculate progress if driver location is available
        let progressInfo = ''
        if (driverLocation && start && end) {
          // Simple progress calculation: distance from start to current / total distance
          const distanceToStart = googleMaps.geometry.spherical.computeDistanceBetween(
            new googleMaps.LatLng(start.lat, start.lng),
            new googleMaps.LatLng(driverLocation.lat, driverLocation.lng)
          )
          const totalDistance = googleMaps.geometry.spherical.computeDistanceBetween(
            new googleMaps.LatLng(start.lat, start.lng),
            new googleMaps.LatLng(end.lat, end.lng)
          )
          const progressPercent = totalDistance > 0 ? Math.min(100, Math.round((distanceToStart / totalDistance) * 100)) : 0
          progressInfo = `<div style="color: #059669; font-size: ${isMobile ? '10px' : '11px'}; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-weight: 600;">
            <div style="background: #d1fae5; border-radius: 4px; height: 6px; margin-bottom: 4px; overflow: hidden;">
              <div style="background: #10b981; height: 100%; width: ${progressPercent}%; transition: width 0.3s;"></div>
            </div>
            <div style="text-align: center; margin-top: 2px;">التقدم: ${progressPercent}%</div>
          </div>`
        }
        const maxWidth = isMobile ? 'calc(100vw - 2rem)' : '280px'
        const fontSize = isMobile ? '14px' : '15px'
        const smallFontSize = isMobile ? '11px' : '12px'
        const padding = isMobile ? '10px 12px' : '12px 14px'
        
        const infoWindowContent = document.createElement('div')
        infoWindowContent.style.cssText = `padding: ${padding}; font-family: Arial, sans-serif; max-width: ${maxWidth}; width: ${maxWidth}; line-height: 1.5; cursor: pointer; box-sizing: border-box; word-wrap: break-word;`
        infoWindowContent.innerHTML = `
          <div style="font-weight: 700; color: #111827; font-size: ${fontSize}; margin-bottom: 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; word-wrap: break-word;">
            ${userHint.visitor_name || 'الراكب'}
            ${driverLocation ? '<span style="color: #10b981; font-size: 10px; margin-right: 4px;">●</span>' : ''}
          </div>
          <div style="color: #4b5563; font-size: ${smallFontSize}; margin-bottom: 4px; word-wrap: break-word;">
            <strong>عدد الأشخاص:</strong> ${peopleCount}
          </div>
          ${userHint.city ? `<div style="color: #4b5563; font-size: ${smallFontSize}; margin-bottom: 4px; word-wrap: break-word;"><strong>المدينة:</strong> ${userHint.city}</div>` : ''}
          <div style="color: #4b5563; font-size: ${smallFontSize}; margin-bottom: 4px; word-wrap: break-word;">
            <strong>المسار:</strong> ${routeInfo}
          </div>
          ${userHint.meeting_time ? `<div style="color: #4b5563; font-size: ${smallFontSize}; margin-bottom: 4px; word-wrap: break-word;"><strong>وقت التجمع:</strong> ${userHint.meeting_time}</div>` : ''}
          ${userHint.departure_time ? `<div style="color: #4b5563; font-size: ${smallFontSize}; margin-bottom: 4px; word-wrap: break-word;"><strong>وقت الانطلاق:</strong> ${userHint.departure_time}</div>` : ''}
          ${driverLocation 
            ? '<div style="color: #059669; font-size: ' + (isMobile ? '10px' : '11px') + '; margin-top: 6px; font-weight: 600;">📍 يتم تتبع الرحلة الآن</div>' 
            : isTripToday 
              ? '<div style="color: #f59e0b; font-size: ' + (isMobile ? '10px' : '11px') + '; margin-top: 6px; font-weight: 600;">⏳ في انتظار بدء التتبع (سيبدأ عند انطلاق الرحلة)</div>'
              : isTripSoon
                ? '<div style="color: #6366f1; font-size: ' + (isMobile ? '10px' : '11px') + '; margin-top: 6px; font-weight: 600;">📅 رحلتك قادمة - سيتم تفعيل التتبع تلقائياً</div>'
                : ''}
          ${progressInfo}
          <div style="color: #2563eb; font-size: ${isMobile ? '10px' : '11px'}; margin-top: 8px; font-weight: 600; text-align: center; padding-top: 6px; border-top: 1px solid #e5e7eb;">
            اضغط لعرض التفاصيل الكاملة
          </div>
        `
        
        // Add click listener to navigate to request follow page
        infoWindowContent.addEventListener('click', () => {
          window.location.href = `/dashboard/request/${userHint.request_id}/follow`
        })
        
        const infoWindow = new googleMaps.InfoWindow({
          content: infoWindowContent,
          disableAutoPan: true,
          pixelOffset: new googleMaps.Size(0, -50),
        })
        
        // Store reference to prevent garbage collection
        ;(busMarker as any).infoWindow = infoWindow
      }
    }

    // Stop markers (blue numbered circles) — handle both 0-based and 1-based order_index
    const minOrderIndex = (() => {
      const nums = stops.map((s: any) => Number(s?.order_index)).filter((n: any) => Number.isFinite(n))
      return nums.length ? Math.min(...nums) : 0
    })()
    stops.forEach((s: { name: string; lat: number; lng: number; order_index: number }, idx: number) => {
      const pos = { lat: Number(s.lat), lng: Number(s.lng) }
      if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return
      bounds.extend(pos)
      const oi = Number(s.order_index)
      const n = Number.isFinite(oi) ? (minOrderIndex === 0 ? oi + 1 : oi) : idx + 1
      markersRef.current.push(
        new googleMaps.Marker({
          position: pos,
          map,
          title: s.name || `نقطة توقف ${idx + 1}`,
          icon: iconStop(googleMaps),
          label: { text: String(n), color: '#ffffff', fontWeight: '900' },
        })
      )
    })

    // End marker (red)
    markersRef.current.push(
      new googleMaps.Marker({
        position: end,
        map,
        title: endTitle || 'نقطة النهاية',
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

  // Reset map view to trip bounds
  const resetMapToTrip = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapRef.current

    // إذا لم تكن هناك رحلة، ارجع إلى المركز الافتراضي
    if (!tripRow) {
      map.setCenter(BORDER_CENTER)
      map.setZoom(10)
      return
    }

    const rawStart: LatLng | null =
      tripRow?.start_lat != null && tripRow?.start_lng != null
        ? { lat: Number(tripRow.start_lat), lng: Number(tripRow.start_lng) }
        : null

    const rawEnd: LatLng | null =
      tripRow?.end_lat != null && tripRow?.end_lng != null
        ? { lat: Number(tripRow.end_lat), lng: Number(tripRow.end_lng) }
        : null

    const wantsDepartures =
      mode === 'departures' ||
      ['departures', 'departure'].includes(String((tripRow as any)?.trip_type || '').toLowerCase())
    const shouldSwapForDepartures =
      wantsDepartures && rawStart && rawEnd && Number.isFinite(rawStart.lat) && Number.isFinite(rawEnd.lat) && rawStart.lat > rawEnd.lat

    const start: LatLng | null = shouldSwapForDepartures ? rawEnd : rawStart
    const end: LatLng | null = shouldSwapForDepartures ? rawStart : rawEnd

    if (!start || !end) {
      // إذا لم تكن هناك نقاط بداية ونهاية، ارجع إلى المركز الافتراضي
      map.setCenter(BORDER_CENTER)
      map.setZoom(10)
      return
    }

    const bounds = new googleMaps.LatLngBounds()
    bounds.extend(start)
    bounds.extend(end)

    // Include driver location if available - فقط للمستخدم المسجل
    if (driverLocation && isLoggedIn && hasUserTrip) {
      bounds.extend(driverLocation)
    }

    // Include stop points
    const baseStops = normalizeStops(tripRow?.stops)
    baseStops.forEach((stop: any) => {
      if (stop.lat && stop.lng) {
        bounds.extend({ lat: Number(stop.lat), lng: Number(stop.lng) })
      }
    })

    // تأكد من أن bounds صالحة قبل استخدام fitBounds
    try {
      map.fitBounds(bounds, 60)
    } catch (e) {
      console.error('Error fitting bounds:', e)
      // Fallback to center and zoom
      map.setCenter(start)
      map.setZoom(10)
    }
  }



  const loadPassengersForTrip = async (tripId: string) => {
    try {
      setLoadingPassengers(true)
      
      // Load trip type
      const { data: tripData } = await supabase
        .from('route_trips')
        .select('trip_type')
        .eq('id', tripId)
        .maybeSingle()
      
      const type = (tripData?.trip_type === 'departure' || tripData?.trip_type === 'departures') 
        ? 'departure' 
        : 'arrival'
      setTripType(type)

      // Load passengers
      const { data: passengersData, error } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          selected_dropoff_stop_id,
          selected_pickup_stop_id
        `)
        .eq('trip_id', tripId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Load stop point names
      const stopIds = (passengersData || [])
        .map((p: any) => type === 'arrival' ? p.selected_dropoff_stop_id : p.selected_pickup_stop_id)
        .filter(Boolean) as string[]

      let stopsMap: Record<string, { name: string; lat: number; lng: number }> = {}
      if (stopIds.length > 0) {
        const { data: stopsData } = await supabase
          .from('route_trip_stop_points')
          .select('id, name, lat, lng')
          .in('id', stopIds)
        
        ;(stopsData || []).forEach((s: any) => {
          stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
        })

        const missing = stopIds.filter((id) => !stopsMap[id])
        if (missing.length > 0) {
          const { data: routeStopsData } = await supabase
            .from('route_stop_points')
            .select('id, name, lat, lng')
            .in('id', missing)
          ;(routeStopsData || []).forEach((s: any) => {
            stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
          })
        }
      }

      // Map passengers with stop names
      const passengersList: PassengerInfo[] = (passengersData || []).map((p: any) => {
        const stopId = type === 'arrival' ? p.selected_dropoff_stop_id : p.selected_pickup_stop_id
        const stopInfo = stopId ? stopsMap[stopId] : null
        
        return {
          id: p.id,
          visitor_name: p.visitor_name,
          selected_dropoff_stop_id: p.selected_dropoff_stop_id,
          selected_pickup_stop_id: p.selected_pickup_stop_id,
          dropoff_stop_name: type === 'arrival' ? stopInfo?.name || null : null,
          pickup_stop_name: type === 'departure' ? stopInfo?.name || null : null,
          eta: null,
        }
      })

      setPassengers(passengersList)

      // Calculate ETAs if driver location is available
      if (driverLocation && (window as any).google?.maps) {
        await calculatePassengerETAs(passengersList, stopsMap, type)
      }
    } catch (e) {
      console.error('Error loading passengers:', e)
      setPassengers([])
    } finally {
      setLoadingPassengers(false)
    }
  }

  const calculatePassengerETAs = async (
    passengersList: PassengerInfo[],
    stopsMap: Record<string, { name: string; lat: number; lng: number }>,
    type: 'arrival' | 'departure'
  ) => {
    if (!driverLocation || !(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps
    if (!directionsServiceForEtaRef.current) {
      directionsServiceForEtaRef.current = new googleMaps.DirectionsService()
    }

    const updatedPassengers = await Promise.all(
      passengersList.map(async (passenger) => {
        const stopId = type === 'arrival' 
          ? passenger.selected_dropoff_stop_id 
          : passenger.selected_pickup_stop_id
        
        if (!stopId || !stopsMap[stopId]) {
          return { ...passenger, eta: null }
        }

        const stopLocation = stopsMap[stopId]
        const destination = { lat: stopLocation.lat, lng: stopLocation.lng }

        try {
          const result = await directionsServiceForEtaRef.current!.route({
            origin: driverLocation,
            destination,
            travelMode: googleMaps.TravelMode.DRIVING,
          })

          const legs = result.routes?.[0]?.legs || []
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

          return {
            ...passenger,
            eta: { durationText, distanceText },
          }
        } catch (e) {
          console.warn('ETA calculation failed for passenger:', passenger.id, e)
          return { ...passenger, eta: null }
        }
      })
    )

    setPassengers(updatedPassengers)
  }

  const handleCardClick = async () => {
    // إذا كانت القائمة مفتوحة، أغلقها
    if (showPassengerList) {
      setShowPassengerList(false)
      return
    }

    if (userHint?.trip_id) {
      await loadPassengersForTrip(userHint.trip_id)
      setShowPassengerList(true)
    } else {
      // إذا لم يكن هناك trip_id، نعرض رسالة
      setShowPassengerList(true)
      setPassengers([])
      setTripType(null)
    }
  }


  useEffect(() => {
    if (!ready) return
    initMap()
    fetchTripMap(mode, userHint)
    loadUserHint(loadDriverLocation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    if (!ready) return
    fetchTripMap(mode, userHint)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready, userHint?.trip_id])

  useEffect(() => {
    if (!ready) return
    renderTrip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(tripRow), userHint, driverLocation, isLoggedIn, hasUserTrip, mode])

  // Update ETAs when driver location changes and passenger list is open - فقط للمستخدم المسجل
  useEffect(() => {
    if (!isLoggedIn || !hasUserTrip) return
    if (showPassengerList && driverLocation && passengers.length > 0 && tripType) {
      const stopIds = passengers
        .map((p) => tripType === 'arrival' ? p.selected_dropoff_stop_id : p.selected_pickup_stop_id)
        .filter(Boolean) as string[]

      if (stopIds.length > 0) {
        ;(async () => {
          try {
            const stopsMap: Record<string, { name: string; lat: number; lng: number }> = {}
            const { data: tripStops } = await supabase
          .from('route_trip_stop_points')
          .select('id, name, lat, lng')
          .in('id', stopIds)
            ;(tripStops || []).forEach((s: any) => {
                stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
              })

            const missing = stopIds.filter((id) => !stopsMap[id])
            if (missing.length > 0) {
              const { data: routeStops } = await supabase
                .from('route_stop_points')
                .select('id, name, lat, lng')
                .in('id', missing)
              ;(routeStops || []).forEach((s: any) => {
                stopsMap[s.id] = { name: s.name, lat: s.lat, lng: s.lng }
              })
            }

              calculatePassengerETAs(passengers, stopsMap, tripType)
          } catch (e) {
            console.error('ETA stops load error:', e)
            }
        })()
      }
    }
  }, [driverLocation, showPassengerList, isLoggedIn, hasUserTrip])

  // Handle hash navigation and load user trip when navigating to map
  useEffect(() => {
    if (typeof window === 'undefined' || !ready) return
    
    const handleHashChange = async () => {
      if (window.location.hash === '#map') {
        // Force load user hint to show their trip
        await loadUserHint()
        
        // Wait a bit for userHint to update, then check trip type and update mode
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: requestData } = await supabase
              .from('visit_requests')
              .select('trip_id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (requestData?.trip_id) {
              const { data: tripData } = await supabase
                .from('route_trips')
                .select('trip_type')
                .eq('id', requestData.trip_id)
                .maybeSingle()
              
              if (tripData?.trip_type === 'departure' && mode !== 'departures') {
                setMode('departures')
              } else if (tripData?.trip_type === 'arrival' && mode !== 'arrivals') {
                setMode('arrivals')
              }
            }
          }
        }, 500)
        
        // Scroll to map
        setTimeout(() => {
          const mapElement = document.getElementById('map')
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 800)
      }
    }
    
    // Check on mount
    handleHashChange()
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

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

  const stopsCountText = useMemo(() => {
    // In demo mode we generate 4 stops even if DB has fewer.
    if (tripRow?.is_demo) return 4
    return normalizeStops(tripRow?.stops).length
  }, [tripRow?.is_demo, tripRow?.stops])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <MapHeader />
          <TripModeSelector mode={mode} onModeChange={setMode} />
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
                <MapMinimizeButtons
                  showPassengerList={showPassengerList}
                  showDriverInfo={showDriverInfo}
                  isPassengerListMinimized={isPassengerListMinimized}
                  isDriverInfoMinimized={isDriverInfoMinimized}
                  onTogglePassengerList={() => setIsPassengerListMinimized(!isPassengerListMinimized)}
                  onToggleDriverInfo={() => setIsDriverInfoMinimized(!isDriverInfoMinimized)}
                />

                {/* Map Controls */}
                <MapControls
                  isTripMetaHidden={isTripMetaHidden}
                  mapType={mapType}
                  onShowTripMeta={() => setIsTripMetaHidden(false)}
                  onResetMap={resetMapToTrip}
                  onToggleMapType={toggleMapType}
                />

                {/* Trip meta (top-right) */}
                {!isTripMetaHidden && (
                  <TripMetaCard
                    tripLabel={tripLabel}
                    loadingTrip={loadingTrip}
                    dateText={dateText}
                    timeText={timeText}
                    stopsCountText={stopsCountText}
                    isArrivalTrip={isArrivalTrip}
                    onHide={() => setIsTripMetaHidden(true)}
                    onShowStopsList={() => setShowStopsList(!showStopsList)}
                  />
                )}

                {/* Stops List Modal */}
                {showStopsList && (
                  <StopsListModal
                    stops={getStopsList()}
                    isArrivalTrip={isArrivalTrip}
                    isMinimized={isStopsListMinimized}
                    onToggleMinimize={() => setIsStopsListMinimized(!isStopsListMinimized)}
                    onClose={() => setShowStopsList(false)}
                  />
                )}

                {/* Overlay: user hint - فقط للمستخدم المسجل الذي لديه رحلة */}
                {isLoggedIn && hasUserTrip && userHint && (
                  <>
                    <UserHintCard
                      userHint={userHint}
                      onClick={handleCardClick}
                    />

                    {/* Driver Info Modal */}
                    {showDriverInfo && (
                      <DriverInfoModal
                        driverInfo={driverInfo}
                        loading={driverLocationLoading}
                        onClose={() => setShowDriverInfo(false)}
                      />
                    )}

                    {/* Passenger List Modal */}
                    {showPassengerList && (
                      <PassengerListModal
                        passengers={passengers}
                        tripType={tripType}
                        userHintTripId={userHint.trip_id}
                        driverLocation={driverLocation}
                        loading={loadingPassengers}
                        onClose={() => setShowPassengerList(false)}
                      />
                    )}
                  </>
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


