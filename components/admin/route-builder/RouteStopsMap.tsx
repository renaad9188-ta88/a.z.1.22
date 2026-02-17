'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/date-utils'

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
  onStopDrag,
  lastSavedAt,
}: {
  title: string
  apiKey: string
  routeStart: { name: string; lat: number; lng: number } | null
  routeEnd: { name: string; lat: number; lng: number } | null
  stops: BuilderStop[]
  polylineColor?: string
  addMode: boolean
  onAddStop: (p: { name: string; lat: number; lng: number }) => void
  onStopDrag?: (stopId: string, newLat: number, newLng: number) => void
  lastSavedAt?: Date | null
}) {
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const [ready, setReady] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

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

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!ready || !searchInputRef.current || !(window as any).google?.maps?.places) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!autocompleteRef.current && searchInputRef.current) {
      autocompleteRef.current = new googleMaps.places.Autocomplete(searchInputRef.current, {
        fields: ['formatted_address', 'geometry'],
        language: 'ar',
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (!place?.geometry?.location) return

        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const name = place.formatted_address || 'محطة'

        if (addMode) {
          onAddStop({ name, lat, lng })
          toast.success('تمت إضافة المحطة من البحث')
          if (searchInputRef.current) {
            searchInputRef.current.value = ''
          }
        } else if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng })
          mapRef.current.setZoom(15)
          toast.success('تم الانتقال إلى الموقع')
        }
      })
    }

    return () => {
      if (autocompleteRef.current) {
        googleMaps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [ready, addMode, onAddStop])

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
        gestureHandling: 'cooperative',
        clickableIcons: false,
        disableDoubleClickZoom: false,
        zoomControl: true,
        zoomControlOptions: {
          position: googleMaps.ControlPosition.RIGHT_CENTER,
        },
      })
    }

    const map = mapRef.current
    
    // تحديث gestureHandling عند تغيير addMode
    map.setOptions({ 
      gestureHandling: addMode ? 'cooperative' : 'greedy' 
    })
    
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
        draggable: true,
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

      // Add drag listener
      if (onStopDrag) {
        m.addListener('dragend', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const newLat = e.latLng.lat()
            const newLng = e.latLng.lng()
            onStopDrag(s.id, newLat, newLng)
          }
        })
      }

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
      <div className="px-2 sm:px-3 py-2 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-xs sm:text-sm font-extrabold text-gray-900">{title}</p>
          {lastSavedAt && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 flex-shrink-0">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <div className="flex flex-col items-start">
                <span className="text-[9px] sm:text-[10px] font-extrabold leading-tight">تم الحفظ</span>
                <span className="text-[8px] sm:text-[9px] font-semibold leading-tight tabular-nums">
                  {formatDateTime(lastSavedAt)}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {addMode && (
            <button
              type="button"
              onClick={() => setShowSearch(!showSearch)}
              className="text-[10px] sm:text-[11px] md:text-xs px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-extrabold whitespace-nowrap hover:bg-indigo-100 transition"
            >
              {showSearch ? 'إخفاء البحث' : 'بحث عن موقع'}
            </button>
          )}
          {addMode ? (
            <span className="text-[10px] sm:text-[11px] md:text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-extrabold whitespace-nowrap">
              اضغط على الخريطة
            </span>
          ) : (
            <span className="text-[10px] sm:text-[11px] md:text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700 font-extrabold whitespace-nowrap">
              اسحب المحطات لتحريكها
            </span>
          )}
        </div>
      </div>
      
      {/* Search Bar */}
      {showSearch && addMode && ready && (
        <div className="px-2 sm:px-3 py-2 bg-gray-50 border-b border-gray-200">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن موقع..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            dir="rtl"
          />
        </div>
      )}

      <div className="relative">
        <div 
          ref={mapElRef} 
          className="w-full h-[320px] sm:h-[420px] touch-none" 
          style={{ touchAction: addMode ? 'manipulation' : 'auto' }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <p className="text-sm text-gray-600 font-bold">جاري تحميل الخريطة...</p>
          </div>
        )}
      </div>
      
      {!apiKey && (
        <div className="p-3 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-800 font-bold">
          مفتاح Google Maps غير موجود.
        </div>
      )}
    </div>
  )
}


