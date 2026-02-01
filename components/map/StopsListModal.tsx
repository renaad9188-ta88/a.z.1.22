'use client'

import { Route, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Stop {
  name: string
  lat: number
  lng: number
  order_index: number
}

interface StopsListModalProps {
  stops: Stop[]
  isArrivalTrip: boolean
  isMinimized: boolean
  onToggleMinimize: () => void
  onClose: () => void
}

export default function StopsListModal({
  stops,
  isArrivalTrip,
  isMinimized,
  onToggleMinimize,
  onClose,
}: StopsListModalProps) {
  return (
    <>
      {/* Backdrop لإغلاق القائمة */}
      <div 
        className="pointer-events-auto absolute inset-0 z-30"
        onClick={onClose}
      />
      
      <div className={`pointer-events-none absolute top-20 md:top-16 right-3 w-[min(20rem,calc(100vw-2rem))] max-h-[60vh] z-40 transition-all duration-300 ${isMinimized ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'}`}>
        <div className="pointer-events-auto bg-white/90 backdrop-blur-lg rounded-xl shadow-xl border border-gray-200/50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200/50 bg-white/50">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">
                {isArrivalTrip ? 'نقاط النزول' : 'نقاط الصعود'}
              </h3>
              <span className="text-[10px] text-gray-500 bg-gray-100/80 px-1.5 py-0.5 rounded-full">
                {stops.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleMinimize}
                className="p-1 hover:bg-gray-100/50 rounded-lg transition-colors"
                aria-label={isMinimized ? "استرجاع" : "تصغير"}
              >
                {isMinimized ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100/50 rounded-lg transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Stops List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(60vh-3.5rem)]">
            {stops.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                لا توجد نقاط توقف
              </div>
            ) : (
              stops.map((stop, idx) => {
                const stopNumber = (stop.order_index ?? idx) + 1
                return (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200/50 hover:bg-gradient-to-r hover:from-blue-100/80 hover:to-indigo-100/80 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {stopNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-900 break-words">
                            {stop.name || `نقطة توقف ${stopNumber}`}
                          </span>
                        </div>
                        {stop.lat && stop.lng && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            📍 {Number(stop.lat).toFixed(6)}, {Number(stop.lng).toFixed(6)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}




