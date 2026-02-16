'use client'

import { ArrowRight, Bus, Calendar, Clock, Navigation, MapPin, CheckCircle } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import HelpContactButtons from '@/components/HelpContactButtons'
import TripStopsMiniMap from './TripStopsMiniMap'

interface Trip {
  id: string
  trip_date: string
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string | null
  end_location_name?: string | null
  trip_type?: 'arrival' | 'departure' | null
}

interface Stop {
  id: string
  name: string
  order_index: number
  lat?: number | null
  lng?: number | null
}

interface AvailableTripsModalProps {
  isOpen: boolean
  loading: boolean
  trips: Trip[]
  visitType?: string | null
  bookingStep: 'arrival' | 'departure'
  calculatedDepartureDate: string | null
  expandedTripId: string | null
  tripStopsById: Record<string, Stop[]>
  loadingStopsId: string | null
  selectedStopByTrip: Record<string, string>
  onClose: () => void
  onToggleStops: (tripId: string) => void
  onSelectStop: (tripId: string, stopId: string) => void
  onBookTrip: (tripId: string) => void
  isBookingDisabled: boolean
}

export default function AvailableTripsModal({
  isOpen,
  loading,
  trips,
  visitType,
  bookingStep,
  calculatedDepartureDate,
  expandedTripId,
  tripStopsById,
  loadingStopsId,
  selectedStopByTrip,
  onClose,
  onToggleStops,
  onSelectStop,
  onBookTrip,
  isBookingDisabled,
}: AvailableTripsModalProps) {
  if (!isOpen) return null

  // Ensure we have stops loaded for the first trip to make UX clearer (parent loads stops on toggle)
  // We can't trigger loading from here without props, so we only render richer layout when expanded.

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {visitType === 'visit' && bookingStep === 'arrival' 
                  ? 'رحلات القدوم المتاحة'
                  : visitType === 'visit' && bookingStep === 'departure'
                  ? 'رحلات المغادرة المتاحة'
                  : 'الرحلات المتاحة'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {visitType === 'visit' && bookingStep === 'departure' && calculatedDepartureDate
                  ? `موعد المغادرة المتوقع: ${formatDate(calculatedDepartureDate)}`
                  : 'اختر رحلة من القائمة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* إضافة رسالة عند حجز المغادرة */}
        {visitType === 'visit' && bookingStep === 'departure' && calculatedDepartureDate && (
          <div className="p-4 sm:p-6 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-blue-900 text-sm mb-1">
                  موعد المغادرة المتوقع: {formatDate(calculatedDepartureDate)}
                </p>
                <p className="text-xs text-blue-800 mb-2">
                  يمكنك اختيار رحلة مغادرة قبل هذا الموعد إذا رغبت. يرجى التواصل مع أرقام المنصة لتغيير الموعد.
                </p>
                <div className="bg-white rounded-lg p-2 border border-blue-200">
                  <p className="text-xs text-gray-700">
                    <strong>للتواصل:</strong> يمكنك التواصل مع إدارة المنصة عبر الأرقام المتاحة في صفحة التواصل
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6">
          <div className="mb-3">
            <HelpContactButtons
              title="مساعدة في الحجز؟"
              visitType={visitType as 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa' | undefined}
              message="مرحباً، أحتاج مساعدة في اختيار الرحلة ونقطة الصعود/النزول."
            />
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">جاري تحميل الرحلات...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد رحلات متاحة حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map((trip) => (
                <div key={trip.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-gray-900">
                          {trip.start_location_name || 'غير محدد'} → {trip.end_location_name || 'غير محدد'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span>{formatDate(trip.trip_date)}</span>
                        </div>
                        {trip.meeting_time && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>وقت التجمع: {trip.meeting_time}</span>
                          </div>
                        )}
                        {trip.departure_time && (
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-blue-600" />
                            <span>وقت الانطلاق: {trip.departure_time}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onToggleStops(trip.id)}
                          className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-800 underline px-2 py-1 rounded hover:bg-blue-50 transition"
                        >
                          {expandedTripId === trip.id 
                            ? `إخفاء ${trip.trip_type === 'arrival' ? 'نقاط النزول' : 'نقاط التحميل'}`
                            : `عرض ${trip.trip_type === 'arrival' ? 'نقاط النزول' : 'نقاط التحميل'}`}
                        </button>
                      </div>

                      {expandedTripId === trip.id && (
                        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          {loadingStopsId === trip.id ? (
                            <p className="text-xs text-gray-600">جاري تحميل محطات التوقف...</p>
                          ) : (tripStopsById[trip.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-600">
                              لا توجد {trip.trip_type === 'arrival' ? 'نقاط نزول' : 'نقاط تحميل'} لهذه الرحلة.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* Mini map preview */}
                              <TripStopsMiniMap stops={tripStopsById[trip.id] || []} />

                              <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">
                                {trip.trip_type === 'arrival' 
                                  ? 'اختر نقطة النزول (اختياري):' 
                                  : 'اختر نقطة التحميل (اختياري):'}
                              </p>
                              {(tripStopsById[trip.id] || []).map((s: Stop, idx: number) => {
                                const isSelected = selectedStopByTrip[trip.id] === s.id
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => onSelectStop(trip.id, isSelected ? '' : s.id)}
                                    className={`w-full flex items-center gap-2 text-xs sm:text-sm p-2 rounded-lg transition ${
                                      isSelected
                                        ? 'bg-blue-100 border-2 border-blue-500 text-blue-900'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                      isSelected
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-300 text-gray-700'
                                    }`}>
                                      {idx + 1}
                                    </span>
                                    <div className="flex-1 text-right">
                                      <span className="font-bold text-gray-900 block">{s.name}</span>
                                      {trip.trip_type === 'arrival' && (
                                        <span className="text-[10px] text-gray-500">نقطة نزول</span>
                                      )}
                                      {trip.trip_type === 'departure' && (
                                        <span className="text-[10px] text-gray-500">نقطة تحميل</span>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onBookTrip(trip.id)}
                      disabled={isBookingDisabled}
                      className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg transition text-sm font-semibold whitespace-nowrap ${
                        isBookingDisabled
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      حجز هذه الرحلة
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

