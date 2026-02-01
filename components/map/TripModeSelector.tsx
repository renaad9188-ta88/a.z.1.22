'use client'

import { Plane } from 'lucide-react'

interface TripModeSelectorProps {
  mode: 'arrivals' | 'departures'
  onModeChange: (mode: 'arrivals' | 'departures') => void
}

export default function TripModeSelector({ mode, onModeChange }: TripModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <button
        type="button"
        onClick={() => onModeChange('arrivals')}
        className={[
          'w-full px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-extrabold border-2 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3',
          mode === 'arrivals'
            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300',
        ].join(' ')}
        aria-label="القادمون"
      >
        <Plane className="w-5 h-5 sm:w-6 sm:h-6" />
        <span>القادمون</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('departures')}
        className={[
          'w-full px-4 py-3 sm:py-4 rounded-xl text-sm sm:text-base font-extrabold border-2 transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3',
          mode === 'departures'
            ? 'bg-green-600 text-white border-green-600 shadow-lg shadow-green-200 scale-[1.02]'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300',
        ].join(' ')}
        aria-label="المغادرون"
      >
        <Plane className="w-5 h-5 sm:w-6 sm:h-6 rotate-180" />
        <span>المغادرون</span>
      </button>
    </div>
  )
}

