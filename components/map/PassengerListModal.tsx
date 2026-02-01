'use client'

import { Users, MapPin, Clock, ChevronLeft } from 'lucide-react'

interface PassengerInfo {
  id: string
  visitor_name: string
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  dropoff_stop_name?: string | null
  pickup_stop_name?: string | null
  eta?: { durationText: string; distanceText?: string } | null
}

interface PassengerListModalProps {
  passengers: PassengerInfo[]
  tripType: 'arrival' | 'departure' | null
  userHintTripId: string | null
  driverLocation: { lat: number; lng: number } | null
  loading: boolean
  onClose: () => void
}

export default function PassengerListModal({
  passengers,
  tripType,
  userHintTripId,
  driverLocation,
  loading,
  onClose,
}: PassengerListModalProps) {
  return (
    <>
      {/* Backdrop شفاف لإغلاق القائمة عند النقر خارجها */}
      <div 
        className="pointer-events-auto absolute inset-0 z-30"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute bottom-3 right-3 w-[min(20rem,calc(100vw-2rem))] max-h-[60vh] z-40 transition-all duration-300 opacity-100">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200/50 bg-white/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                {tripType === 'arrival' ? 'القادمون' : tripType === 'departure' ? 'المغادرون' : 'الركاب'}
              </h3>
              {userHintTripId && (
                <span className="text-[10px] text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded-full">
                  {passengers.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100/50 rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500 rotate-90" />
            </button>
          </div>

          {/* Passengers List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(60vh-3.5rem)]">
            {!userHintTripId ? (
              <div className="text-center py-6">
                <div className="text-gray-500 text-xs mb-1.5">
                  لم يتم ربط رحلة بعد
                </div>
                <div className="text-[10px] text-gray-400">
                  سيتوفر لك تتبّع الرحلة عند بداية رحلة الراكب
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                جاري التحميل...
              </div>
            ) : passengers.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                لا يوجد ركاب في هذه الرحلة
              </div>
            ) : (
              passengers.map((passenger) => (
                <div
                  key={passenger.id}
                  className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-2.5 border border-gray-200/50 hover:bg-gray-100/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 mb-1">
                        {passenger.visitor_name}
                      </div>
                      {(passenger.dropoff_stop_name || passenger.pickup_stop_name) && (
                        <div className="flex items-start gap-1.5 text-[10px] text-gray-600 mb-1.5">
                          <MapPin className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="break-words leading-relaxed">
                            {tripType === 'arrival' 
                              ? `نقطة النزول: ${passenger.dropoff_stop_name || 'غير محدد'}`
                              : `نقطة الصعود: ${passenger.pickup_stop_name || 'غير محدد'}`}
                          </span>
                        </div>
                      )}
                      {/* Show ETA if trip is active, or message if trip is upcoming */}
                      {driverLocation && passenger.eta ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-green-600 font-semibold mt-1.5 pt-1.5 border-t border-gray-200/50">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>الوقت المتبقي: {passenger.eta.durationText}</span>
                          {passenger.eta.distanceText && (
                            <span className="text-gray-500">({passenger.eta.distanceText})</span>
                          )}
                        </div>
                      ) : !driverLocation && userHintTripId ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-semibold mt-1.5 pt-1.5 border-t border-gray-200/50">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span>عندما تبدأ الرحلة</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}




