'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Search } from 'lucide-react'
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

interface DropoffPointSelectorProps {
  requestId: string
  routeId?: string
  onSelect: (point: { name: string; address: string; lat: number; lng: number }) => void
  initialPoint?: { name: string; address: string | null; lat: number; lng: number } | null
}

export default function DropoffPointSelector({
  requestId,
  routeId,
  onSelect,
  initialPoint,
}: DropoffPointSelectorProps) {
  const supabase = createSupabaseBrowserClient()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [mapsReady, setMapsReady] = useState(false)
  const [pointName, setPointName] = useState(initialPoint?.name || '')
  const [address, setAddress] = useState(initialPoint?.address || '')
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(
    initialPoint ? { lat: initialPoint.lat, lng: initialPoint.lng } : null
  )

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          console.warn('Google Maps API key not found')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('Failed to load Google Maps:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    // Initialize map
    if (!mapObjRef.current) {
      const defaultCenter: LatLng = selectedLocation || { lat: 31.9539, lng: 35.9106 } // عمان
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
      })

      // Add click listener to map
      mapObjRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          setSelectedLocation({ lat, lng })
          updateMarker({ lat, lng })
          
          // Reverse geocode to get address
          const geocoder = new googleMaps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setAddress(results[0].formatted_address)
            }
          })
        }
      })
    }

    // Initialize marker
    if (selectedLocation && !markerRef.current) {
      updateMarker(selectedLocation)
    }

    // Initialize autocomplete
    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new googleMaps.places.Autocomplete(searchInputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'jo' }, // الأردن فقط
      })

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const location = { lat, lng }
          
          setSelectedLocation(location)
          setAddress(place.formatted_address || '')
          if (place.name) setPointName(place.name)
          
          updateMarker(location)
          mapObjRef.current?.setCenter(location)
          mapObjRef.current?.setZoom(15)
        }
      })
    }
  }, [mapsReady, selectedLocation])

  const updateMarker = (location: LatLng) => {
    if (!mapObjRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (markerRef.current) {
      markerRef.current.setPosition(location)
    } else {
      markerRef.current = new googleMaps.Marker({
        position: location,
        map: mapObjRef.current,
        title: 'نقطة النزول',
        draggable: true,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#f59e0b',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })

      markerRef.current.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat()
          const lng = e.latLng.lng()
          setSelectedLocation({ lat, lng })
          
          // Reverse geocode
          const geocoder = new googleMaps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              setAddress(results[0].formatted_address)
            }
          })
        }
      })
    }
  }

  const handleSave = () => {
    if (!selectedLocation) {
      toast.error('يرجى اختيار موقع نقطة النزول')
      return
    }
    if (!pointName.trim()) {
      toast.error('يرجى إدخال اسم نقطة النزول')
      return
    }

    onSelect({
      name: pointName.trim(),
      address: address.trim(),
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
          <p className="text-xs sm:text-sm text-yellow-800">مفتاح Google Maps غير موجود. لا يمكن اختيار نقطة النزول.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">اسم نقطة النزول</label>
        <input
          type="text"
          value={pointName}
          onChange={(e) => setPointName(e.target.value)}
          placeholder="مثال: مجمع الشرق الأوسط، شارع الملكة رانيا"
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
            placeholder="ابحث عن موقع في الأردن..."
            className="w-full px-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">العنوان</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="سيتم ملؤه تلقائياً عند اختيار الموقع"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
        />
      </div>

      <div>
        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">اختر موقع نقطة النزول على الخريطة</label>
        <div className="relative">
          <div ref={mapRef} className="w-full h-64 sm:h-80 lg:h-96 rounded-lg border border-gray-300" />
          {!mapsReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">جاري تحميل الخريطة...</p>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mt-3 leading-relaxed">
          اضغط على الخريطة أو اسحب العلامة لاختيار موقع نقطة النزول. يمكنك البحث عن الموقع أو تحديده مباشرة.
        </p>
      </div>

      {selectedLocation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="text-blue-800 font-medium">
              الموقع المحدد: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!selectedLocation || !pointName.trim()}
        className="w-full px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium text-sm sm:text-base"
      >
        حفظ نقطة النزول
      </button>
    </div>
  )
}

