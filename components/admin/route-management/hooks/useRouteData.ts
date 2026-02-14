import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Route, Driver, RouteDriver, DriverAccount, DriverLiveLite } from '../types'

export function useRouteData() {
  const supabase = createSupabaseBrowserClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routeDrivers, setRouteDrivers] = useState<RouteDriver[]>([])
  const [driverAccounts, setDriverAccounts] = useState<DriverAccount[]>([])
  const [driverLiveMap, setDriverLiveMap] = useState<Record<string, DriverLiveLite | null>>({})
  const [loading, setLoading] = useState(true)
  const [createRouteId, setCreateRouteId] = useState<string>('')

  const loadData = async () => {
    try {
      setLoading(true)
      const [routesRes, driversRes, routeDriversRes, driverAccountsRes] = await Promise.all([
        supabase.from('routes').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('route_drivers').select('*, driver:drivers(*)').eq('is_active', true),
        supabase.from('profiles').select('user_id, full_name, phone, role').order('updated_at', { ascending: false }),
      ])

      if (routesRes.error) throw routesRes.error
      if (driversRes.error) throw driversRes.error
      if (routeDriversRes.error) throw routeDriversRes.error
      if (driverAccountsRes.error) throw driverAccountsRes.error

      setRoutes(routesRes.data || [])
      setDrivers(driversRes.data || [])
      setRouteDrivers(routeDriversRes.data || [])
      setDriverAccounts((driverAccountsRes.data || []) as any)
      if (!createRouteId && (routesRes.data || []).length > 0) {
        setCreateRouteId((routesRes.data || [])[0].id)
      }

      // Load availability status for all drivers
      const ids = (driversRes.data || []).map((d: any) => d.id).filter(Boolean)
      if (ids.length > 0) {
        const { data: liveRows } = await supabase
          .from('driver_live_status')
          .select('driver_id,is_available,updated_at')
          .in('driver_id', ids)
        const map: Record<string, DriverLiveLite | null> = {}
        ;(liveRows || []).forEach((r: any) => {
          map[r.driver_id] = {
            driver_id: r.driver_id,
            is_available: Boolean(r.is_available),
            updated_at: r.updated_at,
          }
        })
        setDriverLiveMap(map)
      } else {
        setDriverLiveMap({})
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const refreshDriverLive = async () => {
    try {
      const ids = (drivers || []).map((d: any) => d.id).filter(Boolean)
      if (ids.length === 0) return
      const { data: liveRows } = await supabase
        .from('driver_live_status')
        .select('driver_id,is_available,updated_at')
        .in('driver_id', ids)
      const map: Record<string, DriverLiveLite | null> = {}
      ;(liveRows || []).forEach((r: any) => {
        map[r.driver_id] = {
          driver_id: r.driver_id,
          is_available: Boolean(r.is_available),
          updated_at: r.updated_at,
        }
      })
      setDriverLiveMap((prev) => ({ ...prev, ...map }))
    } catch {
      // avoid toast spam
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      refreshDriverLive()
    }, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers.length])

  return {
    routes,
    drivers,
    routeDrivers,
    driverAccounts,
    driverLiveMap,
    loading,
    createRouteId,
    setCreateRouteId,
    refreshDriverLive,
    reloadData: loadData,
  }
}


