'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin } from 'lucide-react'

type DriverRow = {
  id: string
  name: string
  phone: string
  vehicle_type: string
  seats_count: number
  is_active: boolean
}

const BORDER_CENTER = { lat: 32.5456, lng: 35.825 } // معبر جابر تقريباً

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

export default function HomeTransportMap() {
  const supabase = createSupabaseBrowserClient()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  const [ready, setReady] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const initMap = () => {
    if (!mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(mapElRef.current, {
        center: BORDER_CENTER,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
    }

    const map = mapRef.current
    clearMarkers()

    // نقطة مرجعية: المعبر جابر
    markersRef.current.push(
      new googleMaps.Marker({
        position: BORDER_CENTER,
        map,
        title: 'المعبر جابر',
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
      })
    )
  }

  const loadDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id,name,phone,vehicle_type,seats_count,is_active')
        .eq('is_active', true)

      if (error) throw error
      const drivers = (data || []) as DriverRow[]

      if (!mapRef.current || !(window as any).google?.maps) return
      const googleMaps = (window as any).google.maps as typeof google.maps
      const map = mapRef.current

      // نضعهم بشكل “رمزي” قرب المعبر (لاحقاً: نقاط GPS حقيقية)
      drivers.forEach((d, idx) => {
        const jitter = 0.04
        const pos = {
          lat: BORDER_CENTER.lat + (Math.random() - 0.5) * jitter,
          lng: BORDER_CENTER.lng + (Math.random() - 0.5) * jitter,
        }
        const marker = new googleMaps.Marker({
          position: pos,
          map,
          title: d.name,
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
        })

        const info = new googleMaps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: Arial;">
              <div style="font-weight: 800; margin-bottom: 6px;">${d.name}</div>
              <div style="font-size: 12px; color: #374151;">نوع المركبة: ${d.vehicle_type}</div>
              <div style="font-size: 12px; color: #374151;">المقاعد: ${d.seats_count}</div>
            </div>
          `,
        })

        marker.addListener('click', () => info.open(map, marker))
        markersRef.current.push(marker)
      })
    } catch (e: any) {
      console.error('HomeTransportMap load drivers error:', e)
      // لا نوقف الصفحة — فقط نخفي السائقين إذا في مشكلة
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setErrorText('مفتاح Google Maps غير موجود')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setReady(true)
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setErrorText('تعذّر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    if (!ready) return
    initMap()
    loadDrivers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              خريطة حركة النقل (تجريبية)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              عرض رمزي للسائقين ومحطات التوقف — لاحقاً نربطها بتتبّع حقيقي لكل طلب
            </p>
          </div>
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex-shrink-0">
            Demo
          </span>
        </div>

        {errorText ? (
          <div className="p-5 text-sm text-gray-700">{errorText}</div>
        ) : (
          <div ref={mapElRef} className="w-full h-[280px] sm:h-[360px] md:h-[420px]" />
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


