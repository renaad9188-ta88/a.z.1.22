'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDateTime } from '@/lib/date-utils'
import RouteStopsMap, { type BuilderStop } from './RouteStopsMap'
import RouteStopsEditor from './RouteStopsEditor'
import TripBatchCreator from './TripBatchCreator'

type StopKind = 'pickup' | 'dropoff' | 'both'

type RouteStopRow = {
  id: string
  route_id: string
  name: string
  lat: number
  lng: number
  order_index: number
  is_active: boolean
  stop_kind?: StopKind | null
  image_url?: string | null
}

export default function RouteInlineBuilder({
  route,
  tripType,
  onCreatedTrips,
}: {
  route: {
    id: string
    start_location_name: string
    start_lat: number
    start_lng: number
    end_location_name: string
    end_lat: number
    end_lng: number
  }
  tripType: 'arrival' | 'departure'
  onCreatedTrips?: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  const stopKindForTrip: StopKind = tripType === 'departure' ? 'pickup' : 'dropoff'
  const title = tripType === 'departure' ? 'محطات الصعود (المغادرون)' : 'محطات النزول (القادمون)'
  const color = tripType === 'departure' ? '#8B5CF6' : '#3B82F6'
  const colorClass = tripType === 'departure' ? 'text-purple-700' : 'text-blue-700'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stops, setStops] = useState<RouteStopRow[]>([])
  const [addMode, setAddMode] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const loadStops = async () => {
    try {
      setLoading(true)
      // First try with stop_kind
      try {
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,lat,lng,order_index,is_active,stop_kind,image_url')
          .eq('route_id', route.id)
          .eq('is_active', true)
          .in('stop_kind', [stopKindForTrip, 'both'] as any)
          .order('order_index', { ascending: true })
        if (error) throw error
        setStops(((data as any) || []) as RouteStopRow[])
      } catch {
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,lat,lng,order_index,is_active,image_url')
          .eq('route_id', route.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        if (error) throw error
        setStops(((data as any) || []) as RouteStopRow[])
      }
    } catch (e: any) {
      console.error('RouteInlineBuilder loadStops error:', e)
      setStops([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id, tripType])

  const visibleStops = useMemo(() => {
    return (stops || []).slice().sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [stops])

  const builderStops: BuilderStop[] = useMemo(() => {
    return visibleStops.map((s) => ({
      id: s.id,
      name: s.name,
      lat: Number(s.lat),
      lng: Number(s.lng),
      order_index: Number(s.order_index || 0),
    }))
  }, [visibleStops])

  const onAddStop = async (p: { name: string; lat: number; lng: number }) => {
    try {
      setSaving(true)
      const nextIdx = visibleStops.reduce((m, s) => Math.max(m, Number(s.order_index || 0)), -1) + 1
      const { error } = await supabase.from('route_stop_points').insert({
        route_id: route.id,
        name: p.name,
        description: null,
        lat: p.lat,
        lng: p.lng,
        order_index: nextIdx,
        is_active: true,
        stop_kind: stopKindForTrip,
      } as any)
      if (error) throw error
      await loadStops()
      setLastSavedAt(new Date())
      toast.success('تم حفظ المحطة')
    } catch (e: any) {
      console.error('add stop error:', e)
      toast.error(e?.message || 'تعذر إضافة المحطة')
    } finally {
      setSaving(false)
      setAddMode(false)
    }
  }

  const onStopDrag = async (stopId: string, newLat: number, newLng: number) => {
    try {
      setSaving(true)
      const geocoder = new (window as any).google.maps.Geocoder()
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, async (results: any[], status: string) => {
        const newName = status === 'OK' && results && results[0] ? results[0].formatted_address : undefined
        const updateData: any = {
          lat: newLat,
          lng: newLng,
          updated_at: new Date().toISOString(),
        }
        if (newName) {
          updateData.name = newName
        }
        const { error } = await supabase.from('route_stop_points').update(updateData).eq('id', stopId)
        if (error) throw error
        await loadStops()
        setLastSavedAt(new Date())
        toast.success('تم حفظ التغييرات')
      })
    } catch (e: any) {
      console.error('drag stop error:', e)
      toast.error(e?.message || 'تعذر تحديث موقع المحطة')
    } finally {
      setSaving(false)
    }
  }

  const move = async (index: number, dir: -1 | 1) => {
    const list = visibleStops
    const other = list[index + dir]
    if (!other) return
    try {
      setSaving(true)
      const a = list[index]
      const b = other
      const { error: e1 } = await supabase.from('route_stop_points').update({ order_index: b.order_index } as any).eq('id', a.id)
      const { error: e2 } = await supabase.from('route_stop_points').update({ order_index: a.order_index } as any).eq('id', b.id)
      if (e1) throw e1
      if (e2) throw e2
      await loadStops()
      setLastSavedAt(new Date())
      toast.success('تم حفظ الترتيب')
    } catch (e: any) {
      console.error('move stop error:', e)
      toast.error(e?.message || 'تعذر تغيير الترتيب')
    } finally {
      setSaving(false)
    }
  }

  const edit = async (index: number) => {
    const s = visibleStops[index]
    if (!s?.id) return
    const name = prompt('اسم المحطة:', s.name)
    if (!name) return
    try {
      setSaving(true)
      const { error } = await supabase.from('route_stop_points').update({ name, updated_at: new Date().toISOString() } as any).eq('id', s.id)
      if (error) throw error
      await loadStops()
      setLastSavedAt(new Date())
      toast.success('تم حفظ التعديل')
    } catch (e: any) {
      console.error('edit stop error:', e)
      toast.error(e?.message || 'تعذر تعديل المحطة')
    } finally {
      setSaving(false)
    }
  }

  const del = async (index: number) => {
    const s = visibleStops[index]
    if (!s?.id) return
    if (!confirm('حذف هذه المحطة؟')) return
    try {
      setSaving(true)
      const { error } = await supabase.from('route_stop_points').delete().eq('id', s.id)
      if (error) throw error
      await loadStops()
      setLastSavedAt(new Date())
      toast.success('تم حذف المحطة')
    } catch (e: any) {
      console.error('delete stop error:', e)
      toast.error(e?.message || 'تعذر حذف المحطة')
    } finally {
      setSaving(false)
    }
  }

  const onImageUpload = async (stopId: string, imageUrl: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('route_stop_points')
        .update({ image_url: imageUrl || null, updated_at: new Date().toISOString() } as any)
        .eq('id', stopId)
      if (error) throw error
      await loadStops()
      setLastSavedAt(new Date())
      toast.success('تم حفظ الصورة')
    } catch (e: any) {
      console.error('update stop image error:', e)
      toast.error(e?.message || 'تعذر تحديث الصورة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4 space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RouteStopsMap
          title={`الخريطة + خط متصل (${tripType === 'arrival' ? 'القادمين' : 'المغادرين'})`}
          apiKey={apiKey}
          routeStart={{ name: route.start_location_name, lat: route.start_lat, lng: route.start_lng }}
          routeEnd={{ name: route.end_location_name, lat: route.end_lat, lng: route.end_lng }}
          stops={builderStops}
          polylineColor={color}
          addMode={addMode}
          onAddStop={onAddStop}
          onStopDrag={onStopDrag}
          lastSavedAt={lastSavedAt}
        />

        <div className="space-y-3">
          {/* قسم إدارة المحطات */}
          <div>
            <h3 className="text-sm font-extrabold text-gray-700 mb-3 px-1">
              إدارة محطات النزول
            </h3>
            <RouteStopsEditor
              title={title}
              colorClass={colorClass}
              stops={visibleStops.map((s) => ({ id: s.id, name: s.name, image_url: s.image_url }))}
              addMode={addMode}
              onToggleAddMode={() => setAddMode((p) => !p)}
              onMove={move}
              onEdit={edit}
              onDelete={del}
              onImageUpload={onImageUpload}
            />
          </div>
        </div>
      </div>

      {/* خط فاصل واضح بين قسم المحطات وقسم إنشاء الرحلات */}
      <div className="my-8 border-t-2 border-gray-300"></div>

      {/* قسم إنشاء الرحلات */}
      <div className="mt-8">
        <h3 className="text-sm font-extrabold text-gray-700 mb-3 px-1">
          إنشاء رحلات متعددة
        </h3>
        <TripBatchCreator
          routeId={route.id}
          tripType={tripType}
          start={{ name: route.start_location_name, lat: route.start_lat, lng: route.start_lng }}
          end={{ name: route.end_location_name, lat: route.end_lat, lng: route.end_lng }}
          colorClass={colorClass}
          onCreated={onCreatedTrips}
        />
      </div>

      {(loading || saving) && (
        <div className="text-center text-xs text-gray-500 font-bold mt-4">
          {loading ? 'جاري تحميل...' : 'جارٍ حفظ التغييرات...'}
        </div>
      )}
    </div>
  )
}


