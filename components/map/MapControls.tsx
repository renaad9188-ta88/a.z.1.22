'use client'

import { Bus, Map, Satellite, LocateFixed } from 'lucide-react'

interface MapControlsProps {
  isTripMetaHidden: boolean
  mapType: 'roadmap' | 'satellite'
  onShowTripMeta: () => void
  onResetMap: () => void
  onToggleMapType: () => void
}

export default function MapControls({
  isTripMetaHidden,
  mapType,
  onShowTripMeta,
  onResetMap,
  onToggleMapType,
}: MapControlsProps) {
  return (
    <div className={`pointer-events-none absolute right-3 z-30 ${isTripMetaHidden ? 'top-14 md:top-3' : 'top-32 md:top-24'}`}>
      <div className="pointer-events-auto flex flex-col gap-2">
        {/* Show Trip Meta button - appears when hidden */}
        {isTripMetaHidden && (
          <button
            onClick={onShowTripMeta}
            className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 md:p-2.5 transition-all hover:shadow-lg active:scale-95"
            title="إظهار معلومات الرحلة"
            aria-label="إظهار معلومات الرحلة"
          >
            <Bus className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
          </button>
        )}

        {/* Reset to Trip Button - يرجع لنطاق الرحلة */}
        <button
          onClick={onResetMap}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 md:p-2.5 transition-all hover:shadow-lg active:scale-95"
          title="العودة إلى نطاق الرحلة"
          aria-label="العودة إلى نطاق الرحلة"
        >
          <LocateFixed className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
        </button>

        {/* Map Type Toggle Button - يظهر دائماً */}
        <button
          onClick={onToggleMapType}
          className="bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2 md:p-2.5 transition-all hover:shadow-lg active:scale-95"
          title={mapType === 'roadmap' ? 'عرض القمر الصناعي' : 'عرض الخريطة'}
          aria-label={mapType === 'roadmap' ? 'قمر صناعي' : 'خريطة'}
        >
          {mapType === 'roadmap' ? (
            <Satellite className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
          ) : (
            <Map className="w-5 h-5 md:w-6 md:h-6 text-gray-700" />
          )}
        </button>
      </div>
    </div>
  )
}




