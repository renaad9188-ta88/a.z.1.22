'use client'

import { Bus, Calendar, Clock, Navigation, MapPin, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface BookedTrip {
  trip_date: string
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string | null
  end_location_name?: string | null
}

interface BookedTripCardProps {
  trip: BookedTrip
  isBookingConfirmed: boolean
  isPendingApproval?: boolean
  onChangeBooking: () => void
}

export default function BookedTripCard({
  trip,
  isBookingConfirmed,
  isPendingApproval = false,
  onChangeBooking,
}: BookedTripCardProps) {
  if (isBookingConfirmed) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-green-600 border-2 border-green-400 rounded-xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white flex-shrink-0" />
          <h4 className="text-lg sm:text-xl font-extrabold text-white">تم تأكيد الحجز</h4>
        </div>
        <div className="bg-white/95 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
          <p className="text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
            ✅ تم تأكيد حجز رحلتك بنجاح
          </p>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
            ✅ سيتم تفعيل التتبع تلقائياً عند انطلاق الرحلة. يمكنك معرفة المسار وترقب الوصول من خلال متابعة الرحلة على الخريطة.
          </p>
          <p className="text-xs sm:text-sm text-blue-700 font-semibold mt-2">
            💡 نصيحة: يمكنك الضغط على "تتبّع على الخريطة" لمشاهدة تفاصيل الرحلة والمسار.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Bus className="w-5 h-5 text-green-600" />
            <h4 className="font-bold text-green-800">
              رحلة محجوزة{isPendingApproval ? ' (بانتظار موافقة الإدارة)' : ''}
            </h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-gray-700">التاريخ:</span>
              <span className="font-bold text-gray-900">{formatDate(trip.trip_date)}</span>
            </div>
            {trip.meeting_time && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">وقت التجمع:</span>
                <span className="font-bold text-gray-900">{trip.meeting_time}</span>
              </div>
            )}
            {trip.departure_time && (
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">وقت الانطلاق:</span>
                <span className="font-bold text-gray-900">{trip.departure_time}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="text-gray-700">المسار:</span>
              <span className="font-bold text-gray-900">
                {trip.start_location_name || 'غير محدد'} → {trip.end_location_name || 'غير محدد'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onChangeBooking}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold whitespace-nowrap"
        >
          {isBookingConfirmed ? 'تعديل الحجز' : 'تغيير الحجز'}
        </button>
      </div>
    </div>
  )
}



