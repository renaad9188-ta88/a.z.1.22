'use client'

import { Bus, Calendar, Clock, MapPin, Navigation } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface TripLite {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  trip_type?: string | null
}

interface BookedTripDetailsProps {
  bookedTrip: TripLite | null
  bookedStops: Array<{ id: string; name: string; order_index: number }> | null
  selectedDropoffStop: { id: string; name: string } | null
  selectedPickupStop: { id: string; name: string } | null
  arrivalDate: string | null
  departureDate: string | null
  tripId: string | null
}

export default function BookedTripDetails({
  bookedTrip,
  bookedStops,
  selectedDropoffStop,
  selectedPickupStop,
  arrivalDate,
  departureDate,
  tripId,
}: BookedTripDetailsProps) {
  if (tripId) {
    if (bookedTrip) {
      return (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-extrabold text-green-900 flex items-center gap-2">
                  <Bus className="w-4 h-4" />
                  رحلة محجوزة
                </p>
                <p className="text-sm text-gray-900 font-bold mt-1 truncate">
                  {bookedTrip.start_location_name} → {bookedTrip.end_location_name}
                </p>
              </div>
              {bookedTrip.trip_type && (
                <span className="text-[11px] font-extrabold px-2 py-1 rounded-full border border-green-300 text-green-800 bg-white">
                  {String(bookedTrip.trip_type).includes('depart') ? 'مغادرون' : 'قادمون'}
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-gray-600 inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-green-700" />
                  التاريخ
                </span>
                <span className="font-extrabold text-gray-900">{formatDate(bookedTrip.trip_date)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-gray-600 inline-flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-700" />
                  التجمع
                </span>
                <span className="font-extrabold text-gray-900">{bookedTrip.meeting_time || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                <span className="text-gray-600 inline-flex items-center gap-1">
                  <Clock className="w-4 h-4 text-green-700" />
                  الانطلاق
                </span>
                <span className="font-extrabold text-gray-900">{bookedTrip.departure_time || '—'}</span>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-extrabold text-gray-800 mb-2 inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                نقاط التوقف
              </p>
              {bookedStops && bookedStops.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {bookedStops.slice(0, 7).map((s, idx) => (
                    <span
                      key={s.id}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 bg-white text-blue-900"
                      title={s.name}
                    >
                      {idx + 1}. {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">لا توجد نقاط توقف مسجلة لهذه الرحلة.</p>
              )}
            </div>

            {(selectedDropoffStop || selectedPickupStop) && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                {bookedTrip?.trip_type === 'arrival' && selectedDropoffStop && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-blue-900">نقطة النزول المختارة:</p>
                      <p className="text-sm font-bold text-blue-800">{selectedDropoffStop.name}</p>
                    </div>
                  </div>
                )}
                {bookedTrip?.trip_type === 'departure' && selectedPickupStop && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-extrabold text-blue-900">نقطة التحميل المختارة:</p>
                      <p className="text-sm font-bold text-blue-800">{selectedPickupStop.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )
    } else {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
          <p className="font-extrabold text-amber-900">تم تسجيل حجز على الطلب، لكن تعذر تحميل تفاصيل الرحلة.</p>
          <p className="text-xs text-amber-800 mt-1">تحقق من صلاحيات RLS لجدول route_trips/route_trip_stop_points.</p>
        </div>
      )
    }
  }

  if (arrivalDate && bookedTrip?.trip_type === 'departure') {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-blue-900 flex items-center gap-2">
              <Bus className="w-4 h-4" />
              رحلة القدوم المحجوزة
            </p>
            <p className="text-xs text-blue-800 mt-1">
              تاريخ القدوم: <span className="font-bold">{formatDate(arrivalDate)}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (departureDate) {
    return (
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-extrabold text-purple-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 rotate-180" />
              موعد المغادرة
            </p>
            <p className="text-xs text-purple-800 mt-1">
              تاريخ المغادرة: <span className="font-bold">{formatDate(departureDate)}</span>
            </p>
            {bookedTrip?.trip_type === 'departure' && bookedTrip.departure_time && (
              <p className="text-xs text-purple-800 mt-1">
                وقت الانطلاق: <span className="font-bold">{bookedTrip.departure_time}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!tripId) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
        <p className="font-extrabold text-gray-800">لا يوجد حجز رحلة حتى الآن.</p>
        <p className="text-xs text-gray-600 mt-1">سيظهر هنا تلقائياً عندما يحجز المستخدم رحلة.</p>
      </div>
    )
  }

  return null
}

