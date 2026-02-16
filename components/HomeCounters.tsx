'use client'

import { useEffect, useState } from 'react'
import { Plane, Bus, Car } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

type CountersRow = {
  total_arrivals_people_count: number | null
  total_departures_people_count: number | null
}

// البيانات الوهمية (الرقم الصفري للموقع)
const BASELINE_ARRIVALS = 345 // الرقم الأساسي للقادمون
const BASELINE_DEPARTURES = 235 // الرقم الأساسي للمغادرون

export default function HomeCounters() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [row, setRow] = useState<CountersRow | null>(null)
  const [animatedArrivals, setAnimatedArrivals] = useState(BASELINE_ARRIVALS)
  const [animatedDepartures, setAnimatedDepartures] = useState(BASELINE_DEPARTURES)

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

  // حساب العدد النهائي (البيانات الوهمية + البيانات الفعلية)
  const finalArrivalsCount = loading 
    ? BASELINE_ARRIVALS 
    : BASELINE_ARRIVALS + (row?.total_arrivals_people_count || 0)
  
  const finalDeparturesCount = loading 
    ? BASELINE_DEPARTURES 
    : BASELINE_DEPARTURES + (row?.total_departures_people_count || 0)

  // تأثير العد المتحرك
  useEffect(() => {
    if (loading) return

    const duration = 2000 // مدة العد بالمللي ثانية
    const steps = 60 // عدد الخطوات
    const stepDuration = duration / steps
    const startArrivals = BASELINE_ARRIVALS
    const startDepartures = BASELINE_DEPARTURES
    const arrivalsIncrement = (finalArrivalsCount - startArrivals) / steps
    const departuresIncrement = (finalDeparturesCount - startDepartures) / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setAnimatedArrivals(finalArrivalsCount)
        setAnimatedDepartures(finalDeparturesCount)
        clearInterval(interval)
      } else {
        setAnimatedArrivals(Math.floor(startArrivals + arrivalsIncrement * currentStep))
        setAnimatedDepartures(Math.floor(startDepartures + departuresIncrement * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [loading, finalArrivalsCount, finalDeparturesCount])

  const arrivalsCount = loading ? '…' : String(animatedArrivals)
  const departuresCount = loading ? '…' : String(animatedDepartures)

  return (
    <div className="max-w-6xl mx-auto mb-5 sm:mb-6">
      <div className="flex items-stretch gap-3 sm:gap-4">
        {/* القادمون (على اليمين في RTL) */}
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 font-semibold notranslate">إجمالي القادمون</p>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 notranslate">عدد الأشخاص (القادمون)</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400" />
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 items-center justify-center">
                  <Car className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                {arrivalsCount}
              </div>
              <span className="text-xs sm:text-sm md:text-base text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full font-semibold notranslate">
                بيانات عامة
              </span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-blue-400 to-blue-500" />
        </div>

        {/* المغادرون (على الشمال) */}
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 font-semibold notranslate">إجمالي المغادرون</p>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 notranslate">عدد الأشخاص (المغادرون)</p>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-green-50 flex items-center justify-center">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-400 rotate-180" />
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Bus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-400" />
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 items-center justify-center">
                  <Car className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-400" />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                {departuresCount}
              </div>
              <span className="text-xs sm:text-sm md:text-base text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded-full font-semibold notranslate">
                بيانات عامة
              </span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-green-400 to-green-500" />
        </div>
      </div>
    </div>
  )
}




