import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { RouteStopRow, StopKind } from '../types'

export function useRouteStops(routeId: string, tripType: 'arrival' | 'departure', stopKindForTrip: StopKind) {
  const supabase = createSupabaseBrowserClient()
  const [routeStops, setRouteStops] = useState<RouteStopRow[]>([])
  const [routeStopsLoading, setRouteStopsLoading] = useState(false)
  const [editingRouteStops, setEditingRouteStops] = useState(false)

  const loadRouteStops = async () => {
    try {
      setRouteStopsLoading(true)
      try {
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,lat,lng,order_index,is_active,stop_kind')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .in('stop_kind', [stopKindForTrip, 'both'] as any)
          .order('order_index', { ascending: true })
        if (error) throw error
        setRouteStops(((data as any) || []) as RouteStopRow[])
      } catch {
        // Backward compatibility
        const { data, error } = await supabase
          .from('route_stop_points')
          .select('id,route_id,name,lat,lng,order_index,is_active')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        if (error) throw error
        setRouteStops(((data as any) || []) as RouteStopRow[])
      }
    } catch (e: any) {
      console.error('loadRouteStops error:', e)
      setRouteStops([])
    } finally {
      setRouteStopsLoading(false)
    }
  }

  useEffect(() => {
    loadRouteStops()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, tripType])

  const moveInList = async (index: number, dir: -1 | 1) => {
    const list = routeStops
    const other = list[index + dir]
    if (!other) return
    try {
      const a = list[index]
      const b = other
      const { error: e1 } = await supabase.from('route_stop_points').update({ order_index: b.order_index } as any).eq('id', a.id)
      const { error: e2 } = await supabase.from('route_stop_points').update({ order_index: a.order_index } as any).eq('id', b.id)
      if (e1) throw e1
      if (e2) throw e2
      await loadRouteStops()
    } catch (e: any) {
      console.error('route stop reorder error:', e)
      toast.error(e?.message || 'تعذر تغيير ترتيب المحطات')
    }
  }

  const editName = async (index: number) => {
    const cur = routeStops[index]
    const name = prompt('اسم المحطة:', cur?.name || '')
    if (!name || !cur?.id) return
    try {
      const { error } = await supabase
        .from('route_stop_points')
        .update({ name, updated_at: new Date().toISOString() } as any)
        .eq('id', cur.id)
      if (error) throw error
      await loadRouteStops()
    } catch (e: any) {
      console.error('edit route stop error:', e)
      toast.error(e?.message || 'تعذر تعديل المحطة')
    }
  }

  const removeStop = async (index: number) => {
    const cur = routeStops[index]
    if (!cur?.id) return
    if (!confirm('حذف هذه المحطة من الخط؟')) return
    try {
      const { error } = await supabase.from('route_stop_points').delete().eq('id', cur.id)
      if (error) throw error
      await loadRouteStops()
    } catch (e: any) {
      console.error('delete route stop error:', e)
      toast.error(e?.message || 'تعذر حذف المحطة')
    }
  }

  return {
    routeStops,
    routeStopsLoading,
    editingRouteStops,
    setEditingRouteStops,
    loadRouteStops,
    moveInList,
    editName,
    removeStop,
  }
}

