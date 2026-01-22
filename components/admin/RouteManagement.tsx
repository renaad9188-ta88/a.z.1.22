'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Plus, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import TripSchedulingModal from './TripSchedulingModal'
import CreateTripModal from './CreateTripModal'
import TripDetailsModal from './TripDetailsModal'
import RouteCard from './RouteCard'
import DriverCard from './DriverCard'
import DriverFormModal from './DriverFormModal'
import DriverHistoryModal from './DriverHistoryModal'
import type {
  VisitRequest,
  Route,
  Driver,
  RouteDriver,
  DriverAccount,
  DriverLocationLite,
  DriverLiveLite,
  RouteTripLite,
} from './types'

export default function RouteManagement() {
  const supabase = createSupabaseBrowserClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routeDrivers, setRouteDrivers] = useState<RouteDriver[]>([])
  const [driverAccounts, setDriverAccounts] = useState<DriverAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showCreateTrip, setShowCreateTrip] = useState(false)
  const [createTripType, setCreateTripType] = useState<'arrival' | 'departure'>('arrival')
  const [selectedRouteForTrip, setSelectedRouteForTrip] = useState<Route | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLocLoading, setDriverLocLoading] = useState<Record<string, boolean>>({})
  const [driverLastLoc, setDriverLastLoc] = useState<Record<string, DriverLocationLite | null>>({})
  const [driverLocHistory, setDriverLocHistory] = useState<Record<string, DriverLocationLite[]>>({})
  const [driverLiveMap, setDriverLiveMap] = useState<Record<string, DriverLiveLite | null>>({})
  const [openHistoryFor, setOpenHistoryFor] = useState<Driver | null>(null)
  const [routeTrips, setRouteTrips] = useState<Record<string, RouteTripLite[]>>({})
  const [routeTripsLoading, setRouteTripsLoading] = useState<Record<string, boolean>>({})
  const [tripAssignedDrivers, setTripAssignedDrivers] = useState<Record<string, Driver[]>>({})
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [routesRes, driversRes, routeDriversRes, driverAccountsRes] = await Promise.all([
        supabase.from('routes').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('route_drivers').select('*, driver:drivers(*)').eq('is_active', true),
        supabase.from('profiles').select('user_id, full_name, phone, role').order('updated_at', { ascending: false }),
      ])

      if (routesRes.error) throw routesRes.error
      if (driversRes.error) throw driversRes.error
      if (routeDriversRes.error) throw routeDriversRes.error
      if (driverAccountsRes.error) throw driverAccountsRes.error

      setRoutes(routesRes.data || [])
      setDrivers(driversRes.data || [])
      setRouteDrivers(routeDriversRes.data || [])
      setDriverAccounts((driverAccountsRes.data || []) as any)

      // Load availability status for all drivers
      const ids = (driversRes.data || []).map((d: any) => d.id).filter(Boolean)
      if (ids.length > 0) {
        const { data: liveRows } = await supabase
          .from('driver_live_status')
          .select('driver_id,is_available,updated_at')
          .in('driver_id', ids)
        const map: Record<string, DriverLiveLite | null> = {}
        ;(liveRows || []).forEach((r: any) => {
          map[r.driver_id] = {
            driver_id: r.driver_id,
            is_available: Boolean(r.is_available),
            updated_at: r.updated_at,
          }
        })
        setDriverLiveMap(map)
      } else {
        setDriverLiveMap({})
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const getAccountForDriver = (d: Driver) => {
    if (!d.user_id) return null
    return driverAccounts.find((a) => a.user_id === d.user_id) || null
  }

  const getAssignedRoutesCount = (driverId: string) => {
    return routeDrivers.filter((rd) => rd.driver_id === driverId && rd.is_active !== false).length
  }

  const loadDriverLastLocation = async (driverRow: Driver) => {
    try {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: true }))

      // أولاً: جرب قراءة من driver_live_status (النظام الجديد - "متاح")
      const { data: liveStatus, error: liveErr } = await supabase
        .from('driver_live_status')
        .select('lat,lng,is_available,updated_at')
        .eq('driver_id', driverRow.id)
        .maybeSingle()

      if (!liveErr && liveStatus && liveStatus.is_available && liveStatus.lat && liveStatus.lng) {
        // السائق متاح وله موقع مباشر
        setDriverLastLoc((p) => ({
          ...p,
          [driverRow.id]: {
            lat: liveStatus.lat,
            lng: liveStatus.lng,
            updated_at: liveStatus.updated_at,
            request_id: null,
            is_available: true,
          },
        }))
        toast.success(`السائق متاح - آخر تحديث: ${new Date(liveStatus.updated_at).toLocaleString('ar-JO')}`)
        return
      }

      // Fallback: جرب trip_driver_locations (النظام القديم - مرتبط بـ request_id)
      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)
      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setDriverLastLoc((p) => ({ ...p, [driverRow.id]: null }))
        toast('لا توجد خطوط مربوطة بهذا السائق بعد.')
        return
      }

      const { data: reqRows, error: reqErr } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .limit(100)
      if (reqErr) throw reqErr
      const requestIds = (reqRows || []).map((r: any) => r.id).filter(Boolean)
      if (requestIds.length === 0) {
        setDriverLastLoc((p) => ({ ...p, [driverRow.id]: null }))
        toast('لا توجد رحلات نشطة لهذا السائق حالياً. اطلب من السائق تفعيل "متاح" في لوحة السائق.')
        return
      }

      const { data: locRow, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('lat,lng,updated_at,request_id')
        .in('request_id', requestIds)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (locErr) throw locErr

      setDriverLastLoc((p) => ({ ...p, [driverRow.id]: (locRow as any) || null }))
      if (!locRow) {
        toast('لا يوجد موقع مُسجل بعد. اطلب من السائق تفعيل "متاح" في لوحة السائق أو تشغيل التتبع داخل صفحة تتبع رحلة راكب.')
      }
    } catch (e: any) {
      console.error('loadDriverLastLocation error:', e)
      toast.error(e?.message || 'تعذر جلب آخر موقع للسائق')
    } finally {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: false }))
    }
  }

  const loadDriverLocationHistory = async (driverRow: Driver) => {
    try {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: true }))
      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)
      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setDriverLocHistory((p) => ({ ...p, [driverRow.id]: [] }))
        toast('لا توجد خطوط مربوطة بهذا السائق بعد.')
        return
      }

      const { data: reqRows, error: reqErr } = await supabase
        .from('visit_requests')
        .select('id')
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .limit(100)
      if (reqErr) throw reqErr
      const requestIds = (reqRows || []).map((r: any) => r.id).filter(Boolean)
      if (requestIds.length === 0) {
        setDriverLocHistory((p) => ({ ...p, [driverRow.id]: [] }))
        toast('لا توجد رحلات نشطة لهذا السائق حالياً.')
        return
      }

      const { data: locRows, error: locErr } = await supabase
        .from('trip_driver_locations')
        .select('lat,lng,updated_at,request_id')
        .in('request_id', requestIds)
        .order('updated_at', { ascending: false })
        .limit(20)
      if (locErr) throw locErr

      setDriverLocHistory((p) => ({ ...p, [driverRow.id]: ((locRows as any) || []) as any }))
      setOpenHistoryFor(driverRow)
    } catch (e: any) {
      console.error('loadDriverLocationHistory error:', e)
      toast.error(e?.message || 'تعذر جلب سجل حركة السائق')
    } finally {
      setDriverLocLoading((p) => ({ ...p, [driverRow.id]: false }))
    }
  }

  const loadTripsForRoute = async (routeId: string) => {
    try {
      setRouteTripsLoading((p) => ({ ...p, [routeId]: true }))
      const { data: tripsData, error: tripsErr } = await supabase
        .from('route_trips')
        .select('id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,is_active,created_at')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })

      if (tripsErr) throw tripsErr

      const formattedTrips = (tripsData || []).map((trip: any) => ({
        id: trip.id,
        visitor_name: `${trip.start_location_name} → ${trip.end_location_name}`,
        city: trip.start_location_name,
        companions_count: 0,
        arrival_date: trip.trip_date,
        trip_status: trip.is_active ? 'مجدولة' : 'ملغاة',
        created_at: trip.created_at,
        meeting_time: trip.meeting_time,
        departure_time: trip.departure_time,
        start_location_name: trip.start_location_name,
        end_location_name: trip.end_location_name,
        start_lat: trip.start_lat,
        start_lng: trip.start_lng,
        end_lat: trip.end_lat,
        end_lng: trip.end_lng,
        trip_type: (trip.trip_type as any) || 'arrival',
      }))

      setRouteTrips((p) => ({ ...p, [routeId]: formattedTrips as any[] }))

      // Load assigned drivers for each trip
      const tripIds = formattedTrips.map((t: any) => t.id)
      if (tripIds.length > 0) {
        const { data: assignments, error: assignErr } = await supabase
          .from('route_trip_drivers')
          .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
          .in('trip_id', tripIds)
          .eq('is_active', true)

        if (!assignErr && assignments) {
          const driversByTrip: Record<string, Driver[]> = {}
          assignments.forEach((a: any) => {
            if (a.drivers && a.trip_id) {
              if (!driversByTrip[a.trip_id]) driversByTrip[a.trip_id] = []
              driversByTrip[a.trip_id].push(a.drivers as Driver)
            }
          })
          setTripAssignedDrivers((p) => ({ ...p, ...driversByTrip }))
        }
      }
    } catch (e: any) {
      console.error('loadTripsForRoute error:', e)
      toast.error(e?.message || 'تعذر تحميل رحلات هذا الخط')
      setRouteTrips((p) => ({ ...p, [routeId]: [] }))
    } finally {
      setRouteTripsLoading((p) => ({ ...p, [routeId]: false }))
    }
  }

  const openTripScheduling = async (requestId: string) => {
    try {
      const { data, error } = await supabase.from('visit_requests').select('*').eq('id', requestId).single()
      if (error) throw error
      setSchedulingRequest((data as any) || null)
    } catch (e: any) {
      console.error('openTripScheduling error:', e)
      toast.error(e?.message || 'تعذر فتح نافذة تحديد موعد الرحلة')
    }
  }

  const toggleDriverActive = async (driverId: string, nextActive: boolean) => {
    try {
      const { error } = await supabase.from('drivers').update({ is_active: nextActive }).eq('id', driverId)
      if (error) throw error
      toast.success(nextActive ? 'تم تفعيل السائق' : 'تم تعطيل السائق')
      loadData()
    } catch (e: any) {
      console.error('toggleDriverActive error:', e)
      toast.error(e?.message || 'تعذر تحديث حالة السائق')
    }
  }

  const deleteDriver = async (driverId: string) => {
    if (!confirm('هل أنت متأكد من حذف السائق؟ سيتم إزالة ربطه بالخطوط وإلغاء تعيينه من الرحلات.')) return
    try {
      const { error } = await supabase.from('drivers').delete().eq('id', driverId)
      if (error) throw error
      toast.success('تم حذف السائق')
      loadData()
    } catch (e: any) {
      console.error('deleteDriver error:', e)
      toast.error(e?.message || 'تعذر حذف السائق')
    }
  }

  const handleAddDriver = async (formData: FormData) => {
    try {
      const userIdRaw = String(formData.get('user_id') || '').trim()
      const userId = userIdRaw ? userIdRaw : null
      const driverName = String(formData.get('name') || '').trim()
      const driverPhone = String(formData.get('phone') || '').trim()
      const vehicleType = String(formData.get('vehicle_type') || '').trim()
      const seatsCount = parseInt(String(formData.get('seats_count') || '0'), 10)

      if (!driverName || !driverPhone || !vehicleType || !Number.isFinite(seatsCount) || seatsCount <= 0) {
        throw new Error('يرجى تعبئة بيانات السائق بشكل صحيح')
      }

      let driverId: string | null = null
      if (userId) {
        const { data: existingDriver, error: findErr } = await supabase
          .from('drivers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        if (findErr) throw findErr

        if (existingDriver?.id) {
          driverId = existingDriver.id
          const { error: updErr } = await supabase
            .from('drivers')
            .update({
              name: driverName,
              phone: driverPhone,
              vehicle_type: vehicleType,
              seats_count: seatsCount,
              is_active: true,
            })
            .eq('id', driverId)
          if (updErr) throw updErr
        } else {
          const { data: inserted, error } = await supabase
            .from('drivers')
            .insert({
              name: driverName,
              phone: driverPhone,
              vehicle_type: vehicleType,
              seats_count: seatsCount,
              is_active: true,
              user_id: userId,
            })
            .select('id,user_id')
            .maybeSingle()
          if (error) throw error
          driverId = inserted?.id || null
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('drivers')
          .insert({
            name: driverName,
            phone: driverPhone,
            vehicle_type: vehicleType,
            seats_count: seatsCount,
            is_active: true,
          })
          .select('id')
          .maybeSingle()
        if (error) throw error
        driverId = inserted?.id || null
      }

      if (userId) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert(
            { user_id: userId, role: 'driver', full_name: driverName || null, phone: driverPhone || null } as any,
            { onConflict: 'user_id' }
          )

        if (profileErr) {
          console.warn('Could not update profile role to driver:', profileErr)
          toast.error(
            'تم إضافة السائق لكن لم نتمكن من تعيين دوره كسائق بسبب صلاحيات قاعدة البيانات (RLS). نفّذ ملف: supabase/ALLOW_ADMIN_MANAGE_PROFILES.sql',
            { duration: 8000 }
          )
        }
      }

      toast.success(userId ? 'تم حفظ السائق وربطه بالحساب بنجاح' : 'تم إضافة السائق بنجاح')
      setShowAddDriver(false)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إضافة السائق')
    }
  }

  const handleAssignDriverToTrip = async (tripId: string, driverId: string, routeId: string) => {
    try {
      const { error } = await supabase
        .from('route_trip_drivers')
        .upsert({ trip_id: tripId, driver_id: driverId, is_active: true }, { onConflict: 'trip_id,driver_id' })
      if (error) throw error

      const { data: driverData } = await supabase
        .from('drivers')
        .select('id, name, vehicle_type, phone')
        .eq('id', driverId)
        .single()

      if (driverData) {
        setTripAssignedDrivers((p) => ({
          ...p,
          [tripId]: [...(p[tripId] || []), driverData as Driver],
        }))
      }

      toast.success('تم ربط السائق بالرحلة بنجاح')
    } catch (e: any) {
      console.error('Assign driver to trip error:', e)
      toast.error(e?.message || 'تعذر ربط السائق بالرحلة')
    }
  }

  const handleAssignDriver = async (routeId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('route_drivers')
        .upsert(
          {
            route_id: routeId,
            driver_id: driverId,
            is_active: true,
          },
          { onConflict: 'route_id,driver_id' }
        )

      if (error) throw error
      toast.success('تم ربط السائق بالخط بنجاح')
      loadData()
    } catch (error: any) {
      toast.error('حدث خطأ أثناء ربط السائق')
    }
  }

  if (loading) {
    return <div className="p-4 text-center">جاري التحميل...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الخطوط والسائقين</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          {routes.length > 0 && (
            <>
              <button
                onClick={() => {
                  setSelectedRouteForTrip(routes[0])
                  setCreateTripType('arrival')
                  setShowCreateTrip(true)
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base font-bold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                <span className="hidden sm:inline">إنشاء رحلات القادمين</span>
                <span className="sm:hidden">إنشاء القادمين</span>
              </button>
              <button
                onClick={() => {
                  setSelectedRouteForTrip(routes[0])
                  setCreateTripType('departure')
                  setShowCreateTrip(true)
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base font-bold"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                <span className="hidden sm:inline">إنشاء رحلات المغادرين</span>
                <span className="sm:hidden">إنشاء المغادرين</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowAddDriver(true)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-bold"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            إضافة سائق
          </button>
        </div>
      </div>

      {/* Routes List */}
      <div className="grid gap-4 sm:gap-5 md:gap-6">
        {routes.map((route) => {
          const assignedDrivers = routeDrivers
            .filter((rd) => rd.route_id === route.id)
            .map((rd) => rd.driver)
            .filter(Boolean) as Driver[]
          const availableDrivers = drivers.filter((d) => !assignedDrivers.find((ad) => ad.id === d.id))

          // Convert driverLiveMap to match RouteCard's expected type
          const convertedDriverLiveMap: Record<string, { is_available: boolean; updated_at: string }> = {}
          Object.entries(driverLiveMap).forEach(([driverId, live]) => {
            if (live) {
              convertedDriverLiveMap[driverId] = {
                is_available: live.is_available,
                updated_at: live.updated_at,
              }
            }
          })

          return (
            <RouteCard
              key={route.id}
              route={route}
              assignedDrivers={assignedDrivers}
              driverLiveMap={convertedDriverLiveMap}
              routeTrips={routeTrips[route.id] || []}
              routeTripsLoading={routeTripsLoading[route.id] || false}
              tripAssignedDrivers={tripAssignedDrivers}
              allDrivers={drivers}
              availableDrivers={availableDrivers}
              onAssignDriver={handleAssignDriver}
              onLoadTrips={() => loadTripsForRoute(route.id)}
              onAssignDriverToTrip={handleAssignDriverToTrip}
              onCreateArrivalTrip={() => {
                setSelectedRouteForTrip(route)
                setCreateTripType('arrival')
                setShowCreateTrip(true)
              }}
              onCreateDepartureTrip={() => {
                setSelectedRouteForTrip(route)
                setCreateTripType('departure')
                setShowCreateTrip(true)
              }}
              onEditTrip={(tripId) => setSelectedTripId(tripId)}
            />
          )
        })}
      </div>

      {/* Drivers Overview */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              السائقون (الكل)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              عرض السائقين المضافين + ربطهم بالحساب + آخر موقع مُسجل + تواصل مباشر
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف..."
              className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 md:gap-5">
          {drivers
            .filter((d) => {
              const q = driverSearch.trim()
              if (!q) return true
              const qq = q.toLowerCase()
              return (
                d.name.toLowerCase().includes(qq) ||
                (d.phone || '').toLowerCase().includes(qq) ||
                (d.vehicle_type || '').toLowerCase().includes(qq)
              )
            })
            .map((d) => {
              const acc = getAccountForDriver(d)
              const routesCount = getAssignedRoutesCount(d.id)
              const lastLoc = driverLastLoc[d.id] || null
              const live = driverLiveMap[d.id] || null

              return (
                <DriverCard
                  key={d.id}
                  driver={d}
                  account={acc}
                  routesCount={routesCount}
                  lastLocation={lastLoc}
                  liveStatus={live}
                  locationLoading={driverLocLoading[d.id] || false}
                  onLoadLastLocation={() => loadDriverLastLocation(d)}
                  onLoadLocationHistory={() => loadDriverLocationHistory(d)}
                  onToggleActive={(nextActive) => toggleDriverActive(d.id, nextActive)}
                  onDelete={() => deleteDriver(d.id)}
                />
              )
            })}

          {drivers.length === 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
              لا يوجد سائقون بعد. اضغط "إضافة سائق" لإنشاء أول سائق.
            </div>
          )}
        </div>
      </div>

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
            createTripType === 'departure'
              ? {
                  name: selectedRouteForTrip.end_location_name,
                  lat: selectedRouteForTrip.end_lat,
                  lng: selectedRouteForTrip.end_lng,
                }
              : {
                  name: selectedRouteForTrip.start_location_name,
                  lat: selectedRouteForTrip.start_lat,
                  lng: selectedRouteForTrip.start_lng,
                }
          }
          defaultEnd={
            createTripType === 'departure'
              ? {
                  name: selectedRouteForTrip.start_location_name,
                  lat: selectedRouteForTrip.start_lat,
                  lng: selectedRouteForTrip.start_lng,
                }
              : {
                  name: selectedRouteForTrip.end_location_name,
                  lat: selectedRouteForTrip.end_lat,
                  lng: selectedRouteForTrip.end_lng,
                }
          }
          onClose={() => {
            setShowCreateTrip(false)
            setSelectedRouteForTrip(null)
          }}
          onSuccess={() => {
            if (selectedRouteForTrip) {
              loadTripsForRoute(selectedRouteForTrip.id)
            }
            toast.success('تم إنشاء الرحلة بنجاح')
          }}
        />
      )}

      {/* Trip Details Modal */}
      {selectedTripId && (
        <TripDetailsModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          onUpdate={() => {
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
            const rid = (schedulingRequest as any)?.route_id as string | undefined
            if (rid) loadTripsForRoute(rid)
          }}
          isAdmin
        />
      )}

      {/* Add Driver Modal */}
      {showAddDriver && (
        <DriverFormModal
          driverAccounts={driverAccounts}
          onClose={() => setShowAddDriver(false)}
          onSubmit={handleAddDriver}
        />
      )}
    </div>
  )
}
