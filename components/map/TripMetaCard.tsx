'use client'

import { Bus, Calendar, Clock, Route, X } from 'lucide-react'

interface TripMetaCardProps {
  tripLabel: {
    badge: string
    demo: string
    route: string | null
  }
  loadingTrip: boolean
  dateText: string | null
  timeText: string | null
  stopsCountText: number | string
  isArrivalTrip: boolean
  onHide: () => void
  onShowStopsList: () => void
}

export default function TripMetaCard({
  tripLabel,
  loadingTrip,
  dateText,
  timeText,
  stopsCountText,
  isArrivalTrip,
  onHide,
  onShowStopsList,
}: TripMetaCardProps) {
  return (
    <div className="pointer-events-none absolute top-14 md:top-3 right-3">
      <div className="pointer-events-auto bg-white/85 backdrop-blur-md rounded-lg shadow-md border border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2.5 min-w-0 w-[min(18rem,calc(100vw-1.5rem))] sm:w-[min(22rem,calc(100vw-1.5rem))]">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Bus className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-extrabold text-gray-900 truncate">
                {tripLabel.badge} — {loadingTrip ? 'جاري التحميل...' : tripLabel.demo}
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-600 truncate">
                {tripLabel.route || 'مسار افتراضي'}
              </div>
            </div>
          </div>
          <button
            onClick={onHide}
            className="p-1.5 sm:p-2 hover:bg-gray-100/50 rounded-lg transition-colors flex-shrink-0 active:scale-95"
            title="إخفاء معلومات الرحلة"
            aria-label="إخفاء"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-700">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            {dateText || '—'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
            {timeText || '—'}
          </span>
          <button
            onClick={onShowStopsList}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold whitespace-nowrap hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <Route className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isArrivalTrip ? 'نقاط النزول' : 'نقاط الصعود'}: {stopsCountText}
          </button>
        </div>
      </div>
    </div>
  )
}




