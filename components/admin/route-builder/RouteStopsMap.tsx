'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

type LatLng = { lat: number; lng: number }

export type BuilderStop = { id: string; name: string; lat: number; lng: number; order_index: number }

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

export default function RouteStopsMap({
  title,
  apiKey,
  routeStart,
  routeEnd,
  stops,
  polylineColor = '#3B82F6',
  addMode,
  onAddStop,
}: {
  title: string
  apiKey: string
  routeStart: { name: string; lat: number; lng: number } | null
  routeEnd: { name: string; lat: number; lng: number } | null
  stops: BuilderStop[]
  polylineColor?: string
  addMode: boolean
  onAddStop: (p: { name: string; lat: number; lng: number }) => void
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setReady(true)
      } catch (e) {
        console.error('RouteStopsMap maps load error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    if (!ready || !mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapRef.current) {
      const center: LatLng = routeStart ? { lat: routeStart.lat, lng: routeStart.lng } : { lat: 32.5456, lng: 35.825 }
      mapRef.current = new googleMaps.Map(mapElRef.current, {
        center,
        zoom: 9,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
      })
    }

    // click add
    const map = mapRef.current
    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (!addMode) return
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      const geocoder = new googleMaps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const name = status === 'OK' && results && results[0] ? results[0].formatted_address : 'محطة'
        onAddStop({ name, lat, lng })
        toast.success('تمت إضافة المحطة')
      })
    })

    return () => {
      googleMaps.event.removeListener(clickListener)
    }
  }, [addMode, onAddStop, ready, routeStart])

  useEffect(() => {
    if (!ready || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    const map = mapRef.current

    // clear markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const bounds = new googleMaps.LatLngBounds()

    if (routeStart) {
      const m = new googleMaps.Marker({
        map,
        position: { lat: routeStart.lat, lng: routeStart.lng },
        title: routeStart.name,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      })
      markersRef.current.push(m)
      bounds.extend({ lat: routeStart.lat, lng: routeStart.lng })
    }

    stops.forEach((s, idx) => {
      const m = new googleMaps.Marker({
        map,
        position: { lat: s.lat, lng: s.lng },
        title: s.name,
        label: {
          text: String(idx + 1),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '12px',
        },
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: polylineColor,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      markersRef.current.push(m)
      bounds.extend({ lat: s.lat, lng: s.lng })
    })

    if (routeEnd) {
      const m = new googleMaps.Marker({
        map,
        position: { lat: routeEnd.lat, lng: routeEnd.lng },
        title: routeEnd.name,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      })
      markersRef.current.push(m)
      bounds.extend({ lat: routeEnd.lat, lng: routeEnd.lng })
    }

    // directions line (connected)
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: polylineColor,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        },
      })
    }

    if (routeStart && routeEnd) {
      const directionsService = new googleMaps.DirectionsService()
      const waypoints: google.maps.DirectionsWaypoint[] = (stops || []).map((s) => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true,
      }))
      directionsService.route(
        {
          origin: { lat: routeStart.lat, lng: routeStart.lng },
          destination: { lat: routeEnd.lat, lng: routeEnd.lng },
          waypoints: waypoints.length > 0 ? waypoints : undefined,
          travelMode: googleMaps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === googleMaps.DirectionsStatus.OK && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result)
          }
        }
      )
    }

    // fit bounds
    try {
      if (!bounds.isEmpty()) map.fitBounds(bounds, 40)
    } catch {
      // ignore
    }
  }, [polylineColor, ready, routeEnd, routeStart, stops])

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
        <p className="text-xs sm:text-sm font-extrabold text-gray-900">{title}</p>
        {addMode ? (
          <span className="text-[11px] sm:text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-extrabold">
            وضع الإضافة: انقر على الخريطة
          </span>
        ) : (
          <span className="text-[11px] sm:text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 font-extrabold">
            خط متصل + محطات
          </span>
        )}
      </div>
      <div ref={mapElRef} className="w-full h-[320px] sm:h-[420px]" />
      {!apiKey && (
        <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-800 font-bold">
          مفتاح Google Maps غير موجود.
        </div>
      )}
    </div>
  )
}


