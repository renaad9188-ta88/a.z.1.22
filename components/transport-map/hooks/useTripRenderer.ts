import { useRef } from 'react'
import type { LatLng, PublicTripMapRow, UserHint } from '../types'
import { BORDER_CENTER, normalizeStops, ensureDemoStops } from '../../map/mapHelpers'

interface UseTripRendererProps {
  mapRef: React.RefObject<google.maps.Map | null>
  markersRef: React.MutableRefObject<google.maps.Marker[]>
  polylineRef: React.MutableRefObject<google.maps.Polyline | null>
  directionsRendererRef: React.MutableRefObject<google.maps.DirectionsRenderer | null>
  directionsServiceRef: React.MutableRefObject<google.maps.DirectionsService | null>
  tripRow: PublicTripMapRow | null
  mode: 'arrivals' | 'departures'
  isLoggedIn: boolean
  hasUserTrip: boolean
  driverLocation: LatLng | null
  userHint: UserHint | null
  clearMap: () => void
  clearDirections: () => void
  onBusMarkerClick?: () => void
}

export function useTripRenderer({
  mapRef,
  markersRef,
  polylineRef,
  directionsRendererRef,
  directionsServiceRef,
  tripRow,
  mode,
  isLoggedIn,
  hasUserTrip,
  driverLocation,
  userHint,
  clearMap,
  clearDirections,
  onBusMarkerClick,
}: UseTripRendererProps) {
  const iconStop = (googleMaps: typeof google.maps) =>
    ({
      path: googleMaps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    }) as any

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

    // Bus marker
    let busPosition: LatLng
    if (isLoggedIn && hasUserTrip && driverLocation) {
      busPosition = driverLocation
    } else if (start) {
      busPosition = start
    } else {
      busPosition = BORDER_CENTER
    }

    const busMarker = new googleMaps.Marker({
      position: busPosition,
      map,
      title: (isLoggedIn && hasUserTrip && driverLocation) ? 'موقع الباص (مباشر)' : 'الباص',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
        scaledSize: new googleMaps.Size(40, 40),
        anchor: new googleMaps.Point(20, 40),
      },
      zIndex: 50,
    })
    markersRef.current.push(busMarker)
    
    // Add click listener to bus marker
    if (isLoggedIn && hasUserTrip && onBusMarkerClick) {
      busMarker.addListener('click', onBusMarkerClick)
    }

    // If driver location exists, extend bounds
    if (driverLocation && isLoggedIn && hasUserTrip) {
      bounds.extend(driverLocation)
    }

    // User hint info window (simplified - full implementation in original file)
    if (isLoggedIn && hasUserTrip && userHint?.trip_id && userHint?.trip_date) {
      const today = new Date().toISOString().split('T')[0]
      const tripDateStr = new Date(userHint.trip_date + 'T00:00:00').toISOString().split('T')[0]
      const isTripToday = tripDateStr === today
      
      const tripDate = new Date(userHint.trip_date + 'T00:00:00')
      const daysUntilTrip = Math.floor((tripDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      const isTripSoon = daysUntilTrip >= 0 && daysUntilTrip <= 7
      
      if (isTripToday || isTripSoon || driverLocation) {
        const isMobile = window.innerWidth < 640
        let progressInfo = ''
        if (driverLocation && start && end) {
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
        
        const peopleCount = 1 + (userHint.companions_count || 0)
        const routeInfo = userHint.start_location_name && userHint.end_location_name
          ? `${userHint.start_location_name} → ${userHint.end_location_name}`
          : 'المسار غير محدد'
        
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
        
        infoWindowContent.addEventListener('click', () => {
          if (userHint?.request_id) {
            window.location.href = `/dashboard/request/${userHint.request_id}/follow`
          }
        })
        
        const infoWindow = new googleMaps.InfoWindow({
          content: infoWindowContent,
          disableAutoPan: true,
          pixelOffset: new googleMaps.Size(0, -50),
        })
        
        ;(busMarker as any).infoWindow = infoWindow
      }
    }

    // Stop markers
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

    // Draw route
    const path: LatLng[] = [
      start,
      ...stops.map((s: { lat: number; lng: number }) => ({ lat: Number(s.lat), lng: Number(s.lng) })),
      end,
    ]
    map.fitBounds(bounds, 60)

    const waypoints: google.maps.DirectionsWaypoint[] = path
      .slice(1, Math.max(1, path.length - 1))
      .slice(0, 23)
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

  const resetMapToTrip = () => {
    if (!mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapRef.current

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
      map.setCenter(BORDER_CENTER)
      map.setZoom(10)
      return
    }

    const bounds = new googleMaps.LatLngBounds()
    bounds.extend(start)
    bounds.extend(end)

    if (driverLocation && isLoggedIn && hasUserTrip) {
      bounds.extend(driverLocation)
    }

    const baseStops = normalizeStops(tripRow?.stops)
    baseStops.forEach((stop: any) => {
      if (stop.lat && stop.lng) {
        bounds.extend({ lat: Number(stop.lat), lng: Number(stop.lng) })
      }
    })

    try {
      map.fitBounds(bounds, 60)
    } catch (e) {
      console.error('Error fitting bounds:', e)
      map.setCenter(start)
      map.setZoom(10)
    }
  }

  return {
    renderTrip,
    resetMapToTrip,
  }
}

