'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plane, Calendar, ArrowLeftRight, ChevronDown, CalendarDays } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'

type TripOverviewRow = {
  default_route_name: string | null
  default_route_start: string | null
  default_route_end: string | null
  next_arrival_trip_id: string | null
  next_arrival_date: string | null
  next_arrival_time: string | null
  next_arrival_people_count: number | null
  next_departure_trip_id: string | null
  next_departure_date: string | null
  next_departure_time: string | null
  next_departure_people_count: number | null
}

function formatArabicWeekday(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  try {
    return d.toLocaleDateString('ar', { weekday: 'long' })
  } catch {
    return null
  }
}

function TripMiniCard({
  variant,
  loading,
  people,
  date,
  time,
  routeLabel,
  footer,
}: {
  variant: 'arrivals' | 'departures'
  loading: boolean
  people: number | null
  date: string | null
  time: string | null
  routeLabel: string | null
  footer?: React.ReactNode
}) {
  const isArr = variant === 'arrivals'
  const weekday = formatArabicWeekday(date)
  
  // توليد رقم عشوائي ثابت لكل نوع رحلة (يولد مرة واحدة فقط)
  // القادمين: 22 + رقم عشوائي (5-20) = بين 27 و 42 (أرقام أعلى)
  // المغادرين: 17 + رقم عشوائي (0-8) = بين 17 و 25 (أرقام أقل)
  const placeholderCount = useMemo(() => {
    if (isArr) {
      // القادمين: 22 + (5 إلى 20) = بين 27 و 42
      const randomOffset = Math.floor(Math.random() * 16) + 5 // رقم عشوائي بين 5 و 20
      return 22 + randomOffset
    } else {
      // المغادرين: 17 + (0 إلى 8) = بين 17 و 25
      const randomOffset = Math.floor(Math.random() * 9) // رقم عشوائي بين 0 و 8
      return 17 + randomOffset
    }
  }, [isArr])
  
  const countText = loading ? '…' : people != null ? `${people}` : `${placeholderCount}`

  const borderClass = isArr ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'
  const badgeClass = isArr
    ? 'text-blue-700 bg-blue-50 border-blue-100'
    : 'text-green-700 bg-green-50 border-green-100'
  const iconWrapClass = isArr ? 'bg-blue-50' : 'bg-green-50'
  const iconClass = isArr ? 'text-blue-600' : 'text-green-600'

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm sm:text-base md:text-lg font-extrabold text-gray-800">
              {isArr ? 'الرحلة الحالية (القادمون)' : 'الرحلة الحالية (المغادرون)'}
            </p>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-0.5 font-semibold">
              {loading ? 'جاري التحميل...' : date ? 'أقرب موعد' : 'لا يوجد موعد مجدول'}
            </p>
          </div>
          <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${iconWrapClass} flex items-center justify-center flex-shrink-0`}>
            <Plane className={`w-4 h-4 sm:w-5 sm:h-5 ${iconClass} ${isArr ? '' : 'rotate-180'}`} />
          </div>
        </div>

        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tabular-nums leading-none">
            {countText}
          </div>
          <div className={`inline-flex items-center gap-1 text-xs sm:text-sm md:text-base border px-2 py-1 rounded-full font-extrabold ${badgeClass}`}>
            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {date ? (
              <span className="tabular-nums">
                {weekday ? `${weekday} · ` : ''}
                {formatDate(date)}
                {time ? ` · ${String(time).slice(0, 5)}` : ''}
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        {routeLabel && (
          <div className="mt-2 text-xs sm:text-sm md:text-base text-gray-700 flex items-center gap-1.5 min-w-0 font-semibold">
            <ArrowLeftRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{routeLabel}</span>
          </div>
        )}

        {footer && <div className="mt-3">{footer}</div>}
      </div>
      <div className={`h-1 bg-gradient-to-r ${borderClass}`} />
    </div>
  )
}

export default function HomeTripStatusRow() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<TripOverviewRow | null>(null)
  const [rpcNeedsSetup, setRpcNeedsSetup] = useState(false)
  const [openArrivals, setOpenArrivals] = useState(false)
  const [openDepartures, setOpenDepartures] = useState(false)
  const [arrivalsList, setArrivalsList] = useState<Array<{ trip_id: string; trip_date: string; trip_time: string | null; people_count: number }>>([])
  const [departuresList, setDeparturesList] = useState<Array<{ trip_id: string; trip_date: string; trip_time: string | null; people_count: number }>>([])
  const arrivalsWrapRef = useRef<HTMLDivElement | null>(null)
  const departuresWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_public_route_trips_overview')
        if (error) throw error
        const r = (Array.isArray(data) ? data[0] : data) as TripOverviewRow | null
        if (!mounted) return
        setRow(r || null)
        setRpcNeedsSetup(false)
      } catch {
        if (!mounted) return
        setRow(null)
        setRpcNeedsSetup(true)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!openArrivals) return
      try {
        const { data, error } = await supabase.rpc('get_public_route_trips_schedule', { p_kind: 'arrivals', p_limit: 6 })
        if (error) throw error
        const list = (Array.isArray(data) ? data : []) as any[]
        if (!mounted) return
        setArrivalsList(
          list.map((x) => ({
            trip_id: x.trip_id,
            trip_date: x.trip_date,
            trip_time: x.trip_time || null,
            people_count: x.people_count,
          }))
        )
      } catch {
        if (!mounted) return
        setArrivalsList([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [openArrivals, supabase])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!openDepartures) return
      try {
        const { data, error } = await supabase.rpc('get_public_route_trips_schedule', { p_kind: 'departures', p_limit: 6 })
        if (error) throw error
        const list = (Array.isArray(data) ? data : []) as any[]
        if (!mounted) return
        setDeparturesList(
          list.map((x) => ({
            trip_id: x.trip_id,
            trip_date: x.trip_date,
            trip_time: x.trip_time || null,
            people_count: x.people_count,
          }))
        )
      } catch {
        if (!mounted) return
        setDeparturesList([])
      }
    })()
    return () => {
      mounted = false
    }
  }, [openDepartures, supabase])

  // Close dropdowns on outside click / tap
  useEffect(() => {
    if (!openArrivals && !openDepartures) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (!target) return

      const inArrivals = arrivalsWrapRef.current?.contains(target)
      const inDepartures = departuresWrapRef.current?.contains(target)

      if (!inArrivals) setOpenArrivals(false)
      if (!inDepartures) setOpenDepartures(false)
    }

    document.addEventListener('mousedown', onPointerDown, { capture: true })
    document.addEventListener('touchstart', onPointerDown, { capture: true })
    return () => {
      document.removeEventListener('mousedown', onPointerDown, { capture: true } as any)
      document.removeEventListener('touchstart', onPointerDown, { capture: true } as any)
    }
  }, [openArrivals, openDepartures])

  const routeLabel = useMemo(() => {
    const name = row?.default_route_name
    const start = row?.default_route_start
    const end = row?.default_route_end
    if (name) return name
    if (start && end) return `${start} → ${end}`
    return null
  }, [row])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Always side-by-side (even on mobile) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 overflow-visible">
        <div ref={arrivalsWrapRef} className="relative overflow-visible">
            <TripMiniCard
              variant="arrivals"
              loading={loading}
              people={row?.next_arrival_people_count ?? null}
              date={row?.next_arrival_date ?? null}
              time={row?.next_arrival_time ?? null}
              routeLabel={routeLabel}
              footer={
                <button
                  type="button"
                  onClick={() => {
                    setOpenArrivals((v) => !v)
                    setOpenDepartures(false)
                  }}
                  className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-xl border border-gray-200 bg-gradient-to-r from-blue-50 to-white hover:from-blue-100 hover:to-white transition text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-800"
                  aria-expanded={openArrivals}
                  aria-label="إظهار الرحلات القادمة (القادمون)"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-700 flex-shrink-0" />
                    <span className="truncate">الرحلات القادمة</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-gray-600 transition-transform ${openArrivals ? 'rotate-180' : ''}`} />
                </button>
              }
            />

          {openArrivals && (
            <div
              className="
                absolute z-30 top-full mt-2
                left-0 right-0 w-full max-w-[calc(100vw-1rem)]
                sm:left-0 sm:right-auto sm:w-auto sm:min-w-[20rem] sm:max-w-[28rem]
                md:max-w-[32rem]
                lg:max-w-[30rem]
                xl:max-w-[28rem]
                bg-white rounded-xl border border-gray-100 shadow-xl p-3 sm:p-4 text-xs sm:text-sm text-gray-700
                max-h-[80vh] overflow-y-auto
              "
            >
              {arrivalsList.length === 0 ? (
                <div className="text-gray-500 text-center py-2 text-xs sm:text-sm">
                  {rpcNeedsSetup ? 'يلزم تفعيل عرض الرحلات من Supabase (تشغيل ملف RPC الخاص بالرحلات).' : 'لا توجد رحلات قادمة'}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-2.5">
                  <div className="flex items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 pb-2 border-b border-gray-100">
                    <span className="min-w-0 truncate font-semibold">التاريخ والوقت</span>
                    <span className="flex-shrink-0 whitespace-nowrap font-semibold">عدد الأشخاص</span>
                  </div>
                  {arrivalsList.map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 sm:gap-3 py-1.5 sm:py-2 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <span className="tabular-nums text-[11px] sm:text-xs font-medium break-words">
                          {formatDate(x.trip_date)} · {String(x.trip_time || '10:00').slice(0, 5)}
                        </span>
                        {!x.trip_time && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap flex-shrink-0">
                            تجريبي
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold tabular-nums text-gray-900 flex-shrink-0 text-xs sm:text-sm">{x.people_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div ref={departuresWrapRef} className="relative overflow-visible">
            <TripMiniCard
              variant="departures"
              loading={loading}
              people={row?.next_departure_people_count ?? null}
              date={row?.next_departure_date ?? null}
              time={row?.next_departure_time ?? null}
              routeLabel={routeLabel}
              footer={
                <button
                  type="button"
                  onClick={() => {
                    setOpenDepartures((v) => !v)
                    setOpenArrivals(false)
                  }}
                  className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 rounded-xl border border-gray-200 bg-gradient-to-r from-green-50 to-white hover:from-green-100 hover:to-white transition text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-800"
                  aria-expanded={openDepartures}
                  aria-label="إظهار الرحلات القادمة (المغادرون)"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-green-700 flex-shrink-0" />
                    <span className="truncate">الرحلات القادمة</span>
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-gray-600 transition-transform ${openDepartures ? 'rotate-180' : ''}`} />
                </button>
              }
            />

          {openDepartures && (
            <div
              className="
                absolute z-30 top-full mt-2
                left-0 right-0 w-full max-w-[calc(100vw-1rem)]
                sm:left-auto sm:right-0 sm:w-auto sm:min-w-[20rem] sm:max-w-[28rem]
                md:max-w-[32rem]
                lg:max-w-[30rem]
                xl:max-w-[28rem]
                bg-white rounded-xl border border-gray-100 shadow-xl p-3 sm:p-4 text-xs sm:text-sm text-gray-700
                max-h-[80vh] overflow-y-auto
              "
            >
              {departuresList.length === 0 ? (
                <div className="text-gray-500 text-center py-2 text-xs sm:text-sm">
                  {rpcNeedsSetup ? 'يلزم تفعيل عرض الرحلات من Supabase (تشغيل ملف RPC الخاص بالرحلات).' : 'لا توجد رحلات قادمة'}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-2.5">
                  <div className="flex items-center justify-between gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 pb-2 border-b border-gray-100">
                    <span className="min-w-0 truncate font-semibold">التاريخ والوقت</span>
                    <span className="flex-shrink-0 whitespace-nowrap font-semibold">عدد الأشخاص</span>
                  </div>
                  {departuresList.map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 sm:gap-3 py-1.5 sm:py-2 hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                        <span className="tabular-nums text-[11px] sm:text-xs font-medium break-words">
                          {formatDate(x.trip_date)} · {String(x.trip_time || '10:00').slice(0, 5)}
                        </span>
                        {!x.trip_time && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap flex-shrink-0">
                            تجريبي
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold tabular-nums text-gray-900 flex-shrink-0 text-xs sm:text-sm">{x.people_count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


