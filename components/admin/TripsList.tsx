'use client'

import { MapPin, Navigation } from 'lucide-react'
import TripCard from './TripCard'
import RouteStats from './RouteStats'

interface Trip {
  id: string
  trip_type?: 'arrival' | 'departure'
  arrival_date?: string | null
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string
  end_location_name?: string
}

interface TripsListProps {
  trips: Trip[]
  routeId: string
  tabIsArrival: boolean
  onTabChange: (isArrival: boolean) => void
  fixedTripType?: 'arrival' | 'departure'
  tripListFilter?: 'upcoming' | 'ended' | 'all'
  passengersCount: Record<string, number>
  assignedDrivers: Record<string, Array<{ id: string; name: string }>>
  driverLiveMap?: Record<string, { is_available: boolean; updated_at?: string | null } | null>
  availableDrivers: Array<{ id: string; name: string; vehicle_type: string }>
  onEdit: (tripId: string, routeId: string) => void
  onViewDetails: (tripId: string) => void
  onShowPassengers: (tripId: string) => void
  onAssignDriver: (tripId: string, driverId: string, routeId: string) => void
  onUnassignDriver: (tripId: string, driverId: string, routeId: string) => void
}

export default function TripsList({
  trips,
  routeId,
  tabIsArrival,
  onTabChange,
  fixedTripType,
  tripListFilter,
  passengersCount,
  assignedDrivers,
  driverLiveMap,
  availableDrivers,
  onEdit,
  onViewDetails,
  onShowPassengers,
  onAssignDriver,
  onUnassignDriver,
}: TripsListProps) {
  const arrivalsCount = trips.filter(t => (t.trip_type || 'arrival') === 'arrival').length
  const departuresCount = trips.filter(t => (t.trip_type || 'arrival') === 'departure').length
  const effectiveIsArrival = fixedTripType ? fixedTripType === 'arrival' : tabIsArrival
  const filteredTrips = trips.filter((t) => {
    return effectiveIsArrival
      ? (t.trip_type || 'arrival') === 'arrival'
      : (t.trip_type || 'arrival') === 'departure'
  })

  return (
    <div className="mt-6">
      {/* Statistics Cards */}
      {!fixedTripType && (
        <RouteStats
          totalTrips={trips.length}
          arrivalsCount={arrivalsCount}
          departuresCount={departuresCount}
          onArrivalsClick={() => onTabChange(true)}
          onDeparturesClick={() => onTabChange(false)}
        />
      )}

      {/* Tabs */}
      {!fixedTripType ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => onTabChange(true)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              tabIsArrival
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
              القادمون
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange(false)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              !tabIsArrival
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
              المغادرون
            </span>
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-extrabold ${
              fixedTripType === 'arrival'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-purple-50 text-purple-800 border-purple-200'
            }`}
          >
            {fixedTripType === 'arrival' ? <MapPin className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
            {fixedTripType === 'arrival' ? 'القادمون' : 'المغادرون'} ({filteredTrips.length})
          </div>
        </div>
      )}

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
          <Navigation className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-700 font-extrabold">
            {tripListFilter === 'ended'
              ? 'لا توجد رحلات منتهية ضمن هذا العرض'
              : tripListFilter === 'upcoming'
                ? 'لا توجد رحلات قادمة ضمن هذا العرض'
                : 'لا توجد رحلات مجدولة'}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            {tripListFilter === 'ended'
              ? 'اختر (القادمة) أو (الكل) لعرض الرحلات الأخرى.'
              : 'استخدم الأزرار أعلاه لإنشاء رحلة جديدة أو غيّر الفلتر.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTrips.map((trip) => {
            const isArrival = (trip.trip_type || 'arrival') === 'arrival'
            return (
              <TripCard
                key={trip.id}
                trip={trip}
                routeId={routeId}
                isArrival={isArrival}
                passengersCount={passengersCount[trip.id] || 0}
                assignedDrivers={assignedDrivers[trip.id] || []}
                driverLiveMap={driverLiveMap}
                availableDrivers={availableDrivers.filter(
                  d => !(assignedDrivers[trip.id] || []).find(ad => ad.id === d.id)
                )}
                onEdit={(tripId) => onEdit(tripId, routeId)}
                onViewDetails={onViewDetails}
                onShowPassengers={onShowPassengers}
                onAssignDriver={(tripId, driverId) => onAssignDriver(tripId, driverId, routeId)}
                onUnassignDriver={(tripId, driverId) => onUnassignDriver(tripId, driverId, routeId)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

