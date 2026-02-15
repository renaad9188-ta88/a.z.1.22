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
        {driverLocation ? (
          <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 leading-relaxed font-semibold">
            ✅ يتم تتبع رحلتك الآن - موقع السائق محدث
          </div>
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
            ⏳ في انتظار بدء التتبع - سيتم تفعيله تلقائياً عند انطلاق الرحلة
          </div>
        )}
        {!loading && stopsCount === 0 && !driverLocation && (
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            <p>
              💡 سيتم إضافة محطات التوقف وموقع السائق على الخريطة عند بدء الرحلة.
            </p>
            <p>نتمنى لكم السلامة وزيارة جميلة.</p>
          </div>
        )}
      </div>
    </div>
  )
}



