import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { UserHint } from '../types'

export function useMapUI(userHint: UserHint | null, mapRef?: React.RefObject<google.maps.Map | null>) {
  const supabase = createSupabaseBrowserClient()
  const [mode, setMode] = useState<'arrivals' | 'departures'>('arrivals')
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap')
  const [showPassengerList, setShowPassengerList] = useState(false)
  const [isPassengerListMinimized, setIsPassengerListMinimized] = useState(false)
  const [isDriverInfoMinimized, setIsDriverInfoMinimized] = useState(false)
  const [isTripMetaHidden, setIsTripMetaHidden] = useState(false)
  const [showStopsList, setShowStopsList] = useState(false)
  const [isStopsListMinimized, setIsStopsListMinimized] = useState(false)
  const [showDriverInfo, setShowDriverInfo] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasUserTrip, setHasUserTrip] = useState(false)

  // Check if user is logged in and has a trip
  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const loggedIn = !!user
      setIsLoggedIn(loggedIn)
      
      if (loggedIn && userHint?.trip_id) {
        setHasUserTrip(true)
      } else {
        setHasUserTrip(false)
      }
    }
    
    checkUserStatus()
  }, [userHint?.trip_id, supabase])

  // Update map type when mapType state changes
  useEffect(() => {
    if (!mapRef?.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    
    mapRef.current.setMapTypeId(
      mapType === 'satellite' 
        ? googleMaps.MapTypeId.SATELLITE 
        : googleMaps.MapTypeId.ROADMAP
    )
  }, [mapType, mapRef])

  const toggleMapType = () => {
    if (!mapRef?.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps
    
    const newType = mapType === 'roadmap' ? 'satellite' : 'roadmap'
    setMapType(newType)
    
    if (mapRef.current) {
      mapRef.current.setMapTypeId(
        newType === 'satellite' 
          ? googleMaps.MapTypeId.SATELLITE 
          : googleMaps.MapTypeId.ROADMAP
      )
    }
  }

  return {
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
  }
}



