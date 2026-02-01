'use client'

import { Users, Copy } from 'lucide-react'

interface TripInfo {
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  trip_type: 'arrival' | 'departure' | null
}

interface TrackingInfoCardProps {
  visitorName: string | null
  shortCode: string
  city: string | null
  peopleCount: number
  tripInfo: TripInfo | null
  selectedStopPoint: { name: string } | null
  companionNames: string[]
  onCopyCode: () => void
  onCopyLink: () => void
}

export default function TrackingInfoCard({
  visitorName,
  shortCode,
  city,
  peopleCount,
  tripInfo,
  selectedStopPoint,
  companionNames,
  onCopyCode,
  onCopyLink,
}: TrackingInfoCardProps) {
  return (
    <div className="mt-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
            <h2 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
              {visitorName || '—'}
            </h2>
            <span className="text-xs font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
              #{shortCode}
            </span>
            {tripInfo?.trip_type && (
              <span className="text-xs font-extrabold px-2 py-1 rounded-full border border-blue-300 text-blue-800 bg-blue-100">
                {tripInfo.trip_type === 'arrival' ? 'القادمون' : 'المغادرون'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mb-1">
            المدينة: <span className="font-semibold text-gray-800">{city || '—'}</span> • عدد الأشخاص:{' '}
            <span className="font-semibold text-gray-800 tabular-nums">{peopleCount}</span>
          </p>
          {tripInfo && (
            <div className="mt-2 p-2 bg-white rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-gray-800 mb-1">
                {tripInfo.start_location_name} → {tripInfo.end_location_name}
              </p>
              {tripInfo.departure_time && (
                <p className="text-xs text-gray-600">وقت الانطلاق: {tripInfo.departure_time}</p>
              )}
              {selectedStopPoint && (
                <p className="text-xs text-green-700 font-semibold mt-1">
                  {tripInfo.trip_type === 'arrival' ? 'نقطة النزول' : 'نقطة التحميل'}: {selectedStopPoint.name}
                </p>
              )}
            </div>
          )}
          {companionNames.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {companionNames.slice(0, 6).map((n) => (
                <span
                  key={n}
                  className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] font-semibold text-gray-700 max-w-full truncate"
                  title={n}
                >
                  {n}
                </span>
              ))}
              {companionNames.length > 6 && (
                <span className="px-2 py-1 bg-blue-50 border border-blue-200 rounded-full text-[11px] font-bold text-blue-700">
                  +{companionNames.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCopyCode}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            title="نسخ كود الطلب"
          >
            <Copy className="w-4 h-4 text-gray-600" />
            نسخ الكود
          </button>
          <button
            type="button"
            onClick={onCopyLink}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
            title="نسخ رابط التتبع"
          >
            <Copy className="w-4 h-4 text-gray-600" />
            نسخ رابط التتبع
          </button>
        </div>
      </div>
    </div>
  )
}



