'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Navigation } from 'lucide-react'

export default function MapPage() {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [errorText, setErrorText] = useState<string>('')
  const mapObjRef = useRef<any | null>(null)
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    // Load Google Maps
    if (!apiKey) {
      setErrorText('مفتاح Google Maps غير موجود. يرجى إضافة NEXT_PUBLIC_GOOGLE_MAPS_API_KEY في ملف .env.local ثم إعادة تشغيل السيرفر.')
      return
    }

    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setMapLoaded(true)
      return
    }

    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => setMapLoaded(true))
      existing.addEventListener('error', () =>
        setErrorText('فشل تحميل Google Maps. تحقق من صحة المفتاح وتفعيل APIs (Maps JavaScript + Places) وBilling وقيود Referrer.')
      )
      return
    }

    const script = document.createElement('script')
    script.dataset.googleMaps = '1'
    script.setAttribute('data-google-maps', '1')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => setMapLoaded(true)
    script.onerror = () =>
      setErrorText('فشل تحميل Google Maps. تحقق من صحة المفتاح وتفعيل APIs (Maps JavaScript + Places) وBilling وقيود Referrer.')
    document.head.appendChild(script)

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }, [apiKey])

  useEffect(() => {
    if (!mapLoaded) return
    initMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, userLocation])

  const initMap = () => {
    if (typeof window === 'undefined' || !(window as any).google?.maps) return
    const googleMaps = (window as any).google as any

    // Default to Jaber Border Crossing (المعبر جابر)
    const defaultLocation = { lat: 32.5456, lng: 35.8250 } // Approximate location
    const center = userLocation || defaultLocation
    const el = document.getElementById('map') as HTMLElement | null
    if (!el) return

    const map =
      mapObjRef.current ||
      new googleMaps.maps.Map(el, {
        center,
        zoom: 13,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })
    mapObjRef.current = map
    try {
      map.setCenter(center)
    } catch {
      // ignore
    }

    // Add marker for Jaber Border Crossing
    new googleMaps.maps.Marker({
      position: defaultLocation,
      map: map,
      title: 'المعبر جابر',
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
      },
    })

    // Add marker for user location if available
    if (userLocation) {
      new googleMaps.maps.Marker({
        position: userLocation,
        map: map,
        title: 'موقعك الحالي',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      })
    }

    // Load drivers from database and add markers
    loadDrivers(map)
  }

  const loadDrivers = async (map: any) => {
    try {
      const { data: drivers } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true)

      if (drivers) {
        const googleMaps = (window as any).google as any
        drivers.forEach((driver) => {
          // For demo purposes, use random locations near the border
          // In production, you would store actual GPS coordinates for each driver
          const driverLocation = {
            lat: 32.5456 + (Math.random() - 0.5) * 0.1,
            lng: 35.8250 + (Math.random() - 0.5) * 0.1,
          }

          const marker = new googleMaps.maps.Marker({
            position: driverLocation,
            map: map,
            title: `${driver.name} - ${driver.phone}`,
            icon: {
              url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
            },
          })

          const infoWindow = new googleMaps.maps.InfoWindow({
            content: `
              <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; font-weight: bold;">${driver.name}</h3>
                <p style="margin: 5px 0;"><strong>الهاتف:</strong> ${driver.phone}</p>
                <p style="margin: 5px 0;"><strong>نوع السيارة:</strong> ${driver.vehicle_type}</p>
                <p style="margin: 5px 0;"><strong>عدد المقاعد:</strong> ${driver.seats_count}</p>
              </div>
            `,
          })

          marker.addListener('click', () => {
            infoWindow.open(map, marker)
          })
        })
      }
    } catch (error) {
      console.error('Error loading drivers:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md mb-4">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            الخريطة التفاعلية للسائقين
          </h1>
          <p className="text-gray-600 mt-2">
            تتبع مواقع السائقين ومساراتهم في الوقت الفعلي
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {errorText ? (
            <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-200">{errorText}</div>
          ) : (
            <div id="map" style={{ width: '100%', height: '600px' }}></div>
          )}
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              معلومات الخريطة
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span>المعبر جابر</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>موقعك الحالي</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>السائقين المتاحين</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">إحصائيات</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm">عدد السائقين النشطين</p>
                <p className="text-2xl font-bold text-blue-600">-</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">عدد القادمون</p>
                <p className="text-2xl font-bold text-green-600">-</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">عدد المقادرون</p>
                <p className="text-2xl font-bold text-purple-600">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

