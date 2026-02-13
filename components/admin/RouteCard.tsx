'use client'

import { MapPin, Bus, Navigation, X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import RouteStats from './RouteStats'
import TripsList from './TripsList'

interface Route {
  id: string
  name: string
  description: string | null
  start_location_name: string
  end_location_name: string
  is_active: boolean
}

interface Driver {
  id: string
  name: string
  vehicle_type: string
}

interface RouteCardProps {
  route: Route
  assignedDrivers: Driver[]
  driverLiveMap: Record<string, { is_available: boolean; updated_at?: string | null } | null>
  drivers: Driver[]
  expandedRouteTrips: Record<string, boolean>
  routeTrips: Record<string, any[]>
  routeTripsLoading: Record<string, boolean>
  tripPassengers: Record<string, any[]>
  tripAssignedDrivers: Record<string, Driver[]>
  onToggleTrips: (routeId: string) => void
  onLoadTrips: (routeId: string) => void
  onAssignDriver: (routeId: string, driverId: string) => void
  onEdit: (trip: any) => void
  onViewDetails: (tripId: string) => void
  onShowPassengers: (tripId: string) => void
  onAssignDriverToTrip: (tripId: string, driverId: string, routeId: string) => void
  onUnassignDriverFromTrip: (tripId: string, driverId: string, routeId: string) => void
  onTabChange: (routeId: string, isArrival: boolean) => void
}

export default function RouteCard({
  route,
  assignedDrivers,
  driverLiveMap,
  drivers,
  expandedRouteTrips,
  routeTrips,
  routeTripsLoading,
  tripPassengers,
  tripAssignedDrivers,
  onToggleTrips,
  onLoadTrips,
  onAssignDriver,
  onEdit,
  onViewDetails,
  onShowPassengers,
  onAssignDriverToTrip,
  onUnassignDriverFromTrip,
  onTabChange,
}: RouteCardProps) {
  const handleCopyReport = async () => {
    const trips = routeTrips[route.id] || []
    if (trips.length === 0) {
      toast('لا يوجد رحلات للنسخ. افتح "عرض" ثم حدّث.')
      return
    }
    
    try {
      const lines: string[] = []
      
      for (const trip of trips) {
        const tripDate = new Date(trip.arrival_date || '')
        const dateStr = tripDate && !isNaN(tripDate.getTime())
          ? `${tripDate.toLocaleDateString('ar-JO', { weekday: 'long' })}, ${String(tripDate.getDate()).padStart(2, '0')}/${String(tripDate.getMonth() + 1).padStart(2, '0')}/${tripDate.getFullYear()}`
          : 'تاريخ غير محدد'
        
        lines.push(`\n${'='.repeat(50)}`)
        lines.push(`رحلة: ${trip.start_location_name || 'غير محدد'} → ${trip.end_location_name || 'غير محدد'}`)
        lines.push(`التاريخ: ${dateStr}`)
        if (trip.departure_time) lines.push(`وقت الانطلاق: ${trip.departure_time}`)
        if (trip.meeting_time) lines.push(`وقت التجمع: ${trip.meeting_time}`)
        lines.push(`النوع: ${(trip.trip_type || 'arrival') === 'arrival' ? 'القادمون' : 'المغادرون'}`)
        
        const passengers = tripPassengers[trip.id] || []
        if (passengers.length > 0) {
          lines.push(`\nالحاجزين (${passengers.length}):`)
          passengers.forEach((passenger: any, idx: number) => {
            const totalPeople = 1 + (passenger.companions_count || 0)
            lines.push(`  ${idx + 1}. ${passenger.visitor_name}${passenger.full_name && passenger.full_name !== passenger.visitor_name ? ` (${passenger.full_name})` : ''}`)
            lines.push(`     عدد الأشخاص: ${totalPeople}`)
            if (passenger.phone) {
              lines.push(`     الهاتف: ${passenger.phone}`)
            } else {
              lines.push(`     الهاتف: غير متوفر`)
            }
          })
        } else {
          lines.push(`\nلا يوجد حاجزين في هذه الرحلة`)
        }
        lines.push('')
      }
      
      const text = lines.join('\n')
      await navigator.clipboard.writeText(text)
      const totalPassengers = trips.reduce((sum, t) => sum + (tripPassengers[t.id]?.length || 0), 0)
      toast.success(`تم نسخ ${trips.length} رحلة مع ${totalPassengers} حاجز`)
    } catch {
      toast.error('تعذر نسخ الكشف')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1">{route.name}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{route.description}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="flex items-center gap-1 text-gray-700">
              <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="truncate">{route.start_location_name}</span>
            </span>
            <span className="hidden sm:block text-gray-400">→</span>
            <span className="flex items-center gap-1 text-gray-700">
              <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="truncate">{route.end_location_name}</span>
            </span>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${route.is_active ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
          {route.is_active ? 'نشط' : 'غير نشط'}
        </span>
      </div>

      {/* Assigned Drivers */}
      <div className="border-t border-gray-100 pt-4">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-3">السائقون المربوطون:</h4>
        {assignedDrivers.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {assignedDrivers.map((driver) => (
              <span key={driver.id} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium border border-blue-200">
                <Bus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{driver.name}</span>
                <span className="hidden sm:inline">({driver.vehicle_type})</span>
                {driverLiveMap[driver.id]?.is_available ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    متاح
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-800">
                    غير متاح
                  </span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-gray-500 mb-3">لا يوجد سائقون مربوطون</p>
        )}

        {/* Assign Driver Dropdown */}
        <div>
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAssignDriver(route.id, e.target.value)
                e.target.value = ''
              }
            }}
            className="w-full sm:w-auto px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">إضافة سائق...</option>
            {drivers
              .filter(d => !assignedDrivers.find(ad => ad.id === d.id))
              .map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.vehicle_type}
                </option>
              ))}
          </select>
        </div>

        {/* Trips for this route */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
                    رحلات هذا الخط
                  </h4>
                  <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                    عرض وإدارة جميع الرحلات المجدولة
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleTrips(route.id)
                    const willOpen = !expandedRouteTrips[route.id]
                    if (willOpen) onLoadTrips(route.id)
                  }}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md"
                >
                  {expandedRouteTrips[route.id] ? (
                    <>
                      <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      إخفاء
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                      عرض الرحلات
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onLoadTrips(route.id)}
                  disabled={Boolean(routeTripsLoading[route.id])}
                  className="px-3 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-300 transition text-xs sm:text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {routeTripsLoading[route.id] ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      جارٍ التحديث...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                      تحديث
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md"
                  title="نسخ جميع الرحلات مع الحاجزين وأرقام الهواتف"
                >
                  <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                  نسخ الكشف
                </button>
              </div>
            </div>
          </div>

          {expandedRouteTrips[route.id] && (
            <>
              <RouteStats
                trips={routeTrips[route.id] || []}
                tripPassengers={tripPassengers}
              />
              <TripsList
                trips={routeTrips[route.id] || []}
                routeId={route.id}
                tabIsArrival={Boolean((expandedRouteTrips as any)[`${route.id}__tab`] ?? true)}
                onTabChange={(isArrival) => onTabChange(route.id, isArrival)}
                passengersCount={Object.fromEntries(
                  Object.entries(tripPassengers).map(([tripId, passengers]) => [
                    tripId,
                    passengers?.length || 0
                  ])
                )}
                assignedDrivers={tripAssignedDrivers}
                driverLiveMap={driverLiveMap}
                availableDrivers={drivers.filter(d => d.is_active !== false)}
                onEdit={onEdit}
                onViewDetails={onViewDetails}
                onShowPassengers={onShowPassengers}
                onAssignDriver={onAssignDriverToTrip}
                onUnassignDriver={onUnassignDriverFromTrip}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

