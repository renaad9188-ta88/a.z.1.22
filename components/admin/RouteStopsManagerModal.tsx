'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { X, MapPin, Plus, ArrowUp, ArrowDown, Trash2, Edit } from 'lucide-react'
import LocationSelector from '@/components/driver/LocationSelector'

type StopKind = 'pickup' | 'dropoff' | 'both'

type RouteLite = {
  id: string
  name: string
  start_location_name?: string
  end_location_name?: string
}

type RouteStopRow = {
  id: string
  route_id: string
  name: string
  description: string | null
  lat: number
  lng: number
  order_index: number
  is_active: boolean
  stop_kind?: StopKind | null
}

export default function RouteStopsManagerModal({
  route,
  initialTab = 'dropoff',
  onClose,
}: {
  route: RouteLite
  initialTab?: StopKind
  onClose: () => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<StopKind>(initialTab)
  const [stops, setStops] = useState<RouteStopRow[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [editing, setEditing] = useState<RouteStopRow | null>(null)
  const [pendingKind, setPendingKind] = useState<StopKind>(initialTab)

  const tabLabel = (k: StopKind) => (k === 'pickup' ? 'محطات الصعود (مغادرون)' : k === 'dropoff' ? 'محطات النزول (قادمون)' : 'محطات مشتركة')

  const loadStops = async () => {
    try {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,description,lat,lng,order_index,is_active,stop_kind')
          .eq('route_id', route.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        if (error) throw error
        setStops((data as any) || [])
      } catch {
        // Backward compatibility if stop_kind is not migrated yet
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,description,lat,lng,order_index,is_active')
          .eq('route_id', route.id)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        if (error) throw error
        setStops((data as any) || [])
      }
    } catch (e: any) {
      console.error('loadStops error:', e)
      toast.error(e?.message || 'تعذر تحميل محطات الخط')
      setStops([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id])

  const visibleStops = useMemo(() => {
    const kind = tab
    return (stops || [])
      .filter((s) => ((s.stop_kind as any) || 'both') === kind)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [stops, tab])

  const nextOrderIndexForKind = (kind: StopKind) => {
    const list = (stops || []).filter((s) => ((s.stop_kind as any) || 'both') === kind)
    const max = list.reduce((m, s) => Math.max(m, Number(s.order_index || 0)), -1)
    return max + 1
  }

  const upsertStop = async (point: { name: string; lat: number; lng: number }) => {
    try {
      setSaving(true)
      const kind = pendingKind

      if (editing) {
        const { error } = await supabase
          .from('route_stop_points')
          .update({
            name: point.name,
            lat: point.lat,
            lng: point.lng,
            stop_kind: kind,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', editing.id)
        if (error) throw error
        toast.success('تم تحديث المحطة')
      } else {
        const { error } = await supabase.from('route_stop_points').insert({
          route_id: route.id,
          name: point.name,
          description: null,
          lat: point.lat,
          lng: point.lng,
          order_index: nextOrderIndexForKind(kind),
          is_active: true,
          stop_kind: kind,
        } as any)
        if (error) throw error
        toast.success('تمت إضافة المحطة')
      }

      setShowPicker(false)
      setEditing(null)
      await loadStops()
    } catch (e: any) {
      console.error('upsertStop error:', e)
      toast.error(e?.message || 'تعذر حفظ المحطة')
    } finally {
      setSaving(false)
    }
  }

  const deleteStop = async (stopId: string) => {
    if (!confirm('حذف هذه المحطة؟')) return
    try {
      setSaving(true)
      const { error } = await supabase.from('route_stop_points').delete().eq('id', stopId)
      if (error) throw error
      toast.success('تم حذف المحطة')
      await loadStops()
    } catch (e: any) {
      console.error('deleteStop error:', e)
      toast.error(e?.message || 'تعذر حذف المحطة')
    } finally {
      setSaving(false)
    }
  }

  const move = async (stopId: string, dir: -1 | 1) => {
    const list = visibleStops
    const idx = list.findIndex((s) => s.id === stopId)
    if (idx < 0) return
    const other = list[idx + dir]
    if (!other) return

    try {
      setSaving(true)
      const a = list[idx]
      const b = other
      const { error: e1 } = await supabase.from('route_stop_points').update({ order_index: b.order_index } as any).eq('id', a.id)
      const { error: e2 } = await supabase.from('route_stop_points').update({ order_index: a.order_index } as any).eq('id', b.id)
      if (e1) throw e1
      if (e2) throw e2
      await loadStops()
    } catch (e: any) {
      console.error('move stop error:', e)
      toast.error(e?.message || 'تعذر تغيير ترتيب المحطات')
    } finally {
      setSaving(false)
    }
  }

  const openAdd = (k: StopKind) => {
    setPendingKind(k)
    setEditing(null)
    setShowPicker(true)
  }

  const openEdit = (s: RouteStopRow) => {
    setPendingKind(((s.stop_kind as any) || 'both') as StopKind)
    setEditing(s)
    setShowPicker(true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full mx-4 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">محطات الخط: {route.name}</h3>
            <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
              افصل محطات <span className="font-extrabold">الصعود</span> عن <span className="font-extrabold">النزول</span> حتى لا يحدث خلط أثناء الحجز.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition" title="إغلاق">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-2xl p-1 w-full lg:w-auto">
              {(['dropoff', 'pickup', 'both'] as StopKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition w-full lg:w-auto ${
                    tab === k ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-white'
                  }`}
                >
                  {tabLabel(k)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openAdd(tab)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-extrabold inline-flex items-center gap-2"
              disabled={saving}
            >
              <Plus className="w-4 h-4" />
              إضافة محطة
            </button>
          </div>

          {loading ? (
            <div className="text-center py-10 text-sm text-gray-600">جاري التحميل...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleStops.map((s, idx) => (
                <div key={s.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <p className="font-extrabold text-gray-900 truncate">{s.name}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-600">
                        <span className="font-bold">إحداثيات:</span> <span lang="en" dir="ltr">{Number(s.lat).toFixed(5)}, {Number(s.lng).toFixed(5)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => move(s.id, -1)}
                        className="p-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                        title="أعلى"
                        disabled={saving || idx === 0}
                      >
                        <ArrowUp className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(s.id, 1)}
                        className="p-2 rounded-lg hover:bg-gray-50 border border-gray-200"
                        title="أسفل"
                        disabled={saving || idx === visibleStops.length - 1}
                      >
                        <ArrowDown className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-lg hover:bg-blue-50 border border-blue-200"
                        title="تعديل"
                        disabled={saving}
                      >
                        <Edit className="w-4 h-4 text-blue-700" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStop(s.id)}
                        className="p-2 rounded-lg hover:bg-red-50 border border-red-200"
                        title="حذف"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4 text-red-700" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {visibleStops.length === 0 && (
                <div className="md:col-span-2 text-center py-10 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-600">
                  لا توجد محطات ضمن هذا القسم.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Picker */}
        {showPicker && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-3 sm:p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-extrabold text-gray-900">
                    {editing ? 'تعديل محطة' : 'إضافة محطة'} — {tabLabel(pendingKind)}
                  </p>
                  <div className="mt-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">نوع المحطة</label>
                    <select
                      value={pendingKind}
                      onChange={(e) => setPendingKind(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-extrabold text-gray-900"
                      disabled={saving}
                    >
                      <option value="dropoff">نزول (قادمون)</option>
                      <option value="pickup">صعود (مغادرون)</option>
                      <option value="both">مشتركة</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (saving) return
                    setShowPicker(false)
                    setEditing(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="إغلاق"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-3 text-[11px] sm:text-xs text-gray-600 font-semibold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  اختر الموقع من الخريطة ثم اضغط &quot;اعتماد الموقع&quot;.
                </div>
                <LocationSelector
                  title={editing ? 'تعديل المحطة' : 'محطة جديدة'}
                  selectionKind="stop"
                  initial={editing ? { name: editing.name, lat: editing.lat, lng: editing.lng } : null}
                  onSelect={upsertStop}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


