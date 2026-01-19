'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Edit, Trash2, Bus, Route as RouteIcon, Flag, CornerDownLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import StopPointSelector from '@/components/driver/StopPointSelector'
import LocationSelector from '@/components/driver/LocationSelector'

type Route = {
  id: string
  name: string
  description: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
}

type RouteStopPoint = {
  id: string
  name: string
  description: string | null
  lat: number
  lng: number
  order_index: number
}

export default function DriverRoutes() {
  const supabase = createSupabaseBrowserClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [routeStops, setRouteStops] = useState<RouteStopPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddStop, setShowAddStop] = useState(false)
  const [editingStop, setEditingStop] = useState<RouteStopPoint | null>(null)
  const [showStopPicker, setShowStopPicker] = useState(false)
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  // Map preview (route + stops)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const [mapsReady, setMapsReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  useEffect(() => {
    loadDriverRoutes()
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        if (typeof window === 'undefined') return
        if ((window as any).google?.maps) {
          if (mounted) setMapsReady(true)
          return
        }
        const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
        if (existing) {
          existing.addEventListener('load', () => mounted && setMapsReady(true))
          return
        }
        const script = document.createElement('script')
        script.dataset.googleMaps = '1'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`
        script.async = true
        script.defer = true
        script.onload = () => mounted && setMapsReady(true)
        script.onerror = () => {
          // ignore (we show a message in UI)
        }
        document.head.appendChild(script)
      } catch (e) {
        console.error('DriverRoutes maps load error:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  const clearMap = () => {
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
  }

  const renderRoutePreview = () => {
    if (!mapsReady || !mapRef.current || !(window as any).google?.maps || !selectedRoute) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapObjRef.current) {
      mapObjRef.current = new googleMaps.Map(mapRef.current, {
        center: { lat: selectedRoute.start_lat, lng: selectedRoute.start_lng },
        zoom: 7,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: true,
        mapTypeControlOptions: { position: googleMaps.ControlPosition.TOP_LEFT },
        zoomControl: true,
        fullscreenControl: true,
        streetViewControl: false,
        gestureHandling: 'greedy',
        scrollwheel: true,
      })
    }

    const map = mapObjRef.current
    clearMap()

    const bounds = new googleMaps.LatLngBounds()
    const path: { lat: number; lng: number }[] = []

    const start = { lat: selectedRoute.start_lat, lng: selectedRoute.start_lng }
    const end = { lat: selectedRoute.end_lat, lng: selectedRoute.end_lng }
    path.push(start)
    bounds.extend(start)

    markersRef.current.push(
      new googleMaps.Marker({
        position: start,
        map,
        title: selectedRoute.start_location_name,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' },
      })
    )

    const sortedStops = [...routeStops].sort((a, b) => a.order_index - b.order_index)
    for (const s of sortedStops) {
      const pos = { lat: s.lat, lng: s.lng }
      path.push(pos)
      bounds.extend(pos)
      markersRef.current.push(
        new googleMaps.Marker({
          position: pos,
          map,
          title: s.name,
          icon: {
            url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
            scaledSize: new googleMaps.Size(38, 38),
          },
          label: {
            text: String(s.order_index + 1),
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '12px',
          },
        })
      )
    }

    path.push(end)
    bounds.extend(end)
    markersRef.current.push(
      new googleMaps.Marker({
        position: end,
        map,
        title: selectedRoute.end_location_name,
        icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' },
      })
    )

    polylineRef.current = new googleMaps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    })
    polylineRef.current.setMap(map)

    map.fitBounds(bounds)
  }

  useEffect(() => {
    renderRoutePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, selectedRoute?.id, routeStops.length])

  const loadDriverRoutes = async () => {
    try {
      setLoading(true)

      // الحصول على معرف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // ربط حساب السائق بسجل في جدول drivers عبر drivers.user_id
      const { data: driverRow, error: driverErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (driverErr) throw driverErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق. يرجى التواصل مع الإدارة.')
        setRoutes([])
        setSelectedRoute(null)
        setRouteStops([])
        return
      }

      // الحصول على الخطوط المربوطة بالسائق
      const { data: driverRoutesData, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)

      if (rdErr) throw rdErr

      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .eq('is_active', true)
        .in('id', (driverRoutesData || []).map(rd => rd.route_id))

      if (routesError) throw routesError

      setRoutes(routesData || [])

      // تحميل نقاط التوقف للخط الأول إذا كان موجوداً
      if (routesData && routesData.length > 0) {
        setSelectedRoute(routesData[0])
        loadRouteStops(routesData[0].id)
      }
    } catch (error: any) {
      console.error('Error loading driver routes:', error)
      toast.error('حدث خطأ أثناء تحميل الخطوط')
    } finally {
      setLoading(false)
    }
  }

  const loadRouteStops = async (routeId: string) => {
    try {
      const { data: stopsData, error: stopsError } = await supabase
        .from('route_stop_points')
        .select('*')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (stopsError) throw stopsError

      setRouteStops(stopsData || [])
    } catch (error: any) {
      console.error('Error loading route stops:', error)
      toast.error('حدث خطأ أثناء تحميل نقاط التوقف')
    }
  }

  const handleAddStop = async (formData: FormData) => {
    if (!selectedRoute) return

    try {
      const stopName = formData.get('name') as string
      const description = formData.get('description') as string
      const lat = parseFloat(formData.get('lat') as string)
      const lng = parseFloat(formData.get('lng') as string)

      if (!stopName.trim() || isNaN(lat) || isNaN(lng)) {
        toast.error('يرجى ملء جميع الحقول بشكل صحيح')
        return
      }

      const { error } = await supabase
        .from('route_stop_points')
        .insert({
          route_id: selectedRoute.id,
          name: stopName.trim(),
          description: description.trim() || null,
          lat,
          lng,
          order_index: routeStops.length, // إضافة في النهاية
          is_active: true,
        })

      if (error) throw error

      toast.success('تم إضافة نقطة التوقف بنجاح')
      setShowAddStop(false)
      loadRouteStops(selectedRoute.id)
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة نقطة التوقف')
    }
  }

  const addStopFromMap = async (point: { name: string; description: string; lat: number; lng: number }) => {
    if (!selectedRoute) return
    try {
      const { error } = await supabase.from('route_stop_points').insert({
        route_id: selectedRoute.id,
        name: point.name,
        description: point.description || null,
        lat: point.lat,
        lng: point.lng,
        order_index: routeStops.length,
        is_active: true,
      })
      if (error) throw error
      toast.success('تمت إضافة نقطة التوقف من الخريطة')
      setShowStopPicker(false)
      await loadRouteStops(selectedRoute.id)
    } catch (e: any) {
      console.error('addStopFromMap error:', e)
      toast.error(e?.message || 'تعذر إضافة نقطة التوقف')
    }
  }

  const updateRoutePoint = async (kind: 'start' | 'end', point: { name: string; lat: number; lng: number }) => {
    if (!selectedRoute) return
    try {
      const updateData: any =
        kind === 'start'
          ? { start_location_name: point.name, start_lat: point.lat, start_lng: point.lng }
          : { end_location_name: point.name, end_lat: point.lat, end_lng: point.lng }

      const { error } = await supabase.from('routes').update(updateData).eq('id', selectedRoute.id)
      if (error) throw error

      toast.success(kind === 'start' ? 'تم تحديث نقطة الانطلاق' : 'تم تحديث نقطة الوصول')
      // Update local state
      setRoutes((prev) => prev.map((r) => (r.id === selectedRoute.id ? ({ ...r, ...updateData } as any) : r)))
      setSelectedRoute((prev) => (prev ? ({ ...prev, ...updateData } as any) : prev))
      if (kind === 'start') setShowStartPicker(false)
      else setShowEndPicker(false)
      renderRoutePreview()
    } catch (e: any) {
      console.error('updateRoutePoint error:', e)
      toast.error(e?.message || 'تعذر تحديث نقطة المسار (تحقق من الصلاحيات/RLS)')
    }
  }

  const handleUpdateStop = async (formData: FormData) => {
    if (!editingStop) return

    try {
      const stopName = formData.get('name') as string
      const description = formData.get('description') as string
      const lat = parseFloat(formData.get('lat') as string)
      const lng = parseFloat(formData.get('lng') as string)

      if (!stopName.trim() || isNaN(lat) || isNaN(lng)) {
        toast.error('يرجى ملء جميع الحقول بشكل صحيح')
        return
      }

      const { error } = await supabase
        .from('route_stop_points')
        .update({
          name: stopName.trim(),
          description: description.trim() || null,
          lat,
          lng,
        })
        .eq('id', editingStop.id)

      if (error) throw error

      toast.success('تم تحديث نقطة التوقف بنجاح')
      setEditingStop(null)
      if (selectedRoute) {
        loadRouteStops(selectedRoute.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحديث نقطة التوقف')
    }
  }

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm('هل أنت متأكد من حذف نقطة التوقف؟')) return

    try {
      const { error } = await supabase
        .from('route_stop_points')
        .delete()
        .eq('id', stopId)

      if (error) throw error

      toast.success('تم حذف نقطة التوقف بنجاح')
      if (selectedRoute) {
        loadRouteStops(selectedRoute.id)
      }
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حذف نقطة التوقف')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">جاري تحميل الخطوط...</p>
        </div>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="text-center py-8">
          <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد خطوط مربوطة</h3>
          <p className="text-sm text-gray-600">
            لم يتم ربط أي خطوط بك. يرجى التواصل مع الإدارة لربط الخطوط المناسبة.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Routes List */}
      <div className="grid gap-3 sm:gap-4 lg:gap-6">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1">{route.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-2">{route.description}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="flex items-center gap-1 text-gray-700">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="truncate">{route.start_location_name}</span>
                  </span>
                  <span className="hidden sm:block text-gray-400">→</span>
                  <span className="flex items-center gap-1 text-gray-700">
                    <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="truncate">{route.end_location_name}</span>
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedRoute(route)
                  loadRouteStops(route.id)
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectedRoute?.id === route.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                {selectedRoute?.id === route.id ? 'مختار' : 'عرض التفاصيل'}
              </button>
            </div>

            {/* Route Stops - Show only for selected route */}
            {selectedRoute?.id === route.id && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm sm:text-base font-semibold text-gray-800">نقاط التوقف:</h4>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => setShowStartPicker(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-bold"
                      title="تحديد نقطة الانطلاق"
                    >
                      <Flag className="w-4 h-4 text-green-700" />
                      نقطة الانطلاق
                    </button>
                    <button
                      onClick={() => setShowEndPicker(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-sm font-bold"
                      title="تحديد نقطة الوصول"
                    >
                      <CornerDownLeft className="w-4 h-4 text-red-700" />
                      نقطة الوصول
                    </button>
                    <button
                      onClick={() => setShowStopPicker(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                      title="إضافة نقطة توقف من الخريطة"
                    >
                      <MapPin className="w-4 h-4" />
                      إضافة من الخريطة
                    </button>
                    <button
                      onClick={() => setShowAddStop(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      title="إضافة نقطة توقف يدوياً"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة يدوياً
                    </button>
                  </div>
                </div>

                {/* Route map preview */}
                <div className="mb-4">
                  <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold text-gray-800">معاينة المسار على الخريطة</p>
                      {!apiKey && (
                        <span className="text-[11px] sm:text-xs px-2 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800">
                          مفتاح Google Maps غير موجود
                        </span>
                      )}
                    </div>
                    <div ref={mapRef} className="w-full h-[260px] sm:h-[340px]" />
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs text-gray-500">
                    الخط: {route.start_location_name} → {route.end_location_name} (تظهر نقاط التوقف كرمز باص)
                  </p>
                </div>

                {routeStops.length > 0 ? (
                  <div className="space-y-3">
                    {routeStops.map((stop, index) => (
                      <div key={stop.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 truncate">{stop.name}</h5>
                            {stop.description && (
                              <p className="text-xs text-gray-600 truncate">{stop.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingStop(stop)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="تعديل"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStop(stop.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <RouteIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">لا توجد نقاط توقف محددة لهذا الخط</p>
                    <p className="text-xs text-gray-500 mt-1">اضغط على "إضافة نقطة توقف" لبدء إضافة النقاط</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Stop Modal */}
      {showAddStop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">إضافة نقطة توقف جديدة</h3>
              <form action={handleAddStop} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">اسم نقطة التوقف</label>
                  <input
                    name="name"
                    required
                    placeholder="مثال: محطة وقوف رقم 1"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">الوصف (اختياري)</label>
                  <input
                    name="description"
                    placeholder="وصف إضافي لنقطة التوقف"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">خط العرض</label>
                    <input
                      name="lat"
                      type="number"
                      step="any"
                      required
                      placeholder="32.5456"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">خط الطول</label>
                    <input
                      name="lng"
                      type="number"
                      step="any"
                      required
                      placeholder="35.825"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
                  >
                    إضافة نقطة التوقف
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStop(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stop Modal */}
      {editingStop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">تعديل نقطة التوقف</h3>
              <form action={handleUpdateStop} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">اسم نقطة التوقف</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingStop.name}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">الوصف (اختياري)</label>
                  <input
                    name="description"
                    defaultValue={editingStop.description || ''}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">خط العرض</label>
                    <input
                      name="lat"
                      type="number"
                      step="any"
                      required
                      defaultValue={editingStop.lat}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">خط الطول</label>
                    <input
                      name="lng"
                      type="number"
                      step="any"
                      required
                      defaultValue={editingStop.lng}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStop(null)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stop Picker Modal (Map) */}
      {showStopPicker && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">إضافة نقطة توقف من الخريطة</h3>
                <button
                  type="button"
                  onClick={() => setShowStopPicker(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إغلاق
                </button>
              </div>
              <StopPointSelector
                title={`اختر نقطة توقف للخط: ${selectedRoute.name}`}
                onSelect={addStopFromMap}
              />
            </div>
          </div>
        </div>
      )}

      {/* Start Point Picker */}
      {showStartPicker && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">تحديد نقطة الانطلاق</h3>
                <button
                  type="button"
                  onClick={() => setShowStartPicker(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إغلاق
                </button>
              </div>
              <LocationSelector
                title={`نقطة الانطلاق للخط: ${selectedRoute.name}`}
                initial={{
                  name: selectedRoute.start_location_name,
                  lat: selectedRoute.start_lat,
                  lng: selectedRoute.start_lng,
                }}
                onSelect={(p) => updateRoutePoint('start', p)}
              />
            </div>
          </div>
        </div>
      )}

      {/* End Point Picker */}
      {showEndPicker && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">تحديد نقطة الوصول</h3>
                <button
                  type="button"
                  onClick={() => setShowEndPicker(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إغلاق
                </button>
              </div>
              <LocationSelector
                title={`نقطة الوصول للخط: ${selectedRoute.name}`}
                initial={{
                  name: selectedRoute.end_location_name,
                  lat: selectedRoute.end_lat,
                  lng: selectedRoute.end_lng,
                }}
                onSelect={(p) => updateRoutePoint('end', p)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}
