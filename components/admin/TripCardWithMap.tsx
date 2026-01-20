'use client'

import { useEffect, useRef, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { MapPin, Navigation, Edit, Plus, Trash2, Bus } from 'lucide-react'
import LocationSelector from '@/components/driver/LocationSelector'

type Trip = {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  start_lat: number
  start_lng: number
  end_location_name: string
  end_lat: number
  end_lng: number
}

type StopPoint = {
  id: string
  name: string
  lat: number
  lng: number
  order_index: number
}

type DriverLocation = {
  driver_id: string
  lat: number
  lng: number
  driver_name: string
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if ((window as any).google?.maps) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')))
      return
    }

    const script = document.createElement('script')
    script.dataset.googleMaps = '1'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=ar`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps failed to load'))
    document.head.appendChild(script)
  })
}

export default function TripCardWithMap({
  trip,
  onUpdate,
  onEditTrip,
  assignedDrivers,
  allDrivers,
  onAssignDriver,
}: {
  trip: Trip
  onUpdate?: () => void
  onEditTrip?: () => void
  assignedDrivers?: Array<{ id: string; name: string; vehicle_type: string }>
  allDrivers?: Array<{ id: string; name: string; vehicle_type: string; is_active?: boolean }>
  onAssignDriver?: (tripId: string, driverId: string) => void
}) {
  const supabase = createSupabaseBrowserClient()
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapObjRef = useRef<google.maps.Map | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  
  const [mapsReady, setMapsReady] = useState(false)
  const [stopPoints, setStopPoints] = useState<StopPoint[]>([])
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([])
  const [showAddStop, setShowAddStop] = useState(false)
  const [editingStopIndex, setEditingStopIndex] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setMapsReady(true)
      } catch (e) {
        console.error('Failed to load Google Maps API:', e)
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey])

  useEffect(() => {
    loadStopPoints()
    loadDriverLocations()
  }, [trip.id])

  const loadStopPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('route_trip_stop_points')
        .select('*')
        .eq('trip_id', trip.id)
        .order('order_index', { ascending: true })
      
      if (error) throw error
      setStopPoints((data || []) as StopPoint[])
    } catch (e: any) {
      console.error('Load stop points error:', e)
    }
  }

  const loadDriverLocations = async () => {
    try {
      // Get assigned drivers
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('driver_id, drivers(id, name)')
        .eq('trip_id', trip.id)
        .eq('is_active', true)
      
      if (assignErr) throw assignErr
      const driverIds = (assignments || []).map((a: any) => a.driver_id).filter(Boolean)
      
      if (driverIds.length === 0) {
        setDriverLocations([])
        return
      }
      
      // Get live locations
      const { data: liveData, error: liveErr } = await supabase
        .from('driver_live_status')
        .select('driver_id, lat, lng, drivers(id, name)')
        .in('driver_id', driverIds)
        .eq('is_available', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
      
      if (liveErr) throw liveErr
      
      const locations = (liveData || []).map((d: any) => ({
        driver_id: d.driver_id,
        lat: d.lat,
        lng: d.lng,
        driver_name: d.drivers?.name || 'سائق',
      })) as DriverLocation[]
      
      setDriverLocations(locations)
    } catch (e: any) {
      console.error('Load driver locations error:', e)
    }
  }

  useEffect(() => {
    if (!mapsReady || !expanded || !mapRef.current || !trip) return
    if (!(window as any).google?.maps) return

    const googleMaps = (window as any).google.maps as typeof google.maps

    // Initialize map
    if (!mapObjRef.current) {
      const center = { lat: trip.start_lat, lng: trip.start_lng }
      mapObjRef.current = new googleMaps.Map(mapRef.current!, {
        center,
        zoom: 10,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })
    }

    const map = mapObjRef.current

    // Clear previous markers
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // Add start marker
    const startMarker = new googleMaps.Marker({
      position: { lat: trip.start_lat, lng: trip.start_lng },
      map,
      title: `نقطة الانطلاق: ${trip.start_location_name}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        scaledSize: new googleMaps.Size(32, 32),
      },
      label: {
        text: 'بداية',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '10px',
      },
    })
    markersRef.current.push(startMarker)

    // Add stop points markers
    stopPoints.forEach((stop, idx) => {
      const stopMarker = new googleMaps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        title: `${idx + 1}. ${stop.name}`,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new googleMaps.Size(28, 28),
        },
        label: {
          text: String(idx + 1),
          color: 'white',
          fontWeight: 'bold',
          fontSize: '10px',
        },
      })
      markersRef.current.push(stopMarker)
    })

    // Add end marker
    const endMarker = new googleMaps.Marker({
      position: { lat: trip.end_lat, lng: trip.end_lng },
      map,
      title: `نقطة الوصول: ${trip.end_location_name}`,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new googleMaps.Size(32, 32),
      },
      label: {
        text: 'نهاية',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '10px',
      },
    })
    markersRef.current.push(endMarker)

    // Add driver locations
    driverLocations.forEach((driverLoc) => {
      const driverMarker = new googleMaps.Marker({
        position: { lat: driverLoc.lat, lng: driverLoc.lng },
        map,
        title: `موقع السائق: ${driverLoc.driver_name}`,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/bus.png',
          scaledSize: new googleMaps.Size(36, 36),
        },
      })
      markersRef.current.push(driverMarker)
    })

    // Draw route
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new googleMaps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3B82F6',
          strokeWeight: 3,
          strokeOpacity: 0.8,
        },
      })
    }

    const directionsService = new googleMaps.DirectionsService()
    const waypoints: google.maps.DirectionsWaypoint[] = stopPoints.map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
      stopover: true,
    }))

    directionsService.route(
      {
        origin: { lat: trip.start_lat, lng: trip.start_lng },
        destination: { lat: trip.end_lat, lng: trip.end_lng },
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        travelMode: googleMaps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === googleMaps.DirectionsStatus.OK && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result)
          
          // Fit bounds
          const bounds = new googleMaps.LatLngBounds()
          bounds.extend({ lat: trip.start_lat, lng: trip.start_lng })
          stopPoints.forEach((stop) => bounds.extend({ lat: stop.lat, lng: stop.lng }))
          bounds.extend({ lat: trip.end_lat, lng: trip.end_lng })
          driverLocations.forEach((loc) => bounds.extend({ lat: loc.lat, lng: loc.lng }))
          map.fitBounds(bounds, 30)
        }
      }
    )
  }, [mapsReady, expanded, trip, stopPoints, driverLocations])

  const handleAddStop = async (point: { name: string; lat: number; lng: number }) => {
    try {
      const orderIndex = editingStopIndex !== null 
        ? stopPoints[editingStopIndex].order_index 
        : (stopPoints.length > 0 ? Math.max(...stopPoints.map(s => s.order_index)) + 1 : 1)

      if (editingStopIndex !== null) {
        // Update existing
        const { error } = await supabase
          .from('route_trip_stop_points')
          .update({
            name: point.name,
            lat: point.lat,
            lng: point.lng,
          })
          .eq('id', stopPoints[editingStopIndex].id)
        
        if (error) throw error
        toast.success('تم تحديث محطة التوقف')
      } else {
        // Add new
        const { error } = await supabase
          .from('route_trip_stop_points')
          .insert({
            trip_id: trip.id,
            name: point.name,
            lat: point.lat,
            lng: point.lng,
            order_index: orderIndex,
          })
        
        if (error) throw error
        toast.success('تم إضافة محطة التوقف')
      }
      
      await loadStopPoints()
      setShowAddStop(false)
      setEditingStopIndex(null)
      onUpdate?.()
    } catch (e: any) {
      console.error('Add/update stop error:', e)
      toast.error(e?.message || 'تعذر حفظ محطة التوقف')
    }
  }

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المحطة؟')) return
    
    try {
      const { error } = await supabase
        .from('route_trip_stop_points')
        .delete()
        .eq('id', stopId)
      
      if (error) throw error
      toast.success('تم حذف محطة التوقف')
      await loadStopPoints()
      onUpdate?.()
    } catch (e: any) {
      console.error('Delete stop error:', e)
      toast.error(e?.message || 'تعذر حذف محطة التوقف')
    }
  }

  // Refresh driver locations every 30 seconds when expanded
  useEffect(() => {
    if (!expanded) return
    const interval = setInterval(() => {
      loadDriverLocations()
    }, 30000)
    return () => clearInterval(interval)
  }, [expanded, trip.id])

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-gray-900 truncate">
            {trip.start_location_name} → {trip.end_location_name}
          </div>
          <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span>التاريخ: {trip.trip_date}</span>
            {trip.meeting_time && <span>تجمع: {trip.meeting_time}</span>}
            {trip.departure_time && <span>انطلاق: {trip.departure_time}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-semibold"
          >
            {expanded ? 'إخفاء الخريطة' : 'عرض الخريطة'}
          </button>
          {onEditTrip && (
            <button
              type="button"
              onClick={onEditTrip}
              className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-semibold"
            >
              <Edit className="w-4 h-4 inline mr-1" />
              تعديل
            </button>
          )}
        </div>
      </div>

      {/* Assigned Drivers Display */}
      {(assignedDrivers || []).length > 0 && (
        <div className="border-t border-gray-100 pt-2">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            السائقون المعيّنون:
          </label>
          <div className="flex flex-wrap gap-2">
            {(assignedDrivers || []).map((driver) => (
              <span
                key={driver.id}
                className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm font-medium border border-green-200"
              >
                <Bus className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">{driver.name}</span>
                <span className="hidden sm:inline">({driver.vehicle_type})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Assign Driver to Trip */}
      {allDrivers && onAssignDriver && (
        <div className="border-t border-gray-100 pt-2">
          <label className="block text-xs font-semibold text-gray-700 mb-2">
            {assignedDrivers && assignedDrivers.length > 0 ? 'إضافة سائق آخر:' : 'تعيين سائق للرحلة:'}
          </label>
          <div className="flex gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAssignDriver(trip.id, e.target.value)
                  e.target.value = ''
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">اختر سائق...</option>
              {allDrivers
                .filter(d => d.is_active !== false && !assignedDrivers?.find(ad => ad.id === d.id))
                .map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} - {driver.vehicle_type}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {expanded && (
        <div className="space-y-3">
          {/* Map */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-2 bg-blue-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                خريطة مسار الرحلة
                {driverLocations.length > 0 && (
                  <span className="text-green-600">• {driverLocations.length} سائق متاح</span>
                )}
              </h4>
            </div>
            <div ref={mapRef} className="w-full h-[300px] sm:h-[400px]" />
          </div>

          {/* Stop Points Management */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600" />
                محطات التوقف ({stopPoints.length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingStopIndex(null)
                  setShowAddStop(true)
                }}
                className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                إضافة محطة
              </button>
            </div>
            
            <div className="space-y-2">
              {stopPoints.map((stop, idx) => (
                <div key={stop.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate">{stop.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStopIndex(idx)
                        setShowAddStop(true)
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="تعديل"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStop(stop.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="حذف"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {stopPoints.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">لا توجد محطات توقف</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Stop Modal */}
      {showAddStop && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h4 className="text-lg font-bold text-gray-800 mb-4">
                {editingStopIndex !== null ? `تعديل محطة التوقف ${editingStopIndex + 1}` : 'إضافة محطة توقف جديدة'}
              </h4>
              <LocationSelector
                title={editingStopIndex !== null ? `محطة التوقف ${editingStopIndex + 1}` : 'محطة التوقف'}
                initial={editingStopIndex !== null ? stopPoints[editingStopIndex] : null}
                onSelect={handleAddStop}
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStop(false)
                    setEditingStopIndex(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

