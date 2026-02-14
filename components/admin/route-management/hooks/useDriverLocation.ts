import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Driver, DriverLocationLite } from '../types'

export function useDriverLocation() {
  const supabase = createSupabaseBrowserClient()
  const [driverLocLoading, setDriverLocLoading] = useState<Record<string, boolean>>({})
  const [driverLastLoc, setDriverLastLoc] = useState<Record<string, DriverLocationLite | null>>({})
  const [driverLocHistory, setDriverLocHistory] = useState<Record<string, DriverLocationLite[]>>({})

  const loadDriverLastLocation = async (driverRow: Driver) => {
    try {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: true }))
      
      // أولاً: جرب قراءة من driver_live_status (النظام الجديد - "متاح")
      const { data: liveStatus, error: liveErr } = await supabase
        .from('driver_live_status')
        .select('lat,lng,is_available,updated_at')
        .eq('driver_id', driverRow.id)
        .maybeSingle()
      
      if (!liveErr && liveStatus && liveStatus.is_available && liveStatus.lat && liveStatus.lng) {
        // السائق متاح وله موقع مباشر
        setDriverLastLoc((p) => ({ 
          ...p, 
          [driverRow.id]: {
            lat: liveStatus.lat,
            lng: liveStatus.lng,
            updated_at: liveStatus.updated_at,
            request_id: null,
            is_available: true
          }
        }))
        toast.success(`السائق متاح - آخر تحديث: ${new Date(liveStatus.updated_at).toLocaleString('ar-JO')}`)
        return
      }

      // Fallback: جرب trip_driver_locations (النظام القديم - مرتبط بـ request_id)
      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)
      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setDriverLastLoc((p) => ({ ...p, [driverRow.id]: null }))
        toast('لا توجد خطوط مربوطة بهذا السائق بعد.')
        return
      }

      const { data: reqRows, error: reqErr } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .limit(100)
      if (reqErr) throw reqErr
      const requestIds = (reqRows || []).map((r: any) => r.id).filter(Boolean)
      if (requestIds.length === 0) {
        setDriverLastLoc((p) => ({ ...p, [driverRow.id]: null }))
        toast('لا توجد رحلات نشطة لهذا السائق حالياً. اطلب من السائق تفعيل "متاح" في لوحة السائق.')
        return
      }

      const { data: locRow, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('lat,lng,updated_at,request_id')
        .in('request_id', requestIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (locErr) throw locErr

      setDriverLastLoc((p) => ({ ...p, [driverRow.id]: (locRow as any) || null }))
      if (!locRow) {
        toast('لا يوجد موقع مُسجل بعد. اطلب من السائق تفعيل "متاح" في لوحة السائق أو تشغيل التتبع داخل صفحة تتبع رحلة راكب.')
      }
    } catch (e: any) {
      console.error('loadDriverLastLocation error:', e)
      toast.error(e?.message || 'تعذر جلب آخر موقع للسائق')
    } finally {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: false }))
    }
  }

  const loadDriverLocationHistory = async (driverRow: Driver) => {
    try {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: true }))
      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)
      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setDriverLocHistory((p) => ({ ...p, [driverRow.id]: [] }))
        toast('لا توجد خطوط مربوطة بهذا السائق بعد.')
        return
      }

      const { data: reqRows, error: reqErr } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .limit(100)
      if (reqErr) throw reqErr
      const requestIds = (reqRows || []).map((r: any) => r.id).filter(Boolean)
      if (requestIds.length === 0) {
        setDriverLocHistory((p) => ({ ...p, [driverRow.id]: [] }))
        toast('لا توجد رحلات نشطة لهذا السائق حالياً.')
        return
      }

      const { data: locRows, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('lat,lng,updated_at,request_id')
        .in('request_id', requestIds)
        .order('updated_at', { ascending: false })
        .limit(20)
      if (locErr) throw locErr

      setDriverLocHistory((p) => ({ ...p, [driverRow.id]: ((locRows as any) || []) as any }))
      return (locRows as any) || []
    } catch (e: any) {
      console.error('loadDriverLocationHistory error:', e)
      toast.error(e?.message || 'تعذر جلب سجل حركة السائق')
      return []
    } finally {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: false }))
    }
  }

  return {
    driverLocLoading,
    driverLastLoc,
    driverLocHistory,
    loadDriverLastLocation,
    loadDriverLocationHistory,
  }
}


