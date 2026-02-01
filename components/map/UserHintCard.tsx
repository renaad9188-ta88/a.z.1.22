'use client'

import { ChevronLeft } from 'lucide-react'

interface UserHint {
  visitor_name: string
  trip_id: string | null
  trip_date: string | null
}

interface UserHintCardProps {
  userHint: UserHint
  onClick: () => void
}

export default function UserHintCard({ userHint, onClick }: UserHintCardProps) {
  const today = new Date().toISOString().split('T')[0]
  const tripDateStr = userHint.trip_date 
    ? new Date(userHint.trip_date + 'T00:00:00').toISOString().split('T')[0]
    : null
  const isTripToday = tripDateStr === today

  return (
    <div className="pointer-events-none absolute bottom-3 left-3">
      <div 
        className="pointer-events-auto bg-white/85 backdrop-blur-md rounded-lg shadow-md border border-gray-200 px-2.5 py-2 sm:px-3 sm:py-2.5 w-[min(16rem,calc(100vw-1.5rem))] cursor-pointer hover:bg-white/95 transition-colors active:scale-[0.98]"
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[11px] sm:text-xs font-extrabold text-gray-900 break-words leading-tight">
              {userHint.visitor_name}
            </div>
            <div className="text-[10px] text-gray-700 mt-1 leading-relaxed line-clamp-2">
              {userHint.trip_id && isTripToday
                ? 'يتم تتبع رحلتك الآن'
                : userHint.trip_id
                ? 'سيتم تتبع رحلتك عند انطلاق حجزك بالرحلة المحددة من قبلك'
                : 'سيتوفر لك تتبّع الرحلة عند بداية رحلة الراكب.'}
            </div>
          </div>
          <ChevronLeft 
            className="w-5 h-5 flex-shrink-0 rotate-180 text-blue-600 hover:text-blue-700 transition-colors" 
          />
        </div>
      </div>
    </div>
  )
}




