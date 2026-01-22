'use client'

import { useState } from 'react'
import { Navigation, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import TripCardWithMap from './TripCardWithMap'
import type { Route, RouteTripLite, Driver } from './types'

interface RouteTripsPanelProps {
  route: Route
  routeTrips: RouteTripLite[]
  routeTripsLoading: boolean
  tripAssignedDrivers: Record<string, Driver[]>
  allDrivers: Driver[]
  onLoadTrips: () => void
  onAssignDriver: (tripId: string, driverId: string, routeId: string) => void
  onCreateArrivalTrip: () => void
  onCreateDepartureTrip: () => void
  onEditTrip: (tripId: string) => void
}

export default function RouteTripsPanel({
  route,
  routeTrips,
  routeTripsLoading,
  tripAssignedDrivers,
  allDrivers,
  onLoadTrips,
  onAssignDriver,
  onCreateArrivalTrip,
  onCreateDepartureTrip,
  onEditTrip,
}: RouteTripsPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'arrival' | 'departure'>('arrival')

  const filteredTrips = routeTrips.filter((t) => {
    const tripType = t.trip_type || 'arrival'
    return activeTab === 'arrival' ? tripType === 'arrival' : tripType === 'departure'
  })

  const handleCopyList = async () => {
    if (filteredTrips.length === 0) {
      toast('لا يوجد كشف للنسخ. افتح "عرض" ثم حدّث.')
      return
    }
    const lines = filteredTrips
      .map((r, idx) => {
        const people = 1 + (Number(r.companions_count || 0) || 0)
        const date = r.arrival_date || '-'
        const status = r.trip_status || '-'
        return `${idx + 1}) ${r.visitor_name} — ${people} أشخاص — ${r.city} — ${date} — ${status}`
      })
      .join('\n')
    try {
      await navigator.clipboard.writeText(lines)
      toast.success('تم نسخ كشف الأسماء')
    } catch {
      toast.error('تعذر نسخ الكشف')
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="hidden sm:inline">رحلات هذا الخط (مواعيد + كشف أسماء)</span>
          <span className="sm:hidden">رحلات الخط</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCreateArrivalTrip}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold"
            title="إنشاء رحلة القادمين"
          >
            + القادمين
          </button>
          <button
            type="button"
            onClick={onCreateDepartureTrip}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition text-xs sm:text-sm font-bold"
            title="إنشاء رحلة المغادرين"
          >
            + المغادرين
          </button>
          <button
            type="button"
            onClick={() => {
              const willOpen = !expanded
              setExpanded(willOpen)
              if (willOpen) onLoadTrips()
            }}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-xs sm:text-sm font-bold border border-blue-200"
          >
            {expanded ? 'إخفاء' : 'عرض'}
          </button>
          <button
            type="button"
            onClick={onLoadTrips}
            disabled={routeTripsLoading}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition text-xs sm:text-sm font-bold disabled:opacity-50"
          >
            {routeTripsLoading ? '...' : 'تحديث'}
          </button>
          <button
            type="button"
            onClick={handleCopyList}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-50 text-green-800 hover:bg-green-100 transition text-xs sm:text-sm font-bold border border-green-200"
            title="نسخ كشف الركاب لهذه الرحلات"
          >
            <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
            <span className="hidden sm:inline">نسخ الكشف</span>
            <span className="sm:hidden">نسخ</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('arrival')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                activeTab === 'arrival'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              القادمون
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('departure')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                activeTab === 'departure'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              المغادرون
            </button>
          </div>

          {routeTrips.length === 0 ? (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
              لا توجد رحلات مجدولة لهذا الخط بعد. استخدم زر "تحديد موعد" داخل طلب الزيارة أو من القائمة أدناه بعد ظهورها.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTrips.map((t) => (
                <TripCardWithMap
                  key={t.id}
                  trip={{
                    id: t.id,
                    trip_date: t.arrival_date || '',
                    meeting_time: t.meeting_time || null,
                    departure_time: t.departure_time || null,
                    start_location_name: t.start_location_name || '',
                    start_lat: t.start_lat || 0,
                    start_lng: t.start_lng || 0,
                    end_location_name: t.end_location_name || '',
                    end_lat: t.end_lat || 0,
                    end_lng: t.end_lng || 0,
                    trip_type: (t.trip_type as any) || 'arrival',
                  }}
                  onUpdate={onLoadTrips}
                  onEditTrip={() => onEditTrip(t.id)}
                  assignedDrivers={tripAssignedDrivers[t.id]}
                  allDrivers={allDrivers}
                  onAssignDriver={(tripId, driverId) => onAssignDriver(tripId, driverId, route.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

