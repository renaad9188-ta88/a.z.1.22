'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

type LatLng = { lat: number; lng: number }

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

interface StopPointSelectorProps {
  title?: string
  onSelect: (point: { name: string; description: string; lat: number; lng: number }) => void
  initialPoint?: { name: string; description?: string | null; lat: number; lng: number } | null
}

export default function StopPointSelector({ title, onSelect, initialPoint }: StopPointSelectorProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [mapsReady, setMapsReady] = useState(false)
  const [pointName, setPointName] = useState(initialPoint?.name || '')
  const [description, setDescription] = useState(initialPoint?.description || '')
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    initialPoint ? { lat: initialPoint.lat, lng: initialPoint.lng } : null
  )

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('StopPointSelector maps load error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  const updateMarker = (location: LatLng) => {
    if (!mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (markerRef.current) {
      markerRef.current.setPosition(location)
      return
    }

    markerRef.current = new googleMaps.Marker({
      position: location,
      map: mapObjRef.current,
      title: 'نقطة التوقف',
      draggable: true,
      icon: {
        path: googleMaps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    })

    markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      setSelectedLocation({ lat, lng })

      // Reverse geocode as a helpful description
      const geocoder = new googleMaps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setDescription(results[0].formatted_address || '')
        }
      })
    })
  }

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      const defaultCenter: LatLng = selectedLocation || { lat: 31.9539, lng: 35.9106 } // عمّان
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 12,
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

        const geocoder = new googleMaps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setDescription(results[0].formatted_address || '')
            if (!pointName.trim()) {
              setPointName('نقطة توقف')
            }
          }
        })
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
        const location = { lat, lng }
        setSelectedLocation(location)
        setDescription(place.formatted_address || '')
        if (place.name) setPointName(place.name)
        updateMarker(location)
        mapObjRef.current?.setCenter(location)
        mapObjRef.current?.setZoom(15)
      })
    }
  }, [mapsReady, selectedLocation, pointName])

  const handleSave = () => {
    if (!selectedLocation) {
      toast.error('يرجى اختيار موقع نقطة التوقف على الخريطة')
      return
    }
    if (!pointName.trim()) {
      toast.error('يرجى إدخال اسم نقطة التوقف')
      return
    }
    onSelect({
      name: pointName.trim(),
      description: (description || '').trim(),
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
    })
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-600 text-xs">⚠️</span>
          </div>
          <p className="text-xs sm:text-sm text-yellow-800">مفتاح Google Maps غير موجود. لا يمكن إضافة نقطة توقف من الخريطة.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h4 className="text-sm sm:text-base font-extrabold text-gray-900">{title || 'اختيار نقطة التوقف'}</h4>
      </div>

      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">اسم نقطة التوقف</label>
        <input
          type="text"
          value={pointName}
          onChange={(e) => setPointName(e.target.value)}
          placeholder="مثال: محطة وقوف - درعا"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
        />
      </div>

      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">البحث عن الموقع</label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن موقع..."
            className="w-full px-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">وصف/عنوان (اختياري)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="سيتم ملؤه تلقائياً عند اختيار الموقع"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
        />
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div ref={mapRef} className="w-full h-[280px] sm:h-[360px]" />
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-bold"
      >
        اعتماد نقطة التوقف
      </button>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


