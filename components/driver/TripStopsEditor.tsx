'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, ArrowUp, ArrowDown, Trash2, Save, Plus, X } from 'lucide-react'

type LatLng = { lat: number; lng: number }

type StopRow = {
  id?: string
  title: string
  lat: number
  lng: number
  order_index: number
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

export default function TripStopsEditor({
  requestId,
  onClose,
  onSaved,
}: {
  requestId: string
  onClose: () => void
  onSaved?: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [stops, setStops] = useState<StopRow[]>([])

  const sorted = useMemo(() => [...stops].sort((a, b) => a.order_index - b.order_index), [stops])

  const clearMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
  }

  const renderStopsOnMap = () => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: { lat: 32.5456, lng: 35.825 },
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
        const nextOrder = sorted.length === 0 ? 0 : Math.max(...sorted.map((s) => s.order_index)) + 1
        const title = `نقطة توقف ${nextOrder + 1}`
        setStops((prev) => [...prev, { title, lat, lng, order_index: nextOrder }])
      })
    }

    const map = mapObjRef.current
    clearMarkers()
    const bounds = new googleMaps.LatLngBounds()

    for (const s of sorted) {
      const pos: LatLng = { lat: s.lat, lng: s.lng }
      bounds.extend(pos)
      const marker = new googleMaps.Marker({
        position: pos,
        map,
        title: s.title,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
        label: {
          text: String(s.order_index + 1),
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '12px',
        },
      })
      markersRef.current.push(marker)
    }

    if (sorted.length > 0) {
      map.fitBounds(bounds, 60)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setMapsReady(false)
          return
        }
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('TripStopsEditor maps load error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    renderStopsOnMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, stops.length])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('trip_stops')
          .select('id,title,lat,lng,order_index')
          .eq('request_id', requestId)
          .order('order_index', { ascending: true })
        if (error) throw error
        if (!mounted) return
        setStops((data || []).map((r: any) => ({ id: r.id, title: r.title, lat: r.lat, lng: r.lng, order_index: r.order_index })))
      } catch (e: any) {
        console.error('Load trip stops error:', e)
        toast.error(e?.message || 'تعذر تحميل سير الرحلة')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [requestId, supabase])

  const moveStop = (idx: number, dir: -1 | 1) => {
    const list = [...sorted]
    const target = list[idx]
    const swapWith = list[idx + dir]
    if (!target || !swapWith) return
    const a = target.order_index
    target.order_index = swapWith.order_index
    swapWith.order_index = a
    setStops(list)
  }

  const removeStop = (idx: number) => {
    const list = [...sorted]
    list.splice(idx, 1)
    // إعادة ترقيم
    const normalized = list.map((s, i) => ({ ...s, order_index: i }))
    setStops(normalized)
  }

  const save = async () => {
    try {
      if (sorted.length === 0) {
        toast.error('أضف نقطة واحدة على الأقل')
        return
      }
      setSaving(true)
      // أبسط وموثوق: حذف القديم وإدخال الجديد بالتسلسل
      const { error: delErr } = await supabase.from('trip_stops').delete().eq('request_id', requestId)
      if (delErr) throw delErr

      const payload = sorted.map((s, i) => ({
        request_id: requestId,
        title: s.title.trim() || `نقطة توقف ${i + 1}`,
        lat: s.lat,
        lng: s.lng,
        order_index: i,
      }))

      const { error: insErr } = await supabase.from('trip_stops').insert(payload as any)
      if (insErr) throw insErr

      toast.success('تم حفظ سير الرحلة')
      onSaved?.()
      onClose()
    } catch (e: any) {
      console.error('Save trip stops error:', e)
      toast.error(e?.message || 'تعذر حفظ سير الرحلة (تحقق من الصلاحيات)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full mx-4 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              سير الرحلة (نقاط التوقف)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              اضغط على الخريطة لإضافة نقطة. يمكنك إعادة ترتيبها وستظهر على التتبع بخط أزرق وبترقيم 1،2،3...
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition text-sm font-bold inline-flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            إغلاق
          </button>
        </div>

        <div className="p-4 sm:p-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {!apiKey ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                مفتاح Google Maps غير موجود. لا يمكن تحرير سير الرحلة على الخريطة.
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div ref={mapRef} className="w-full h-[320px] sm:h-[420px]" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold text-gray-900">النقاط ({sorted.length})</p>
              <button
                type="button"
                onClick={() => toast('اضغط على الخريطة لإضافة نقطة جديدة')}
                className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-xs font-bold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إضافة
              </button>
            </div>

            {loading ? (
              <div className="text-sm text-gray-600">جاري التحميل...</div>
            ) : sorted.length === 0 ? (
              <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                لا يوجد نقاط بعد. اضغط على الخريطة لإضافة أول نقطة.
              </div>
            ) : (
              <div className="space-y-2">
                {sorted.map((s, idx) => (
                  <div key={`${s.lat}-${s.lng}-${idx}`} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-gray-900">#{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStop(idx, -1)}
                          disabled={idx === 0}
                          className="p-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-40"
                          title="أعلى"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStop(idx, 1)}
                          disabled={idx === sorted.length - 1}
                          className="p-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-40"
                          title="أسفل"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStop(idx)}
                          className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={s.title}
                      onChange={(e) => {
                        const v = e.target.value
                        setStops((prev) =>
                          prev.map((x) => (x.order_index === s.order_index ? { ...x, title: v } : x))
                        )
                      }}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="مثال: المفرق استراحة مرح"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-extrabold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ سير الرحلة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


