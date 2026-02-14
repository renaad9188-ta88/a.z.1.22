import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export function useDriverLocation(isLoggedIn: boolean, hasUserTrip: boolean) {
  const supabase = createSupabaseBrowserClient()
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [driverLocationLoading, setDriverLocationLoading] = useState(false)
  const [driverInfo, setDriverInfo] = useState<{ name: string; phone: string; company_phone?: string | null } | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const loadDriverLocation = async (requestId: string, tripId: string) => {
    // فقط للمستخدم المسجل الذي لديه رحلة
    if (!isLoggedIn || !hasUserTrip) {
      return
    }
    
    try {
      setDriverLocationLoading(true)
      
      // Get assigned driver from visit_requests
      const { data: requestData } = await supabase
        .from('visit_requests')
        .select('assigned_driver_id, route_id')
        .eq('id', requestId)
        .maybeSingle()
      
      let assignedDriverId: string | null = (requestData as any)?.assigned_driver_id || null
      
      // Fallback: إذا لم يتم تعيين سائق داخل الطلب، جرب السائق/السائقين المعيّنين للرحلة
      if (!assignedDriverId && tripId) {
        const { data: tripDriverData } = await supabase
          .from('route_trip_drivers')
          .select('driver_id')
          .eq('trip_id', tripId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()
        
        assignedDriverId = (tripDriverData as any)?.driver_id || null
      }
      
      if (!assignedDriverId) {
        setDriverLocation(null)
        setDriverInfo(null)
        return
      }

      // Load driver info
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, name, phone')
        .eq('id', assignedDriverId)
        .maybeSingle()

      // Load route info for company phone (if exists)
      let companyPhone: string | null = null
      if ((requestData as any)?.route_id) {
        const { data: routeData } = await supabase
          .from('routes')
          .select('company_phone, contact_phone')
          .eq('id', (requestData as any).route_id)
          .maybeSingle()
        
        companyPhone = (routeData as any)?.company_phone || (routeData as any)?.contact_phone || null
      }

      if (driverData) {
        setDriverInfo({
          name: driverData.name || 'السائق',
          phone: driverData.phone || '',
          company_phone: companyPhone,
        })
      }
      
      // Try to get driver location from driver_live_status (live tracking)
      const { data: liveStatus, error: liveErr } = await supabase
        .from('driver_live_status')
        .select('lat, lng, is_available, updated_at')
        .eq('driver_id', assignedDriverId)
        .eq('is_available', true)
        .maybeSingle()
      
      if (!liveErr && liveStatus && liveStatus.lat && liveStatus.lng) {
        // Check if location is recent (within last 5 minutes)
        const updatedAt = new Date(liveStatus.updated_at).getTime()
        const now = Date.now()
        const FIVE_MINUTES = 5 * 60 * 1000
        
        if (now - updatedAt < FIVE_MINUTES) {
          setDriverLocation({ lat: Number(liveStatus.lat), lng: Number(liveStatus.lng) })
          
          // Clear existing interval if any
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          
          // Set up polling to update driver location every 30 seconds
          pollIntervalRef.current = setInterval(async () => {
            const { data: updatedStatus } = await supabase
              .from('driver_live_status')
              .select('lat, lng, is_available, updated_at')
              .eq('driver_id', assignedDriverId)
              .eq('is_available', true)
              .maybeSingle()
            
            if (updatedStatus && updatedStatus.lat && updatedStatus.lng) {
              const updatedAt = new Date(updatedStatus.updated_at).getTime()
              const now = Date.now()
              if (now - updatedAt < FIVE_MINUTES) {
                setDriverLocation({ lat: Number(updatedStatus.lat), lng: Number(updatedStatus.lng) })
              } else {
                setDriverLocation(null)
                if (pollIntervalRef.current) {
                  clearInterval(pollIntervalRef.current)
                  pollIntervalRef.current = null
                }
              }
            } else {
              setDriverLocation(null)
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
            }
          }, 30000) // Poll every 30 seconds
        } else {
          setDriverLocation(null)
        }
      } else {
        setDriverLocation(null)
      }
    } catch (e) {
      console.error('Error loading driver location:', e)
      setDriverLocation(null)
    } finally {
      setDriverLocationLoading(false)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [])

  return {
    driverLocation,
    driverLocationLoading,
    driverInfo,
    setDriverInfo,
    loadDriverLocation,
  }
}



