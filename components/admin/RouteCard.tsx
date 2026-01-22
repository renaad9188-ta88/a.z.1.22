'use client'

import { MapPin, Bus } from 'lucide-react'
import RouteTripsPanel from './RouteTripsPanel'
import type { Route, Driver, RouteTripLite } from './types'

interface RouteCardProps {
  route: Route
  assignedDrivers: Driver[]
  driverLiveMap: Record<string, { is_available: boolean; updated_at: string }>
  routeTrips: RouteTripLite[]
  routeTripsLoading: boolean
  tripAssignedDrivers: Record<string, Driver[]>
  allDrivers: Driver[]
  availableDrivers: Driver[]
  onAssignDriver: (routeId: string, driverId: string) => void
  onLoadTrips: () => void
  onAssignDriverToTrip: (tripId: string, driverId: string, routeId: string) => void
  onCreateArrivalTrip: () => void
  onCreateDepartureTrip: () => void
  onEditTrip: (tripId: string) => void
}

export default function RouteCard({
  route,
  assignedDrivers,
  driverLiveMap,
  routeTrips,
  routeTripsLoading,
  tripAssignedDrivers,
  allDrivers,
  availableDrivers,
  onAssignDriver,
  onLoadTrips,
  onAssignDriverToTrip,
  onCreateArrivalTrip,
  onCreateDepartureTrip,
  onEditTrip,
}: RouteCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5 md:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2">{route.name}</h3>
          {route.description && (
            <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">{route.description}</p>
          )}
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
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
            route.is_active
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}
        >
          {route.is_active ? 'نشط' : 'غير نشط'}
        </span>
      </div>

      {/* Assigned Drivers */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-xs sm:text-sm font-bold text-gray-800 mb-3">السائقون المربوطون:</h4>
        {assignedDrivers.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {assignedDrivers.map((driver) => (
              <span
                key={driver.id}
                className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm font-medium border border-blue-200"
              >
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
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">إضافة سائق...</option>
            {availableDrivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name} - {driver.vehicle_type}
              </option>
            ))}
          </select>
        </div>

        {/* Trips Panel */}
        <RouteTripsPanel
          route={route}
          routeTrips={routeTrips}
          routeTripsLoading={routeTripsLoading}
          tripAssignedDrivers={tripAssignedDrivers}
          allDrivers={allDrivers}
          onLoadTrips={onLoadTrips}
          onAssignDriver={onAssignDriverToTrip}
          onCreateArrivalTrip={onCreateArrivalTrip}
          onCreateDepartureTrip={onCreateDepartureTrip}
          onEditTrip={onEditTrip}
        />
      </div>
    </div>
  )
}

