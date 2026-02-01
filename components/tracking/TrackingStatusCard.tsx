'use client'

import { Navigation } from 'lucide-react'

interface ETA {
  durationText: string
  distanceText?: string
}

interface TrackingStatusCardProps {
  driverLocation: { lat: number; lng: number } | null
  eta: ETA | null
  stopsCount: number
  loading: boolean
}

export default function TrackingStatusCard({
  driverLocation,
  eta,
  stopsCount,
  loading,
}: TrackingStatusCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 font-bold text-gray-800">
        <Navigation className="w-5 h-5 text-blue-600" />
        حالة التتبّع
      </div>
      <div className="mt-2 text-sm text-gray-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">موقع السائق</span>
          <span className={`font-semibold ${driverLocation ? 'text-green-700' : 'text-gray-500'}`}>
            {driverLocation ? 'متاح' : 'غير متاح بعد'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">الوقت المتوقع للوصول</span>
          <span className={`font-semibold ${eta ? 'text-blue-700' : 'text-gray-500'}`}>
            {driverLocation
              ? eta
                ? eta.distanceText
                  ? `${eta.durationText} • ${eta.distanceText}`
                  : eta.durationText
                : 'جاري الحساب...'
              : 'غير متاح'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">محطات التوقف</span>
          <span className="font-semibold tabular-nums">{stopsCount}</span>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-2 leading-relaxed">
          ملاحظة: سيتم تفعيل التتبع بعد الحجز والانطلاق.
        </div>
        {!loading && stopsCount === 0 && !driverLocation && (
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              ملاحظة: يلزم تفعيل جداول التتبع في Supabase (سأجهز لك ملف SQL جاهز) ثم يبدأ الإدمن بإدخال نقاط السائق/التوقف.
            </p>
            <p>
              سيتم إضافة تفاصيل التتبّع وموقع الراكب مع السائق على الخريطة لتتبّع الرحلة ومعرفة أماكن النزول للراكب.
            </p>
            <p>نتمنى لكم السلامة وزيارة جميلة.</p>
          </div>
        )}
      </div>
    </div>
  )
}



