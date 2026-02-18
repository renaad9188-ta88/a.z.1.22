'use client'

import Link from 'next/link'
import { formatDate } from '@/lib/date-utils'

interface Booking {
  id: string
  visitor_name: string
  user_id: string
  companions_count: number
  arrival_date: string | null
  days_count: number
  city: string
}

interface AdminDashboardTripDetailsModalProps {
  trip: {
    trip_id: string
    trip_date: string
    trip_type: 'arrival' | 'departure' | null
    bookings: Booking[]
  } | null
  onClose: () => void
}

export default function AdminDashboardTripDetailsModal({
  trip,
  onClose,
}: AdminDashboardTripDetailsModalProps) {
  if (!trip) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {trip.trip_type === 'arrival' ? 'قادمون' : 'مغادرون'} - {formatDate(trip.trip_date)}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                عدد الركاب: {trip.bookings.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-2">
            {trip.bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{booking.visitor_name}</h4>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                      <span>المدينة: {booking.city}</span>
                      <span>الأشخاص: {1 + booking.companions_count}</span>
                      {booking.arrival_date && (
                        <span>تاريخ القدوم: {formatDate(booking.arrival_date)}</span>
                      )}
                      {booking.days_count && (
                        <span>مدة الإقامة: {booking.days_count} يوم</span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/admin/request/${booking.id}/follow`}
                    className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold whitespace-nowrap"
                    onClick={onClose}
                  >
                    عرض التفاصيل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

