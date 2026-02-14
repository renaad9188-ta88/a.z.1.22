'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Users, Navigation } from 'lucide-react'
import TripSchedulingModal from './TripSchedulingModal'
import CreateTripModal from './CreateTripModal'
import TripDetailsModal from './TripDetailsModal'
import AssignDriverToTripModal from './AssignDriverToTripModal'
import DriversList from './DriversList'
import RouteCard from './RouteCard'
import PassengersModal from './PassengersModal'
import DriverHistoryModal from './DriverHistoryModal'
import AddDriverModal from './AddDriverModal'
import RouteStopsManagerModal from './RouteStopsManagerModal'
import type { VisitRequest } from './types'
import type { Route, Driver, ActiveSection, TripListFilter } from './route-management/types'
import { useRouteData } from './route-management/hooks/useRouteData'
import { useDriverLocation } from './route-management/hooks/useDriverLocation'
import { useTripData } from './route-management/hooks/useTripData'
import { useDriverManagement } from './route-management/hooks/useDriverManagement'
import { useTripManagement } from './route-management/hooks/useTripManagement'
import { useDriverTripAssignment } from './route-management/hooks/useDriverTripAssignment'

export default function RouteManagement() {
  const supabase = createSupabaseBrowserClient()
  
  // Route Data Hook
  const {
    routes,
    drivers,
    routeDrivers,
    driverAccounts,
    driverLiveMap,
    loading,
    createRouteId,
    setCreateRouteId,
    reloadData,
  } = useRouteData()

  // UI State
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [openHistoryFor, setOpenHistoryFor] = useState<Driver | null>(null)
  const [expandedRouteTrips, setExpandedRouteTrips] = useState<Record<string, boolean>>({})
  const [tripListFilter, setTripListFilter] = useState<TripListFilter>('upcoming')
  const [showPassengersModal, setShowPassengersModal] = useState<{ tripId: string; passengers: any[] } | null>(null)
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)
  const [assignDriverModal, setAssignDriverModal] = useState<{ driver: Driver; tripType: 'arrival' | 'departure' } | null>(null)
  const [activeSection, setActiveSection] = useState<ActiveSection>('arrivals')
  const [routeStopsModal, setRouteStopsModal] = useState<{ route: { id: string; name: string; start_location_name?: string; end_location_name?: string }; initialTab: 'pickup' | 'dropoff' | 'both' } | null>(null)

  // Driver Location Hook
  const {
    driverLocLoading,
    driverLastLoc,
    driverLocHistory,
    loadDriverLastLocation,
    loadDriverLocationHistory,
  } = useDriverLocation()

  // Trip Data Hook
  const {
    routeTrips,
    routeTripsLoading,
    tripAssignedDrivers,
    tripPassengers,
    loadTripsForRoute,
    setTripAssignedDrivers,
  } = useTripData(tripListFilter, expandedRouteTrips)

  // Driver Management Hook
  const {
    driverSearch,
    setDriverSearch,
    normalizePhoneForWhatsApp,
    normalizePhoneForTel,
    getAccountForDriver,
    getAssignedRoutesCount,
    toggleDriverActive,
    deleteDriver,
    handleAddDriver,
    linkDriverToAccount,
  } = useDriverManagement(reloadData)

  // Trip Management Hook
  const {
    showCreateTrip,
    createTripType,
    selectedRouteForTrip,
    editTripData,
    copyTripData,
    setShowCreateTrip,
    setCreateTripType,
    setSelectedRouteForTrip,
    handleEditTrip,
    handleCopyTrip,
    handleCancelTrip,
    handleDeleteTrip,
    closeTripModal,
  } = useTripManagement(routes)

  // Driver Trip Assignment Hook
  const {
    handleAssignDriverToTrip,
    handleUnassignDriverFromTrip,
    handleAssignDriver,
  } = useDriverTripAssignment(setTripAssignedDrivers)

  useEffect(() => {
    // منع الخلط بصرياً: عند تبديل القسم نغلق التوسعات السابقة
    setExpandedRouteTrips({})
  }, [activeSection])

  useEffect(() => {
    // When filter changes, reload trips for expanded routes only
    routes.forEach((r) => {
      if (expandedRouteTrips[r.id]) {
        loadTripsForRoute(r.id)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripListFilter])

  const openTripScheduling = async (requestId: string) => {
    try {
      const { data, error } = await supabase.from('visit_requests').select('*').eq('id', requestId).single()
      if (error) throw error
      setSchedulingRequest((data as any) || null)
    } catch (e: any) {
      console.error('openTripScheduling error:', e)
    }
  }

  const handleShowPassengers = (tripId: string) => {
    const passengers = tripPassengers[tripId] || []
    setShowPassengersModal({ tripId, passengers })
  }

  const handleLoadDriverHistory = async (driver: Driver) => {
    const history = await loadDriverLocationHistory(driver)
    if (history && history.length > 0) {
      setOpenHistoryFor(driver)
    }
  }

  if (loading) {
    return <div className="p-4 text-center">جاري التحميل...</div>
  }

  const activeTripType: 'arrival' | 'departure' | null =
    activeSection === 'arrivals' ? 'arrival' : activeSection === 'departures' ? 'departure' : null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900">إدارة الخطوط والسائقين</h2>
        <p className="text-xs sm:text-sm text-gray-600 font-semibold">
          اختر القسم (قادمون / مغادرون / سائقون) لتجنب أي خلط.
        </p>
      </div>

      {/* Section Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveSection('arrivals')}
          className={`rounded-2xl border p-3 sm:p-4 text-right transition shadow-sm hover:shadow-md ${
            activeSection === 'arrivals'
              ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-gray-900">القادمون</p>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
                إنشاء/عرض رحلات القادمين فقط — بدون أي تبويبات تربك الموظف.
              </p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('departures')}
          className={`rounded-2xl border p-3 sm:p-4 text-right transition shadow-sm hover:shadow-md ${
            activeSection === 'departures'
              ? 'bg-gradient-to-br from-purple-50 to-white border-purple-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-gray-900">المغادرون</p>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
                نفس الصفحة، لكن بيانات المغادرين فقط — لا يوجد خلط أبداً.
              </p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
              <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('drivers')}
          className={`rounded-2xl border p-3 sm:p-4 text-right transition shadow-sm hover:shadow-md ${
            activeSection === 'drivers'
              ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-gray-900">السائقون</p>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
                إضافة/إدارة السائقين + تعيينهم على الرحلات (قادمين/مغادرين) من مكان واحد.
              </p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-lg">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </button>
      </div>

      {/* Arrivals/Departures Controls */}
      {activeTripType && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-extrabold text-gray-900">
                {activeTripType === 'arrival' ? 'قسم القادمين' : 'قسم المغادرين'}
              </p>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
                اختر الخط ثم أنشئ رحلة لهذا القسم. الفلتر أدناه يحدد (القادمة/المنتهية/الكل).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
              {routes.length > 1 && (
                <select
                  value={createRouteId}
                  onChange={(e) => setCreateRouteId(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-xl bg-white text-sm sm:text-base font-extrabold text-gray-900"
                  title="اختر الخط لإنشاء رحلة"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs sm:text-sm font-extrabold text-gray-900">
                لإنشاء الرحلات بسرعة: افتح الخط ثم اضغط زر{' '}
                <span className="font-extrabold">{activeTripType === 'arrival' ? 'إنشاء القادمين + محطات النزول' : 'إنشاء المغادرين + محطات الصعود'}</span>{' '}
                داخل بطاقة الخط.
              </div>
            </div>
          </div>

          {/* Trips Filter (Office-friendly) */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-sm font-extrabold text-gray-900">عرض الرحلات</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTripListFilter('upcoming')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold border ${
                  tripListFilter === 'upcoming'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                }`}
              >
                القادمة
              </button>
              <button
                type="button"
                onClick={() => setTripListFilter('ended')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold border ${
                  tripListFilter === 'ended'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                }`}
              >
                المنتهية
              </button>
              <button
                type="button"
                onClick={() => setTripListFilter('all')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold border ${
                  tripListFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
                }`}
              >
                الكل
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] sm:text-xs text-gray-600 font-semibold">
            الافتراضي للمكتب: عرض الرحلات القادمة فقط لتقليل التشتت. يمكنك عرض المنتهية عند الحاجة.
          </p>
        </div>
      )}

      {/* Routes List (Arrivals/Departures only) */}
      {activeTripType && (
        <div className="grid gap-3 sm:gap-4 lg:gap-6">
          {routes.map((route) => {
            const assignedDrivers = routeDrivers
              .filter(rd => rd.route_id === route.id)
              .map(rd => rd.driver)
              .filter(Boolean) as Driver[]

            return (
              <RouteCard
                key={route.id}
                route={route}
                assignedDrivers={assignedDrivers}
                driverLiveMap={driverLiveMap}
                drivers={drivers}
                expandedRouteTrips={expandedRouteTrips}
                routeTrips={routeTrips}
                routeTripsLoading={routeTripsLoading}
                tripPassengers={tripPassengers}
                tripAssignedDrivers={tripAssignedDrivers}
                tripListFilter={tripListFilter}
                fixedTripType={activeTripType}
                onManageRouteStops={(r) => {
                  const initialTab = activeTripType === 'departure' ? 'pickup' : 'dropoff'
                  setRouteStopsModal({ route: r, initialTab })
                }}
                onTripListFilterChange={(next) => setTripListFilter(next)}
                onToggleTrips={(routeId) => {
                  setExpandedRouteTrips((p) => ({ ...p, [routeId]: !p[routeId] }))
                }}
                onLoadTrips={loadTripsForRoute}
                onAssignDriver={(routeId, driverId) => handleAssignDriver(routeId, driverId, reloadData)}
                onEdit={handleEditTrip}
                onViewDetails={(tripId) => setSelectedTripId(tripId)}
                onShowPassengers={handleShowPassengers}
                onAssignDriverToTrip={handleAssignDriverToTrip}
                onUnassignDriverFromTrip={handleUnassignDriverFromTrip}
                onTabChange={(routeId, isArrival) => {
                  setExpandedRouteTrips((p) => ({ ...p, [`${routeId}__tab`]: isArrival }))
                }}
              />
            )
          })}
        </div>
      )}

      {/* Drivers Section */}
      {activeSection === 'drivers' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">قسم السائقين</h3>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-600 font-semibold">
                هنا فقط: إضافة السائق + إدارة بياناته + تعيينه على رحلات (قادمين/مغادرين).
              </p>
            </div>
            <button
              onClick={() => setShowAddDriver(true)}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm sm:text-base font-extrabold"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              إضافة سائق
            </button>
          </div>

          <DriversList
            drivers={drivers}
            driverSearch={driverSearch}
            onSearchChange={setDriverSearch}
            driverAccounts={driverAccounts}
            driverLastLoc={driverLastLoc}
            driverLiveMap={driverLiveMap}
            driverLocLoading={driverLocLoading}
            getAccountForDriver={(d) => getAccountForDriver(d, driverAccounts)}
            getAssignedRoutesCount={(id) => getAssignedRoutesCount(id, routeDrivers)}
            normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
            normalizePhoneForTel={normalizePhoneForTel}
            loadDriverLastLocation={loadDriverLastLocation}
            loadDriverLocationHistory={handleLoadDriverHistory}
            onOpenHistory={setOpenHistoryFor}
            toggleDriverActive={toggleDriverActive}
            deleteDriver={(id) => deleteDriver(id, drivers)}
            onAssignToTrip={(driver, tripType) => setAssignDriverModal({ driver, tripType })}
            linkDriverToAccount={linkDriverToAccount}
          />
        </>
      )}

      {assignDriverModal && (
        <AssignDriverToTripModal
          driver={{ id: assignDriverModal.driver.id, name: assignDriverModal.driver.name }}
          routes={routes.map((r) => ({ id: r.id, name: r.name }))}
          initialTripType={assignDriverModal.tripType}
          onClose={() => setAssignDriverModal(null)}
          onAssign={async (t) => {
            await handleAssignDriverToTrip(t.id, assignDriverModal.driver.id, t.route_id)
          }}
        />
      )}

      {/* Driver History Modal */}
      {openHistoryFor && (
        <DriverHistoryModal
          driver={openHistoryFor}
          history={driverLocHistory[openHistoryFor.id] || []}
          onClose={() => setOpenHistoryFor(null)}
        />
      )}

      {/* Create Trip Modal */}
      {showCreateTrip && selectedRouteForTrip && (
        <CreateTripModal
          routeId={selectedRouteForTrip.id}
          routeName={selectedRouteForTrip.name}
          tripType={createTripType}
          defaultStart={
            editTripData || copyTripData
              ? (editTripData || copyTripData).start_location_name
                ? { 
                    name: (editTripData || copyTripData).start_location_name, 
                    lat: (editTripData || copyTripData).start_lat, 
                    lng: (editTripData || copyTripData).start_lng 
                  }
                : (createTripType === 'departure'
                    ? { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng }
                    : { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng })
              : (createTripType === 'departure'
                  ? { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng }
                  : { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng })
          }
          defaultEnd={
            editTripData || copyTripData
              ? (editTripData || copyTripData).end_location_name
                ? { 
                    name: (editTripData || copyTripData).end_location_name, 
                    lat: (editTripData || copyTripData).end_lat, 
                    lng: (editTripData || copyTripData).end_lng 
                  }
                : (createTripType === 'departure'
                    ? { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng }
                    : { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng })
              : (createTripType === 'departure'
                  ? { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng }
                  : { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng })
          }
          editTripId={editTripData ? editTripData.id : null}
          editTripData={editTripData || copyTripData}
          onClose={closeTripModal}
          onSuccess={() => {
            // Reload trips for this route
            if (selectedRouteForTrip) {
              loadTripsForRoute(selectedRouteForTrip.id)
            }
            closeTripModal()
          }}
        />
      )}

      {/* Trip Details Modal */}
      {selectedTripId && (
        <TripDetailsModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          onUpdate={() => {
            // Reload trips if needed
            if (selectedRouteForTrip) {
              loadTripsForRoute(selectedRouteForTrip.id)
            }
          }}
        />
      )}

      {/* Trip Scheduling Modal (Admin) */}
      {schedulingRequest && (
        <TripSchedulingModal
          request={schedulingRequest}
          onClose={() => setSchedulingRequest(null)}
          onUpdate={() => {
            // refresh trips lists if open
            const rid = (schedulingRequest as any)?.route_id as string | undefined
            if (rid) loadTripsForRoute(rid)
          }}
          isAdmin
        />
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <AddDriverModal
          driverAccounts={driverAccounts}
          onClose={() => setShowAddDriver(false)}
          onSubmit={async (formData) => {
            await handleAddDriver(formData)
            setShowAddDriver(false)
          }}
        />
      )}

      {/* Passengers Modal */}
      {showPassengersModal && (
        <PassengersModal
          tripId={showPassengersModal.tripId}
          passengers={showPassengersModal.passengers}
          onClose={() => setShowPassengersModal(null)}
          normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
        />
      )}

      {routeStopsModal && (
        <RouteStopsManagerModal
          route={routeStopsModal.route as any}
          initialTab={routeStopsModal.initialTab}
          onClose={() => setRouteStopsModal(null)}
        />
      )}
    </div>
  )
}

