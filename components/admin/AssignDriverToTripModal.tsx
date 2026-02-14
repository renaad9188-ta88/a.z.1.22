'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { X, Bus, Calendar, Clock, Navigation, Search } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

type RouteLite = { id: string; name: string }

type TripLite = {
  id: string
  route_id: string
  trip_type: 'arrival' | 'departure' | string | null
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  is_active: boolean
}

export default function AssignDriverToTripModal({
  driver,
  routes,
  initialTripType,
  onClose,
  onAssign,
}: {
  driver: { id: string; name: string }
  routes: RouteLite[]
  initialTripType: 'arrival' | 'departure'
  onClose: () => void
  onAssign: (trip: { id: string; route_id: string }) => Promise<void> | void
}) {
  const supabase = createSupabaseBrowserClient()
  const [tripType, setTripType] = useState<'arrival' | 'departure'>(initialTripType)
  const [routeId, setRouteId] = useState<string>('all')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingTripId, setSavingTripId] = useState<string | null>(null)
  const [trips, setTrips] = useState<TripLite[]>([])

  const routesMap = useMemo(() => {
    const m: Record<string, string> = {}
    routes.forEach((r) => (m[r.id] = r.name))
    return m
  }, [routes])

  const loadTrips = async () => {
    try {
      setLoading(true)
      const todayISO = new Date().toISOString().slice(0, 10)
      let query = supabase
        .from('route_trips')
        .select('id,route_id,trip_type,trip_date,meeting_time,departure_time,start_location_name,end_location_name,is_active')
        .eq('is_active', true)
        .gte('trip_date', todayISO)
        .eq('trip_type', tripType)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)

      if (routeId !== 'all') {
        query = query.eq('route_id', routeId)
      }

      const { data, error } = await query
      if (error) throw error
      setTrips(((data as any) || []) as TripLite[])
    } catch (e: any) {
      console.error('AssignDriverToTripModal loadTrips error:', e)
      toast.error(e?.message || 'تعذر تحميل الرحلات')
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripType, routeId])

  const filteredTrips = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return trips
    return trips.filter((t) => {
      const routeName = (routesMap[t.route_id] || '').toLowerCase()
      const a = (t.start_location_name || '').toLowerCase()
      const b = (t.end_location_name || '').toLowerCase()
      return routeName.includes(qq) || a.includes(qq) || b.includes(qq) || t.trip_date.includes(qq)
    })
  }, [q, trips, routesMap])

  const typeLabel = tripType === 'arrival' ? 'القادمون' : 'المغادرون'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-5 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-extrabold text-gray-900">تعيين السائق على رحلة ({typeLabel})</p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              السائق: <span className="font-bold text-gray-900">{driver.name}</span>
            </p>
            <p className="text-[11px] sm:text-xs text-gray-600 mt-1">
              لن تظهر هنا إلا رحلات <span className="font-bold">{typeLabel}</span> القادمة فقط (لا يوجد خلط).
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTripType('arrival')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold border ${
                  tripType === 'arrival' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                }`}
              >
                القادمون
              </button>
              <button
                type="button"
                onClick={() => setTripType('departure')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold border ${
                  tripType === 'departure' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                }`}
              >
                المغادرون
              </button>
            </div>

            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs sm:text-sm font-bold text-gray-900"
              title="فلترة حسب الخط"
            >
              <option value="all">كل الخطوط</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث باسم الخط أو المدينة أو التاريخ..."
              className="w-full pr-10 pl-3 py-2.5 rounded-lg border border-gray-300 text-sm"
            />
          </div>

          {loading ? (
            <div className="text-sm text-gray-600">جاري تحميل الرحلات...</div>
          ) : filteredTrips.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
              لا توجد رحلات قادمة لهذا النوع ضمن الفلتر الحالي.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTrips.map((t) => (
                <div key={t.id} className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                        {t.start_location_name} → {t.end_location_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] sm:text-xs text-gray-700">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 font-bold">
                          <Bus className="w-3.5 h-3.5 text-gray-600" />
                          {routesMap[t.route_id] || '—'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-100 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-blue-700" />
                          {formatDate(t.trip_date)}
                        </span>
                        {(t.departure_time || t.meeting_time) && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 font-bold">
                            <Clock className="w-3.5 h-3.5 text-gray-600" />
                            {String(t.departure_time || t.meeting_time).slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setSavingTripId(t.id)
                          await onAssign({ id: t.id, route_id: t.route_id })
                          toast.success('تم تعيين السائق على الرحلة')
                        } finally {
                          setSavingTripId(null)
                        }
                      }}
                      disabled={savingTripId === t.id}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Navigation className="w-4 h-4" />
                      {savingTripId === t.id ? 'جارٍ التعيين...' : 'تعيين'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


