'use client'

import { Ticket, MapPin } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/date-utils'

export interface TripBookingStat {
  trip_id: string
  trip_date: string
  trip_type: 'arrival' | 'departure' | null
  passengers_count: number
  requests_count: number
  bookings: Array<{
    id: string
    visitor_name: string
    user_id: string
    companions_count: number
    arrival_date: string | null
    days_count: number
    city: string
  }>
  expected_departure_date?: string | null
}

interface AdminDashboardTripBookingsStatsProps {
  tripBookingsStats: TripBookingStat[]
  onTripClick: (trip: {
    trip_id: string
    trip_date: string
    trip_type: 'arrival' | 'departure' | null
    bookings: TripBookingStat['bookings']
  }) => void
}

export default function AdminDashboardTripBookingsStats({
  tripBookingsStats,
  onTripClick,
}: AdminDashboardTripBookingsStatsProps) {
  if (tripBookingsStats.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-3 mb-4 p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-teal-100 rounded-lg border-2 border-teal-200">
        <div className="bg-teal-500 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
          <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-teal-900">
          إحصائيات الحجوزات حسب الرحلة
        </h2>
      </div>
      
      {/* القادمون */}
      {tripBookingsStats.filter(s => s.trip_type === 'arrival').length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base sm:text-lg font-bold text-gray-800">القادمون</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {tripBookingsStats
              .filter(s => s.trip_type === 'arrival')
              .map((stat) => (
                <div
                  key={stat.trip_id}
                  onClick={() => onTripClick({
                    trip_id: stat.trip_id,
                    trip_date: stat.trip_date,
                    trip_type: stat.trip_type,
                    bookings: stat.bookings,
                  })}
                  className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 sm:p-4 border-2 border-emerald-200 cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        قادمون
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {formatDate(stat.trip_date)}
                  </p>
                  {stat.expected_departure_date && (
                    <p className="text-xs text-gray-500 mb-2">
                      ⏰ موعد المغادرة المتوقع: {formatDate(stat.expected_departure_date)}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-gray-600">عدد الأشخاص</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-blue-700">
                        {stat.passengers_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">عدد الطلبات</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {stat.requests_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* المغادرون */}
      {tripBookingsStats.filter(s => s.trip_type === 'departure').length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-orange-600" />
            <h3 className="text-base sm:text-lg font-bold text-gray-800">المغادرون</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {tripBookingsStats
              .filter(s => s.trip_type === 'departure')
              .map((stat) => (
                <div
                  key={stat.trip_id}
                  onClick={() => onTripClick({
                    trip_id: stat.trip_id,
                    trip_date: stat.trip_date,
                    trip_type: stat.trip_type,
                    bookings: stat.bookings,
                  })}
                  className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 sm:p-4 border-2 border-orange-200 cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600" />
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        مغادرون
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {formatDate(stat.trip_date)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-gray-600">عدد الأشخاص</p>
                      <p className="text-xl sm:text-2xl font-extrabold text-blue-700">
                        {stat.passengers_count}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">عدد الطلبات</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {stat.requests_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

