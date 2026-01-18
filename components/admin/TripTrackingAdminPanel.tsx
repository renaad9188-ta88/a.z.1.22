'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { MapPin, Plus, Save, Trash2, Navigation } from 'lucide-react'

type StopRow = {
  id: string
  request_id: string
  title: string
  lat: number
  lng: number
  order_index: number
  updated_at: string
}

type DriverLocRow = {
  id: string
  request_id: string
  lat: number
  lng: number
  updated_at: string
}

function toNum(v: any): number | null {
  const n = typeof v === 'number' ? v : Number(String(v).trim())
  return Number.isFinite(n) ? n : null
}

export default function TripTrackingAdminPanel({ requestId }: { requestId: string }) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)

  const [stops, setStops] = useState<StopRow[]>([])
  const [driverLoc, setDriverLoc] = useState<DriverLocRow | null>(null)

  const [liveTracking, setLiveTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const lastSentAtRef = useRef<number>(0)

  // driver form
  const [driverLat, setDriverLat] = useState('')
  const [driverLng, setDriverLng] = useState('')
  const [savingDriver, setSavingDriver] = useState(false)

  // stop form
  const [stopTitle, setStopTitle] = useState('')
  const [stopLat, setStopLat] = useState('')
  const [stopLng, setStopLng] = useState('')
  const [stopOrder, setStopOrder] = useState<number>(0)
  const [savingStop, setSavingStop] = useState(false)

  const nextOrder = useMemo(() => {
    const max = stops.reduce((acc, s) => Math.max(acc, s.order_index ?? 0), 0)
    return stops.length === 0 ? 1 : max + 1
  }, [stops])

  const load = async () => {
    try {
      setLoading(true)

      const { data: stopsData, error: stopsErr } = await supabase
        .from('trip_stops')
        .select('id,request_id,title,lat,lng,order_index,updated_at')
        .eq('request_id', requestId)
        .order('order_index', { ascending: true })

      if (stopsErr) throw stopsErr
      setStops((stopsData || []) as any)

      const { data: locData, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('id,request_id,lat,lng,updated_at')
        .eq('request_id', requestId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (locErr) throw locErr
      setDriverLoc((locData as any) || null)

      if (locData) {
        setDriverLat(String((locData as any).lat ?? ''))
        setDriverLng(String((locData as any).lng ?? ''))
      }

      // initialize order
      setStopOrder(nextOrder)
    } catch (e: any) {
      console.error('TripTrackingAdminPanel load error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات التتبع')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`admin-trip-tracking-${requestId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_driver_locations', filter: `request_id=eq.${requestId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_stops', filter: `request_id=eq.${requestId}` },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator?.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const useMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDriverLat(String(pos.coords.latitude))
        setDriverLng(String(pos.coords.longitude))
      },
      () => toast.error('تعذر الحصول على موقعك')
    )
  }

  const insertDriverLocation = async (lat: number, lng: number, silent = false) => {
    const { error } = await supabase.from('trip_driver_locations').insert({
      request_id: requestId,
      lat,
      lng,
    })
    if (error) throw error
    if (!silent) toast.success('تم تحديث موقع السائق')
  }

  const saveDriverLocation = async () => {
    const lat = toNum(driverLat)
    const lng = toNum(driverLng)
    if (lat === null || lng === null) {
      toast.error('أدخل إحداثيات صحيحة للسائق')
      return
    }

    try {
      setSavingDriver(true)
      await insertDriverLocation(lat, lng)
      await load()
    } catch (e: any) {
      console.error('Save driver location error:', e)
      toast.error(e?.message || 'تعذر تحديث موقع السائق')
    } finally {
      setSavingDriver(false)
    }
  }

  const startLiveTracking = async () => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع')
      return
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    lastSentAtRef.current = 0
    setLiveTracking(true)
    toast.success('تم بدء التتبع المباشر')

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setDriverLat(String(lat))
        setDriverLng(String(lng))

        // throttle: لا نرسل أكثر من مرة كل 12 ثانية
        const now = Date.now()
        if (now - lastSentAtRef.current < 12000) return
        lastSentAtRef.current = now

        try {
          await insertDriverLocation(lat, lng, true)
        } catch (e: any) {
          console.error('Live tracking insert error:', e)
          // لا نعمل spam للتوست
        }
      },
      (err) => {
        console.error('watchPosition error:', err)
        toast.error('تعذر تشغيل التتبع (تحقق من صلاحيات الموقع)')
        setLiveTracking(false)
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current)
          watchIdRef.current = null
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
  }

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null && navigator?.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setLiveTracking(false)
    toast.success('تم إيقاف التتبع')
  }

  const addStop = async () => {
    const lat = toNum(stopLat)
    const lng = toNum(stopLng)
    const title = stopTitle.trim()

    if (!title) {
      toast.error('أدخل اسم محطة التوقف')
      return
    }
    if (lat === null || lng === null) {
      toast.error('أدخل إحداثيات صحيحة لمحطة التوقف')
      return
    }

    try {
      setSavingStop(true)
      const { error } = await supabase
        .from('trip_stops')
        .insert({
          request_id: requestId,
          title,
          lat,
          lng,
          order_index: stopOrder || nextOrder,
        })
      if (error) throw error
      toast.success('تمت إضافة محطة التوقف')
      setStopTitle('')
      setStopLat('')
      setStopLng('')
      setStopOrder(nextOrder + 1)
      await load()
    } catch (e: any) {
      console.error('Add stop error:', e)
      toast.error(e?.message || 'تعذر إضافة محطة التوقف')
    } finally {
      setSavingStop(false)
    }
  }

  const deleteStop = async (id: string) => {
    if (!confirm('حذف محطة التوقف؟')) return
    try {
      const { error } = await supabase.from('trip_stops').delete().eq('id', id)
      if (error) throw error
      toast.success('تم حذف محطة التوقف')
      await load()
    } catch (e: any) {
      console.error('Delete stop error:', e)
      toast.error(e?.message || 'تعذر حذف محطة التوقف')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-blue-600" />
          تتبع الرحلة
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-full border ${
            liveTracking ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            {liveTracking ? 'Live ON' : 'Live OFF'}
          </span>
          <button
            type="button"
            onClick={liveTracking ? stopLiveTracking : startLiveTracking}
            className={`text-xs sm:text-sm font-bold px-3 py-2 rounded-lg transition ${
              liveTracking ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {liveTracking ? 'إيقاف' : 'بدء التتبع'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Driver location */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="font-bold text-gray-800 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600" />
                موقع السائق
              </div>
              <button
                type="button"
                onClick={useMyLocation}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                استخدم موقعي الآن
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Lat</label>
                <input
                  value={driverLat}
                  onChange={(e) => setDriverLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="32.5456"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Lng</label>
                <input
                  value={driverLng}
                  onChange={(e) => setDriverLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="35.8250"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500">
                آخر تحديث: {driverLoc?.updated_at ? new Date(driverLoc.updated_at).toLocaleString() : '—'}
              </div>
              <button
                type="button"
                onClick={saveDriverLocation}
                disabled={savingDriver}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingDriver ? 'جاري الحفظ...' : 'تحديث'}
              </button>
            </div>
          </div>

          {/* Stops */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-yellow-600" />
              محطات التوقف
            </div>

            <div className="space-y-2 mb-4">
              {stops.length === 0 ? (
                <div className="text-sm text-gray-500">لا توجد محطات حتى الآن</div>
              ) : (
                stops.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {s.order_index}. {s.title}
                      </div>
                      <div className="text-[11px] text-gray-500 tabular-nums">
                        {s.lat}, {s.lng}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteStop(s.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-600 mb-1">اسم المحطة</label>
                <input
                  value={stopTitle}
                  onChange={(e) => setStopTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: محطة استراحة"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Lat</label>
                <input
                  value={stopLat}
                  onChange={(e) => setStopLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="32.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Lng</label>
                <input
                  value={stopLng}
                  onChange={(e) => setStopLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                  placeholder="35.8"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs text-gray-600">الترتيب</label>
                  <input
                    type="number"
                    value={stopOrder}
                    onChange={(e) => setStopOrder(Number(e.target.value))}
                    className="w-20 px-2 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
                    min={0}
                  />
                </div>
                <button
                  type="button"
                  onClick={addStop}
                  disabled={savingStop}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {savingStop ? 'جاري الإضافة...' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



