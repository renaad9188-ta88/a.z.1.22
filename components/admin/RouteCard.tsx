'use client'

import { useState } from 'react'
import { MapPin, Bus, Navigation, Copy, Eye, EyeOff, RefreshCcw, Clock, Archive, Layers, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import TripsList from './TripsList'
import RouteInlineBuilder from './route-builder/RouteInlineBuilder'

interface Route {
  id: string
  name: string
  description: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
  is_active: boolean
}

type RouteLite = {
  id: string
  name: string
  start_location_name?: string
  end_location_name?: string
}

interface Driver {
  id: string
  name: string
  vehicle_type: string
  is_active?: boolean | null
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
  tripListFilter: 'upcoming' | 'ended' | 'all'
  fixedTripType?: 'arrival' | 'departure'
  onTripListFilterChange: (next: 'upcoming' | 'ended' | 'all') => void
  onToggleTrips: (routeId: string) => void
  onLoadTrips: (routeId: string) => void
  onAssignDriver: (routeId: string, driverId: string) => void
  onEdit: (tripId: string, routeId: string) => void
  onViewDetails: (tripId: string) => void
  onShowPassengers: (tripId: string) => void
  onAssignDriverToTrip: (tripId: string, driverId: string, routeId: string) => void
  onUnassignDriverFromTrip: (tripId: string, driverId: string, routeId: string) => void
  onTabChange: (routeId: string, isArrival: boolean) => void
  onManageRouteStops?: (route: RouteLite) => void
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
  tripListFilter,
  fixedTripType,
  onTripListFilterChange,
  onToggleTrips,
  onLoadTrips,
  onAssignDriver,
  onEdit,
  onViewDetails,
  onShowPassengers,
  onAssignDriverToTrip,
  onUnassignDriverFromTrip,
  onTabChange,
  onManageRouteStops,
}: RouteCardProps) {
  const allTrips = routeTrips[route.id] || []
  const visibleTrips = fixedTripType ? allTrips.filter((t: any) => (t.trip_type || 'arrival') === fixedTripType) : allTrips
  const [showInlineBuilder, setShowInlineBuilder] = useState(false)

  const handleCopyReport = async () => {
    const trips = visibleTrips
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

        {/* Assign Driver + Manage route stops */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAssignDriver(route.id, e.target.value)
                e.target.value = ''
              }
            }}
            className="w-full sm:w-auto px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">ربط سائق بالخط...</option>
            {drivers
              .filter(d => !assignedDrivers.find(ad => ad.id === d.id))
              .map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} - {driver.vehicle_type}
                </option>
              ))}
          </select>

          {fixedTripType && (
            <button
              type="button"
              onClick={() => setShowInlineBuilder((p) => !p)}
              className={`w-full sm:w-auto px-3 py-2 rounded-lg transition text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 border ${
                fixedTripType === 'arrival'
                  ? showInlineBuilder
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-900 border-blue-200 hover:bg-blue-50'
                  : showInlineBuilder
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-50'
              }`}
              title="إنشاء رحلات + إدارة محطات هذا القسم في نفس المكان"
            >
              <Plus className="w-4 h-4" />
              {fixedTripType === 'arrival' ? 'إنشاء القادمين + محطات النزول' : 'إنشاء المغادرين + محطات الصعود'}
            </button>
          )}

          {onManageRouteStops && (
            <button
              type="button"
              onClick={() =>
                onManageRouteStops({
                  id: route.id,
                  name: route.name,
                  start_location_name: route.start_location_name,
                  end_location_name: route.end_location_name,
                })
              }
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition text-xs sm:text-sm font-extrabold text-gray-900 inline-flex items-center justify-center gap-2"
              title="إدارة محطات الخط (عام)"
            >
              <MapPin className="w-4 h-4 text-gray-800" />
              محطات الخط
            </button>
          )}
        </div>

        {/* Trips for this route */}
        <div className="mt-4 border-t border-gray-200 pt-4">
          {fixedTripType && showInlineBuilder && (
            <RouteInlineBuilder
              route={route as any}
              tripType={fixedTripType}
              onCreatedTrips={() => onLoadTrips(route.id)}
            />
          )}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-3 sm:p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                {/* Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg flex-shrink-0">
                    <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900">
                        {fixedTripType === 'arrival'
                          ? 'رحلات القادمين'
                          : fixedTripType === 'departure'
                            ? 'رحلات المغادرين'
                            : 'رحلات هذا الخط'}
                      </h4>

                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-800">
                        {visibleTrips.length} رحلة
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-600 font-semibold truncate">
                      {fixedTripType ? 'عرض وإدارة الرحلات الخاصة بهذا القسم فقط' : 'عرض وإدارة جميع الرحلات المجدولة'}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  {/* Segmented filter */}
                  <div className="inline-flex items-center bg-white border border-gray-200 rounded-2xl p-1 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => onTripListFilterChange('upcoming')}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition ${
                        tripListFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                      title="الرحلات القادمة"
                    >
                      <Clock className="w-4 h-4" />
                      القادمة
                    </button>
                    <button
                      type="button"
                      onClick={() => onTripListFilterChange('ended')}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition ${
                        tripListFilter === 'ended' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                      title="الرحلات المنتهية"
                    >
                      <Archive className="w-4 h-4" />
                      المنتهية
                    </button>
                    <button
                      type="button"
                      onClick={() => onTripListFilterChange('all')}
                      className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 transition ${
                        tripListFilter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                      title="كل الرحلات"
                    >
                      <Layers className="w-4 h-4" />
                      الكل
                    </button>
                  </div>

                  {/* Icon actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onToggleTrips(route.id)
                        const willOpen = !expandedRouteTrips[route.id]
                        if (willOpen) onLoadTrips(route.id)
                      }}
                      className={`px-3 py-2 rounded-2xl border font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition ${
                        expandedRouteTrips[route.id]
                          ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                          : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                      }`}
                      title={expandedRouteTrips[route.id] ? 'إخفاء الرحلات' : 'عرض الرحلات'}
                    >
                      {expandedRouteTrips[route.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {expandedRouteTrips[route.id] ? 'إخفاء' : 'عرض'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLoadTrips(route.id)}
                      disabled={Boolean(routeTripsLoading[route.id])}
                      className="px-3 py-2 rounded-2xl border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition"
                      title="تحديث الرحلات"
                    >
                      <RefreshCcw className={`w-4 h-4 ${routeTripsLoading[route.id] ? 'animate-spin' : ''}`} />
                      تحديث
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-3 py-2 rounded-2xl border border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition"
                      title="نسخ الكشف"
                    >
                      <Copy className="w-4 h-4" />
                      نسخ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-3 sm:p-4">
              {expandedRouteTrips[route.id] ? (
                <TripsList
                  trips={visibleTrips}
                  routeId={route.id}
                  tabIsArrival={fixedTripType ? fixedTripType === 'arrival' : Boolean((expandedRouteTrips as any)[`${route.id}__tab`] ?? true)}
                  onTabChange={(isArrival) => {
                    if (fixedTripType) return
                    onTabChange(route.id, isArrival)
                  }}
                  fixedTripType={fixedTripType}
                  tripListFilter={tripListFilter}
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
                  onReloadTrips={() => onLoadTrips(route.id)}
                />
              ) : (
                <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  اضغط <span className="font-extrabold">عرض</span> لفتح الرحلات، أو <span className="font-extrabold">تحديث</span> لجلب آخر البيانات.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

