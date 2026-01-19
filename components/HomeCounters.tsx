'use client'

import { useEffect, useState } from 'react'
import { Plane, Bus, Car } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type CountersRow = {
  total_arrivals_people_count: number | null
  total_departures_people_count: number | null
}

export default function HomeCounters() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<CountersRow | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.rpc('get_public_trip_counters')
        if (error) throw error
        const r = (Array.isArray(data) ? data[0] : data) as CountersRow | null
        if (!mounted) return
        setRow(r || null)
      } catch {
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

  const arrivalsCount =
    loading ? '…' : row?.total_arrivals_people_count != null ? String(row.total_arrivals_people_count) : '—'
  const departuresCount =
    loading ? '…' : row?.total_departures_people_count != null ? String(row.total_departures_people_count) : '—'

  return (
    <div className="max-w-6xl mx-auto mb-5 sm:mb-6">
      <div className="flex items-stretch gap-3 sm:gap-4">
        {/* القادمون (على اليمين في RTL) */}
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">إجمالي القادمون</p>
                <p className="text-[10px] sm:text-xs text-gray-500">عدد الأشخاص (القادمون)</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-50 items-center justify-center">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                {arrivalsCount}
              </div>
              <span className="text-[10px] sm:text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full font-semibold">
                بيانات عامة
              </span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </div>

        {/* المغادرون (على الشمال) */}
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 font-semibold">إجمالي المغادرون</p>
                <p className="text-[10px] sm:text-xs text-gray-500">عدد الأشخاص (المغادرون)</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <Plane className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 rotate-180" />
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-50 items-center justify-center">
                  <Car className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                {departuresCount}
              </div>
              <span className="text-[10px] sm:text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full font-semibold">
                بيانات عامة
              </span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </div>
      </div>
    </div>
  )
}




