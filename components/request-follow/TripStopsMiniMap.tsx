'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/components/transport-map/utils'

type Stop = {
  id: string
  name: string
  order_index: number
  lat?: number | null
  lng?: number | null
}

export default function TripStopsMiniMap({ stops }: { stops: Stop[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const points = useMemo(() => {
    return (stops || [])
      .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      .map((s) => ({ ...s, lat: s.lat as number, lng: s.lng as number }))
  }, [stops])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setErr('مفتاح الخريطة غير موجود')
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setReady(true)
      } catch (e) {
        console.error('MiniMap load error:', e)
        if (!mounted) return
        setErr('تعذّر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    if (!ready) return
    if (!mapElRef.current) return
    if (points.length === 0) return

    const g = (window as any).google as typeof google | undefined
    if (!g?.maps) return

    // init map once
    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(mapElRef.current, {
        center: { lat: points[0].lat, lng: points[0].lng },
        zoom: 10,
        disableDefaultUI: true,
        gestureHandling: 'cooperative',
        clickableIcons: false,
      })
    }

    // clear previous
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    const bounds = new g.maps.LatLngBounds()
    points.forEach((p, idx) => {
      const pos = { lat: p.lat, lng: p.lng }
      bounds.extend(pos)
      const marker = new g.maps.Marker({
        map: mapRef.current!,
        position: pos,
        title: p.name,
        label: {
          text: String(idx + 1),
          color: '#ffffff',
          fontSize: '12px',
          fontWeight: '700',
        },
      })
      markersRef.current.push(marker)
    })

    polylineRef.current = new g.maps.Polyline({
      map: mapRef.current!,
      path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
      strokeColor: '#2563eb',
      strokeOpacity: 0.9,
      strokeWeight: 4,
    })

    mapRef.current!.fitBounds(bounds, 18)
  }, [ready, points])

  if (!apiKey) return null
  if (err) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 text-[11px] text-gray-600">
        {err}
      </div>
    )
  }

  if (points.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-2 text-[11px] text-gray-600">
        لا توجد إحداثيات كافية لعرض الخريطة.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div ref={mapElRef} className="w-full h-[160px]" />
      <div className="px-2 py-1 text-[10px] text-gray-600 border-t border-gray-200">
        خريطة مصغّرة لمسار نقاط التوقف
      </div>
    </div>
  )
}


