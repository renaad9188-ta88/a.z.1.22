'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Bus, Calendar, Clock, MapPin, Navigation } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

type Trip = {
  id: string
  trip_type: string | null
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
}

export default function DriverAssignedTripsPanel({
  driverRowId,
  selectedTripId,
  onSelectTrip,
}: {
  driverRowId: string
  selectedTripId: string | null
  onSelectTrip: (tripId: string | null) => void
}) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [arrivalsTrip, setArrivalsTrip] = useState<Trip | null>(null)
  const [departuresTrip, setDeparturesTrip] = useState<Trip | null>(null)

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)

        const { data: assigns, error: aErr } = await supabase
          .from('route_trip_drivers')
          .select('trip_id')
          .eq('driver_id', driverRowId)
          .eq('is_active', true)

        if (aErr) throw aErr
        const tripIds = (assigns || []).map((x: any) => x.trip_id).filter(Boolean)
        if (tripIds.length === 0) {
          setArrivalsTrip(null)
          setDeparturesTrip(null)
          onSelectTrip(null)
          return
        }

        const { data: trips, error: tErr } = await supabase
          .from('route_trips')
          .select('id,trip_type,trip_date,meeting_time,departure_time,start_location_name,end_location_name,is_active')
          .in('id', tripIds)
          .eq('is_active', true)
          .gte('trip_date', todayISO)
          .order('trip_date', { ascending: true })
          .order('departure_time', { ascending: true })
          .limit(50)

        if (tErr) throw tErr

        const list = ((trips || []) as any as Trip[]).map((t: any) => ({
          id: t.id,
          trip_type: t.trip_type || null,
          trip_date: t.trip_date,
          meeting_time: t.meeting_time || null,
          departure_time: t.departure_time || null,
          start_location_name: t.start_location_name,
          end_location_name: t.end_location_name,
        }))

        const isDepartures = (x: Trip) => {
          const t = String(x.trip_type || '').toLowerCase()
          return t === 'departure' || t === 'departures'
        }
        const aTrip = list.find((x) => !isDepartures(x)) || null
        const dTrip = list.find((x) => isDepartures(x)) || null

        setArrivalsTrip(aTrip)
        setDeparturesTrip(dTrip)

        // Default selected trip: keep existing if still valid, else pick arrivals then departures.
        const valid = selectedTripId && list.some((x) => x.id === selectedTripId)
        if (!valid) {
          onSelectTrip(aTrip?.id || dTrip?.id || null)
        }
      } catch (e: any) {
        console.error('DriverAssignedTripsPanel load error:', e)
        toast.error('تعذر تحميل الرحلات المعيّنة للسائق')
        setArrivalsTrip(null)
        setDeparturesTrip(null)
      } finally {
        setLoading(false)
      }
    }

    if (driverRowId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverRowId, todayISO])

  const TripCard = ({
    kind,
    trip,
  }: {
    kind: 'arrivals' | 'departures'
    trip: Trip | null
  }) => {
    const isArr = kind === 'arrivals'
    const active = trip?.id && selectedTripId === trip.id
    const color = isArr ? 'blue' : 'green'
    const badgeClass =
      color === 'blue'
        ? active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-blue-50 text-blue-800 border-blue-100 hover:bg-blue-100'
        : active
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-green-50 text-green-800 border-green-100 hover:bg-green-100'

    return (
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-extrabold text-gray-900">
                {isArr ? 'رحلة القادمون' : 'رحلة المغادرون'}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                {trip ? 'الرحلة الأقرب المعيّنة لك' : 'لا توجد رحلة معيّنة'}
              </p>
            </div>
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${
                isArr ? 'bg-blue-50' : 'bg-green-50'
              } flex items-center justify-center flex-shrink-0`}
            >
              <Bus className={`w-5 h-5 ${isArr ? 'text-blue-600' : 'text-green-600'} ${isArr ? '' : 'rotate-180'}`} />
            </div>
          </div>

          {trip ? (
            <>
              <div className="mt-2 text-[11px] sm:text-sm font-bold text-gray-900 truncate">
                {trip.start_location_name} → {trip.end_location_name}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-700">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                  <Calendar className="w-3.5 h-3.5 text-gray-600" />
                  {formatDate(trip.trip_date)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200">
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                  {String(trip.departure_time || trip.meeting_time || '—').slice(0, 5)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectTrip(trip.id)}
                className={`mt-3 w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition text-xs sm:text-sm font-extrabold ${badgeClass}`}
                aria-label={isArr ? 'عرض رحلة القادمون على الخريطة' : 'عرض رحلة المغادرون على الخريطة'}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{active ? 'تُعرض على الخريطة' : 'عرض على الخريطة'}</span>
                </span>
                <Navigation className="w-4 h-4 opacity-80" />
              </button>
            </>
          ) : (
            <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3">
              اطلب من الإدارة تعيين رحلة {isArr ? 'للقادمون' : 'للمغادرون'} لك.
            </div>
          )}
        </div>
        <div className={`h-1 bg-gradient-to-r ${isArr ? 'from-blue-500 to-blue-600' : 'from-green-500 to-green-600'}`} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <p className="text-sm text-gray-600">جاري تحميل الرحلات المعيّنة...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto mb-4 sm:mb-6">
      {/* Always side-by-side (even on mobile) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <TripCard kind="departures" trip={departuresTrip} />
        <TripCard kind="arrivals" trip={arrivalsTrip} />
      </div>
    </div>
  )
}


