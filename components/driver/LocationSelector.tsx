'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { MapPin, Search } from 'lucide-react'

type LatLng = { lat: number; lng: number }

type PreviewPoint = {
  lat: number
  lng: number
  kind: 'start' | 'stop' | 'end'
  label?: string
}

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

export default function LocationSelector({
  title,
  initial,
  selectionKind = 'stop',
  previewPoints = [],
  onSelect,
}: {
  title: string
  initial?: { name: string; lat: number; lng: number } | null
  selectionKind?: 'start' | 'stop' | 'end'
  previewPoints?: PreviewPoint[]
  onSelect: (p: { name: string; lat: number; lng: number }) => void
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const previewMarkersRef = useRef<google.maps.Marker[]>([])
  const previewPolylineRef = useRef<google.maps.Polyline | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  const [mapsReady, setMapsReady] = useState(false)
  const [pointName, setPointName] = useState(initial?.name || '')
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null
  )

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('LocationSelector maps load error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  const iconForKind = (googleMaps: typeof google.maps, kind: 'start' | 'stop' | 'end') => {
    if (kind === 'start') return { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }
    if (kind === 'end') return { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
    // stop
    return {
      path: googleMaps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#2563eb',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } as any
  }

  const clearPreview = () => {
    previewMarkersRef.current.forEach((m) => m.setMap(null))
    previewMarkersRef.current = []
    if (previewPolylineRef.current) {
      previewPolylineRef.current.setMap(null)
      previewPolylineRef.current = null
    }
  }

  const renderPreview = () => {
    if (!mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    clearPreview()

    const pts = (previewPoints || []).filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
    if (pts.length === 0) return

    // markers
    pts.forEach((p) => {
      const marker = new googleMaps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapObjRef.current!,
        title: p.label || '',
        icon: iconForKind(googleMaps, p.kind),
        label:
          p.kind === 'stop' && p.label
            ? {
                text: String(p.label),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '10px',
              }
            : undefined,
        zIndex: 10,
      })
      previewMarkersRef.current.push(marker)
    })

    // polyline in order
    previewPolylineRef.current = new googleMaps.Polyline({
      path: pts.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    })
    previewPolylineRef.current.setMap(mapObjRef.current!)

    // fit bounds
    const bounds = new googleMaps.LatLngBounds()
    pts.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }))
    if (selectedLocation) bounds.extend(selectedLocation)
    mapObjRef.current!.fitBounds(bounds, 40)
  }

  const updateMarker = (loc: LatLng) => {
    if (!mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    if (markerRef.current) {
      markerRef.current.setPosition(loc)
      return
    }
    markerRef.current = new googleMaps.Marker({
      position: loc,
      map: mapObjRef.current,
      title: 'الموقع',
      draggable: true,
      icon: iconForKind(googleMaps, selectionKind),
    })
    markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      setSelectedLocation({ lat, lng })
    })
  }

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      const center: LatLng = selectedLocation || { lat: 32.5456, lng: 35.825 }
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center,
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

      mapObjRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return
        const lat = e.latLng.lat()
        const lng = e.latLng.lng()
        setSelectedLocation({ lat, lng })
        updateMarker({ lat, lng })
        if (!pointName.trim()) setPointName('موقع')
      })
    }

    if (selectedLocation && !markerRef.current) {
      updateMarker(selectedLocation)
    }

    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new googleMaps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode'],
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (!place?.geometry?.location) return
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        setSelectedLocation({ lat, lng })
        if (place.name) setPointName(place.name)
        updateMarker({ lat, lng })
        mapObjRef.current?.setCenter({ lat, lng })
        mapObjRef.current?.setZoom(14)
      })
    }
  }, [mapsReady, selectedLocation, pointName, selectionKind])

  useEffect(() => {
    if (!mapsReady) return
    renderPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, JSON.stringify(previewPoints), selectedLocation])

  const save = () => {
    if (!selectedLocation) {
      toast.error('حدد الموقع على الخريطة أو من البحث')
      return
    }
    if (!pointName.trim()) {
      toast.error('اكتب اسم الموقع')
      return
    }
    onSelect({ name: pointName.trim(), lat: selectedLocation.lat, lng: selectedLocation.lng })
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        مفتاح Google Maps غير موجود.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h4 className="text-sm sm:text-base font-extrabold text-gray-900">{title}</h4>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">اسم الموقع</label>
        <input
          value={pointName}
          onChange={(e) => setPointName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="مثال: ساحة المرجة - دمشق"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-800 mb-2">بحث Google</label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="اكتب اسم المنطقة/الاستراحة..."
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">أو اضغط على الخريطة لوضع دبوس.</p>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div ref={mapRef} className="w-full h-[280px] sm:h-[360px]" />
      </div>

      <button
        type="button"
        onClick={save}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-extrabold"
      >
        اعتماد الموقع
      </button>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


