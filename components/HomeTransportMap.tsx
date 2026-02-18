'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { Bus, Calendar, Clock, MapPin, Plane, Route, ChevronLeft, Users, Navigation, ChevronDown, ChevronUp, X, Map, Satellite, LocateFixed } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import MapControls from './map/MapControls'
import TripMetaCard from './map/TripMetaCard'
import UserHintCard from './map/UserHintCard'
import StopsListModal from './map/StopsListModal'
import DriverInfoModal from './map/DriverInfoModal'
import PassengerListModal from './map/PassengerListModal'
import TripModeSelector from './map/TripModeSelector'
import MapHeader from './map/MapHeader'
import MapMinimizeButtons from './map/MapMinimizeButtons'
import { BORDER_CENTER, normalizeStops, ensureDemoStops } from './map/mapHelpers'
import { useMapInitialization } from './transport-map/hooks/useMapInitialization'
import { useTripData } from './transport-map/hooks/useTripData'
import { useUserHint } from './transport-map/hooks/useUserHint'
import { useDriverLocation } from './transport-map/hooks/useDriverLocation'
import { useMapUI } from './transport-map/hooks/useMapUI'
import { useTripRenderer } from './transport-map/hooks/useTripRenderer'
import { usePassengers } from './transport-map/hooks/usePassengers'
import { useDriverInfoLoader } from './transport-map/hooks/useDriverInfoLoader'
import type { LatLng, PassengerInfo, PublicTripMapRow, UserHint } from './transport-map/types'

export default function HomeTransportMap() {
  const supabase = createSupabaseBrowserClient()
  const mapElRef = useRef<HTMLDivElement | null>(null)
  const inViewRef = useRef<HTMLDivElement | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

  // Map Initialization Hook
  const {
    mapRef,
    markersRef,
    polylineRef,
    directionsRendererRef,
    directionsServiceRef,
    ready,
    errorText,
    shouldLoad,
    clearMap,
    clearMarkers,
    clearPolyline,
    clearDirections,
    initMap,
  } = useMapInitialization(apiKey, inViewRef, mapElRef)

  // Trip Data Hook
  const {
    tripRow,
    setTripRow,
    loadingTrip,
    fetchTripMap,
    getStopsList,
  } = useTripData()

  // User Hint Hook
  const {
    userHint,
    setUserHint,
    loadingUserHint,
    loadUserHint,
  } = useUserHint()

  // Map UI Hook
  const {
    mode,
    setMode,
    mapType,
    setMapType,
    showPassengerList,
    setShowPassengerList,
    isPassengerListMinimized,
    setIsPassengerListMinimized,
    isDriverInfoMinimized,
    setIsDriverInfoMinimized,
    isTripMetaHidden,
    setIsTripMetaHidden,
    showStopsList,
    setShowStopsList,
    isStopsListMinimized,
    setIsStopsListMinimized,
    showDriverInfo,
    setShowDriverInfo,
    isLoggedIn,
    hasUserTrip,
    toggleMapType,
  } = useMapUI(userHint, mapRef)

  // Driver Location Hook
  const {
    driverLocation,
    driverLocationLoading,
    driverInfo,
    setDriverInfo,
    loadDriverLocation,
  } = useDriverLocation(isLoggedIn, hasUserTrip)

  // Passengers Hook
  const {
    passengers,
    loadingPassengers,
    tripType,
    loadPassengersForTrip,
  } = usePassengers({ driverLocation })

  // Driver Info Loader Hook
  const { loadDriverInfo } = useDriverInfoLoader({ userHint, setDriverInfo })

  // Trip Renderer Hook
  const { renderTrip, resetMapToTrip } = useTripRenderer({
    mapRef,
    markersRef,
    polylineRef,
    directionsRendererRef,
    directionsServiceRef,
    tripRow,
    mode,
    isLoggedIn,
    hasUserTrip,
    driverLocation,
    userHint,
    clearMap,
    clearDirections,
    onBusMarkerClick: async () => {
      setShowDriverInfo(true)
      if (!driverInfo) {
        await loadDriverInfo()
      }
    },
  })

  // Determine if trip is arrival or departure
  const isArrivalTrip = mode === 'arrivals' || (tripRow?.trip_type === 'arrivals' || tripRow?.trip_type === 'arrival')

  const handleCardClick = async () => {
    if (showPassengerList) {
      setShowPassengerList(false)
      return
    }

    if (userHint?.trip_id) {
      await loadPassengersForTrip(userHint.trip_id)
      setShowPassengerList(true)
    } else {
      setShowPassengerList(true)
    }
  }

  // All rendering and passenger loading logic moved to hooks


  useEffect(() => {
    if (!ready) return
    initMap()
    fetchTripMap(mode, userHint)
    loadUserHint(loadDriverLocation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  useEffect(() => {
    if (!ready) return
    fetchTripMap(mode, userHint)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, ready, userHint?.trip_id])

  useEffect(() => {
    if (!ready) return
    renderTrip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, JSON.stringify(tripRow), userHint, driverLocation, isLoggedIn, hasUserTrip, mode])

  // ETAs are automatically calculated by usePassengers hook when passengers are loaded

  // Handle hash navigation and load user trip when navigating to map
  useEffect(() => {
    if (typeof window === 'undefined' || !ready) return
    
    const handleHashChange = async () => {
      if (window.location.hash === '#map') {
        // Force load user hint to show their trip
        await loadUserHint()
        
        // Wait a bit for userHint to update, then check trip type and update mode
        setTimeout(async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: requestData } = await supabase
              .from('visit_requests')
              .select('trip_id')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            
            if (requestData?.trip_id) {
              const { data: tripData } = await supabase
                .from('route_trips')
                .select('trip_type')
                .eq('id', requestData.trip_id)
                .maybeSingle()
              
              if (tripData?.trip_type === 'departure' && mode !== 'departures') {
                setMode('departures')
              } else if (tripData?.trip_type === 'arrival' && mode !== 'arrivals') {
                setMode('arrivals')
              }
            }
          }
        }, 500)
        
        // Scroll to map
        setTimeout(() => {
          const mapElement = document.getElementById('map')
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 800)
      }
    }
    
    // Check on mount
    handleHashChange()
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const tripLabel = useMemo(() => {
    const isArr = mode === 'arrivals'
    const badge = isArr ? 'القادمون' : 'المغادرون'
    const demo = tripRow?.is_demo ? 'نموذج' : 'رحلة حالية'
    const startName = tripRow?.start_location_name || ''
    const endName = tripRow?.end_location_name || ''
    const route = startName && endName ? `${startName} → ${endName}` : null
    return { badge, demo, route }
  }, [mode, tripRow])

  const dateText = useMemo(() => {
    // Demo: always show today's date (each day by itself)
    if (tripRow?.is_demo) {
      const today = new Date().toISOString().slice(0, 10)
      try {
        return formatDate(today)
      } catch {
        return today
      }
    }
    if (!tripRow?.trip_date) return null
    try {
      return formatDate(tripRow.trip_date)
    } catch {
      return tripRow.trip_date
    }
  }, [tripRow?.trip_date])

  const timeText = useMemo(() => {
    // Demo: always show a morning time
    if (tripRow?.is_demo) return '06:30'
    const t = tripRow?.departure_time || tripRow?.meeting_time
    if (!t) return null
    return String(t).slice(0, 5)
  }, [tripRow?.departure_time, tripRow?.meeting_time])

  const stopsCountText = useMemo(() => {
    // In demo mode we generate 4 stops even if DB has fewer.
    if (tripRow?.is_demo) return 4
    return normalizeStops(tripRow?.stops).length
  }, [tripRow?.is_demo, tripRow?.stops])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <MapHeader />
          <TripModeSelector mode={mode} onModeChange={setMode} />
        </div>

        {errorText ? (
          <div className="p-5 text-sm text-gray-700">{errorText}</div>
        ) : (
          <div ref={inViewRef} className="w-full relative">
            {!shouldLoad && (
              <div className="w-full h-[280px] sm:h-[360px] md:h-[420px] flex items-center justify-center bg-gray-50 text-sm text-gray-600">
                جاري تحميل الخريطة...
              </div>
            )}
            <div
              ref={mapElRef}
              className={`${shouldLoad ? '' : 'hidden'} w-full h-[280px] sm:h-[360px] md:h-[420px]`}
            />

            {/* Overlay: Trip meta */}
            {shouldLoad && (
              <div className="pointer-events-none absolute inset-0">
                <MapMinimizeButtons
                  showPassengerList={showPassengerList}
                  showDriverInfo={showDriverInfo}
                  isPassengerListMinimized={isPassengerListMinimized}
                  isDriverInfoMinimized={isDriverInfoMinimized}
                  onTogglePassengerList={() => setIsPassengerListMinimized(!isPassengerListMinimized)}
                  onToggleDriverInfo={() => setIsDriverInfoMinimized(!isDriverInfoMinimized)}
                />

                {/* Map Controls */}
                <MapControls
                  isTripMetaHidden={isTripMetaHidden}
                  mapType={mapType}
                  onShowTripMeta={() => setIsTripMetaHidden(false)}
                  onResetMap={resetMapToTrip}
                  onToggleMapType={toggleMapType}
                />

                {/* Trip meta (top-right) */}
                {!isTripMetaHidden && (
                  <TripMetaCard
                    tripLabel={tripLabel}
                    loadingTrip={loadingTrip}
                    dateText={dateText}
                    timeText={timeText}
                    stopsCountText={stopsCountText}
                    isArrivalTrip={isArrivalTrip}
                    onHide={() => setIsTripMetaHidden(true)}
                    onShowStopsList={() => setShowStopsList(!showStopsList)}
                  />
                )}

                {/* Stops List Modal */}
                {showStopsList && (
                  <StopsListModal
                    stops={getStopsList()}
                    isArrivalTrip={isArrivalTrip}
                    isMinimized={isStopsListMinimized}
                    onToggleMinimize={() => setIsStopsListMinimized(!isStopsListMinimized)}
                    onClose={() => setShowStopsList(false)}
                  />
                )}

                {/* Overlay: user hint - فقط للمستخدم المسجل الذي لديه رحلة */}
                {isLoggedIn && hasUserTrip && userHint && (
                  <>
                    <UserHintCard
                      userHint={userHint}
                      onClick={handleCardClick}
                    />

                    {/* Driver Info Modal */}
                    {showDriverInfo && (
                      <DriverInfoModal
                        driverInfo={driverInfo}
                        loading={driverLocationLoading}
                        onClose={() => setShowDriverInfo(false)}
                      />
                    )}

                    {/* Passenger List Modal */}
                    {showPassengerList && (
                      <PassengerListModal
                        passengers={passengers}
                        tripType={tripType}
                        userHintTripId={userHint.trip_id}
                        driverLocation={driverLocation}
                        loading={loadingPassengers}
                        onClose={() => setShowPassengerList(false)}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    google: typeof google
  }
}


