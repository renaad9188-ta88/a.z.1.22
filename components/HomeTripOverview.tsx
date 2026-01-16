'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plane, Calendar, ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'

type TripOverviewRow = {
  default_route_name: string | null
  default_route_start: string | null
  default_route_end: string | null
  next_arrival_date: string | null
  next_arrival_people_count: number | null
  next_departure_date: string | null
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

export default function HomeTripOverview({
  position = 'bottom',
}: {
  position?: 'top' | 'bottom'
}) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<TripOverviewRow | null>(null)
  const [mode, setMode] = useState<'arrivals' | 'departures'>('arrivals')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_public_trip_overview')
        if (error) throw error
        const r = (Array.isArray(data) ? data[0] : data) as TripOverviewRow | null
        if (!mounted) return
        setRow(r || null)
      } catch (e) {
        // لا نكسر الصفحة الرئيسية إذا فشل الـ RPC
        if (!mounted) return
        setRow(null)
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [supabase])

  const routeLabel = useMemo(() => {
    const name = row?.default_route_name
    const start = row?.default_route_start
    const end = row?.default_route_end
    if (name) return name
    if (start && end) return `${start} → ${end}`
    return null
  }, [row])

  const active = useMemo(() => {
    const isArr = mode === 'arrivals'
    const date = isArr ? row?.next_arrival_date || null : row?.next_departure_date || null
    const people =
      (isArr ? row?.next_arrival_people_count : row?.next_departure_people_count) ?? null
    const weekday = formatArabicWeekday(date)
    const color = isArr ? 'blue' : 'green'
    return { isArr, date, people, weekday, color }
  }, [mode, row])

  const switchMode = () => setMode((m) => (m === 'arrivals' ? 'departures' : 'arrivals'))

  const badgeClass =
    active.color === 'blue'
      ? 'text-blue-700 bg-blue-50 border-blue-100'
      : 'text-green-700 bg-green-50 border-green-100'

  const iconWrapClass =
    active.color === 'blue' ? 'bg-blue-50' : 'bg-green-50'

  const iconClass =
    active.color === 'blue' ? 'text-blue-600' : 'text-green-600'

  const borderClass =
    active.color === 'blue'
      ? 'from-blue-500 to-blue-600'
      : 'from-green-500 to-green-600'

  return (
    <div
      className={[
        'pointer-events-auto w-full max-w-[560px]',
        // Compact horizontal bar inside map
        'bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden',
      ].join(' ')}
      data-position={position}
    >
      <div className="px-3 py-2 sm:px-3.5 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${iconWrapClass} flex items-center justify-center flex-shrink-0`}>
              <Plane className={`w-4 h-4 ${iconClass} ${active.isArr ? '' : 'rotate-180'}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-extrabold text-gray-800 truncate">
                {active.isArr ? 'القادمون' : 'المغادرون'} — {loading ? '...' : active.people != null ? `${active.people} شخص` : '—'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-600 truncate">
                {loading ? 'جاري التحميل...' : active.date ? `${active.weekday ? `${active.weekday} · ` : ''}${formatDate(active.date)}` : 'لا يوجد موعد'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setMode('arrivals')}
              className={[
                'px-2 py-1 rounded-full text-[10px] font-bold border transition',
                mode === 'arrivals'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              ق
            </button>
            <button
              type="button"
              onClick={() => setMode('departures')}
              className={[
                'px-2 py-1 rounded-full text-[10px] font-bold border transition',
                mode === 'departures'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              م
            </button>
            <button
              type="button"
              onClick={switchMode}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
              aria-label="تبديل القادمون/المغادرون"
              title="تبديل القادمون/المغادرون"
            >
              <div className="flex items-center gap-0.5">
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </div>
            </button>
          </div>
        </div>

        {routeLabel && (
          <div className="mt-1.5 text-[10px] text-gray-500 flex items-center gap-1.5 min-w-0">
            <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="truncate">{routeLabel}</span>
          </div>
        )}
      </div>

      <div className={`h-0.5 bg-gradient-to-r ${borderClass}`} />
    </div>
  )
}


