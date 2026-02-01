'use client'

import { Bus, MapPin, Navigation } from 'lucide-react'

interface RouteStatsProps {
  totalTrips: number
  arrivalsCount: number
  departuresCount: number
  onArrivalsClick: () => void
  onDeparturesClick: () => void
}

export default function RouteStats({
  totalTrips,
  arrivalsCount,
  departuresCount,
  onArrivalsClick,
  onDeparturesClick,
}: RouteStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 sm:p-4 border-2 border-green-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1">إجمالي الرحلات</p>
            <p className="text-xl sm:text-2xl font-extrabold text-green-900">
              {totalTrips}
            </p>
          </div>
          <Bus className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 opacity-50 flex-shrink-0" />
        </div>
      </div>
      
      <button
        onClick={onArrivalsClick}
        className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 sm:p-4 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all cursor-pointer text-right"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1">القادمون</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900">
              {arrivalsCount}
            </p>
          </div>
          <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600 opacity-50 flex-shrink-0" />
        </div>
      </button>
      
      <button
        onClick={onDeparturesClick}
        className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 sm:p-4 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all cursor-pointer text-right"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-700 mb-1">المغادرون</p>
            <p className="text-xl sm:text-2xl font-extrabold text-purple-900">
              {departuresCount}
            </p>
          </div>
          <Navigation className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 opacity-50 flex-shrink-0" />
        </div>
      </button>
    </div>
  )
}

