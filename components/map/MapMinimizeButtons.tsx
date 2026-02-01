'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'

interface MapMinimizeButtonsProps {
  showPassengerList: boolean
  showDriverInfo: boolean
  isPassengerListMinimized: boolean
  isDriverInfoMinimized: boolean
  onTogglePassengerList: () => void
  onToggleDriverInfo: () => void
}

export default function MapMinimizeButtons({
  showPassengerList,
  showDriverInfo,
  isPassengerListMinimized,
  isDriverInfoMinimized,
  onTogglePassengerList,
  onToggleDriverInfo,
}: MapMinimizeButtonsProps) {
  return (
    <>
      {/* Minimize/Restore button for Passenger List */}
      {showPassengerList && (
        <button
          onClick={onTogglePassengerList}
          className="pointer-events-auto absolute bottom-3 left-3 z-50 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2.5 transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
          title={isPassengerListMinimized ? "استرجاع قائمة الركاب" : "تصغير قائمة الركاب"}
          aria-label={isPassengerListMinimized ? "استرجاع" : "تصغير"}
        >
          {isPassengerListMinimized ? (
            <ChevronUp className="w-5 h-5 text-gray-700" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-700" />
          )}
          <span className="text-xs font-medium text-gray-700 hidden sm:inline">
            {isPassengerListMinimized ? "استرجاع" : "تصغير"}
          </span>
        </button>
      )}

      {/* Minimize/Restore button for Driver Info */}
      {showDriverInfo && (
        <button
          onClick={onToggleDriverInfo}
          className="pointer-events-auto absolute bottom-3 left-3 z-50 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-md p-2.5 transition-all hover:shadow-lg active:scale-95 flex items-center gap-2"
          title={isDriverInfoMinimized ? "استرجاع معلومات السائق" : "تصغير معلومات السائق"}
          aria-label={isDriverInfoMinimized ? "استرجاع" : "تصغير"}
        >
          {isDriverInfoMinimized ? (
            <ChevronUp className="w-5 h-5 text-gray-700" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-700" />
          )}
          <span className="text-xs font-medium text-gray-700 hidden sm:inline">
            {isDriverInfoMinimized ? "استرجاع" : "تصغير"}
          </span>
        </button>
      )}
    </>
  )
}

