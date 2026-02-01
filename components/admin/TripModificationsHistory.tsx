'use client'

import { Clock } from 'lucide-react'

interface TripModification {
  oldTripId?: string
  newTripId?: string
  tripInfo?: string
  stopInfo?: string
  dateText?: string
}

interface TripModificationsHistoryProps {
  modifications: TripModification[]
}

export default function TripModificationsHistory({ modifications }: TripModificationsHistoryProps) {
  if (modifications.length === 0) return null

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700 flex-shrink-0" />
        <p className="font-extrabold text-yellow-900 text-xs sm:text-sm">سجل تعديلات الحجز</p>
      </div>
      <div className="space-y-2">
        {modifications.map((mod, idx) => (
          <div key={idx} className="bg-white border border-yellow-200 rounded-lg p-2.5 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-yellow-800">تعديل #{modifications.length - idx}</p>
              {mod.dateText && (
                <p className="text-xs text-gray-600 break-words">{mod.dateText}</p>
              )}
            </div>
            {mod.tripInfo && (
              <p className="text-xs sm:text-sm text-gray-800 mb-1 break-words">
                <span className="font-semibold">الرحلة:</span> {mod.tripInfo}
              </p>
            )}
            {mod.stopInfo && (
              <p className="text-xs sm:text-sm text-gray-800 break-words">
                <span className="font-semibold">النقطة المختارة:</span> {mod.stopInfo}
              </p>
            )}
            {mod.oldTripId && mod.newTripId && (
              <p className="text-xs text-gray-600 mt-1 break-words">
                تم التغيير من الرحلة {mod.oldTripId} إلى {mod.newTripId}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

