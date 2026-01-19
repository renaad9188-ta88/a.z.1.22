'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, MapPin, Users, Navigation } from 'lucide-react'

type TripRow = {
  id: string
  visitor_name: string
  companions_count: number | null
  city: string
  arrival_date: string | null
  trip_status: string | null
  route_id: string | null
}

type RouteRow = { id: string; name: string; start_location_name: string; end_location_name: string }

export default function DriverTripSchedule() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState<TripRow[]>([])
  const [routesMap, setRoutesMap] = useState<Record<string, RouteRow>>({})

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: driverRow, error: driverErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (driverErr) throw driverErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق. يرجى التواصل مع الإدارة.')
        setTrips([])
        return
      }

      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)
      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setTrips([])
        return
      }

      // Load routes info for names
      const { data: routesData } = await supabase
        .from('routes')
        .select('id,name,start_location_name,end_location_name')
        .in('id', routeIds)
      const map: Record<string, RouteRow> = {}
      ;(routesData || []).forEach((r: any) => (map[r.id] = r))
      setRoutesMap(map)

      const { data: tripsData, error: tripsErr } = await supabase
        .from('visit_requests')
        .select('id,visitor_name,companions_count,city,arrival_date,trip_status,route_id')
        .eq('status', 'approved')
        .in('route_id', routeIds)
        .in('trip_status', ['scheduled_pending_approval', 'pending_arrival', 'arrived'])
        .order('arrival_date', { ascending: true })
      if (tripsErr) throw tripsErr

      setTrips((tripsData || []) as any)
    } catch (e: any) {
      console.error('DriverTripSchedule load error:', e)
      toast.error(e?.message || 'تعذر تحميل جدول الرحلات')
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, TripRow[]> = {}
    for (const t of trips) {
      const key = t.arrival_date || 'بدون موعد'
      if (!groups[key]) groups[key] = []
      groups[key].push(t)
    }
    return Object.entries(groups).sort(([a], [b]) => (a > b ? 1 : -1))
  }, [trips])

  const peopleCount = (t: TripRow) => 1 + (Number(t.companions_count || 0) || 0)

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">جاري تحميل جدول الرحلات...</p>
        </div>
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد رحلات مجدولة</h3>
          <p className="text-sm text-gray-600">عندما يحدد الإدمن مواعيد رحلات على خطوطك ستظهر هنا تلقائياً.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          جدول رحلاتي
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          الكشف حسب يوم القدوم (الموعد) — اضغط على راكب لعرض التفاصيل أو تتبع الرحلة
        </p>
      </div>

      {grouped.map(([date, list]) => (
        <div key={date} className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-extrabold text-gray-900">{date}</h4>
              <p className="text-xs text-gray-600 mt-1">عدد الركاب: {list.length}</p>
            </div>
          </div>

          <div className="space-y-2">
            {list.map((t) => {
              const route = t.route_id ? routesMap[t.route_id] : null
              return (
                <div key={t.id} className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 truncate">{t.visitor_name}</div>
                    <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {peopleCount(t)} أشخاص
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {t.city}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="w-4 h-4" />
                        {t.trip_status || 'غير محددة'}
                      </span>
                      {route && (
                        <span className="text-gray-500">
                          الخط: {route.start_location_name} → {route.end_location_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/driver/passenger/${t.id}`}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition text-xs sm:text-sm font-bold"
                    >
                      التفاصيل
                    </Link>
                    <Link
                      href={`/driver/passenger/${t.id}/track`}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-bold"
                    >
                      تتبع
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}


