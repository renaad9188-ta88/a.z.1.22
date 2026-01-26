'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Trash2, Edit, Bus, Users, Phone, Navigation, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import TripSchedulingModal from './TripSchedulingModal'
import CreateTripModal from './CreateTripModal'
import TripDetailsModal from './TripDetailsModal'
import TripCardWithMap from './TripCardWithMap'
import type { VisitRequest } from './types'

type Route = {
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

type Driver = {
  id: string
  name: string
  phone: string
  vehicle_type: string
  seats_count: number
  is_active: boolean
  user_id?: string | null
}

type RouteDriver = {
  id: string
  route_id: string
  driver_id: string
  is_active?: boolean
  driver?: Driver
}

type DriverAccount = {
  user_id: string
  full_name: string | null
  phone: string | null
  role: string | null
}

type DriverLocationLite = {
  lat: number
  lng: number
  updated_at: string
  request_id: string | null
  is_available?: boolean // للتمييز بين driver_live_status و trip_driver_locations
}

type DriverLiveLite = { driver_id: string; is_available: boolean; updated_at: string }

type RouteTripLite = {
  id: string
  visitor_name: string
  city: string
  companions_count: number | null
  arrival_date: string | null
  trip_status: string | null
  created_at: string
  meeting_time?: string | null
  departure_time?: string | null
  start_location_name?: string
  end_location_name?: string
  start_lat?: number
  start_lng?: number
  end_lat?: number
  end_lng?: number
  trip_type?: 'arrival' | 'departure'
}

export default function RouteManagement() {
  const supabase = createSupabaseBrowserClient()
  const [routes, setRoutes] = useState<Route[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [routeDrivers, setRouteDrivers] = useState<RouteDriver[]>([])
  const [driverAccounts, setDriverAccounts] = useState<DriverAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRoute, setShowAddRoute] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showCreateTrip, setShowCreateTrip] = useState(false)
  const [createTripType, setCreateTripType] = useState<'arrival' | 'departure'>('arrival')
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [selectedRouteForTrip, setSelectedRouteForTrip] = useState<Route | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLocLoading, setDriverLocLoading] = useState<Record<string, boolean>>({})
  const [driverLastLoc, setDriverLastLoc] = useState<Record<string, DriverLocationLite | null>>({})
  const [driverLocHistory, setDriverLocHistory] = useState<Record<string, DriverLocationLite[]>>({})
  const [driverLiveMap, setDriverLiveMap] = useState<Record<string, DriverLiveLite | null>>({})
  const [openHistoryFor, setOpenHistoryFor] = useState<Driver | null>(null)
  const [expandedRouteTrips, setExpandedRouteTrips] = useState<Record<string, boolean>>({})
  const [routeTrips, setRouteTrips] = useState<Record<string, RouteTripLite[]>>({})
  const [routeTripsLoading, setRouteTripsLoading] = useState<Record<string, boolean>>({})
  const [tripAssignedDrivers, setTripAssignedDrivers] = useState<Record<string, Driver[]>>({})
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)
  const [driverForm, setDriverForm] = useState({
    user_id: '',
    name: '',
    phone: '',
    vehicle_type: 'حافلة',
    seats_count: '',
  })
  const [driverAutofill, setDriverAutofill] = useState<{ name: boolean; phone: boolean }>({
    name: false,
    phone: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!showAddDriver) return
    setDriverForm({
      user_id: '',
      name: '',
      phone: '',
      vehicle_type: 'حافلة',
      seats_count: '',
    })
    setDriverAutofill({ name: false, phone: false })
  }, [showAddDriver])

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

      // Load availability status for all drivers (so admin sees "متاح" مباشرة)
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

  const normalizePhoneForWhatsApp = (raw: string) => {
    const digits = (raw || '').replace(/[^\d]/g, '')
    // إذا الرقم قصير، نستخدم wa.me/?text كـ fallback
    return digits.length >= 10 ? digits : ''
  }

  const normalizePhoneForTel = (raw: string) => (raw || '').replace(/[^\d+]/g, '')

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
            request_id: null, // لا يرتبط بـ request محدد
            is_available: true
          }
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
      // Load trips from route_trips table (admin-created trips)
      const { data: tripsData, error: tripsErr } = await supabase
        .from('route_trips')
        .select('id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,is_active,created_at')
        .eq('route_id', routeId)
        .eq('is_active', true)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
      
      if (tripsErr) throw tripsErr
      
      // Format as RouteTripLite for display
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

      // إذا كان هناك user_id: قد يكون السائق موجود مسبقاً -> نحدّث بدل أن نفشل بسبب UNIQUE(user_id)
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
        // بدون ربط: إدخال سائق جديد (بدون تسجيل دخول)
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

      // إذا تم ربطه بحساب، تأكد أن role في profiles = driver (للوصول إلى /driver)
      if (userId) {
        // IMPORTANT: استخدم UPSERT لأن بعض الحسابات قد لا يكون لديها profile أصلاً
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
        .upsert(
          { trip_id: tripId, driver_id: driverId, is_active: true },
          { onConflict: 'trip_id,driver_id' }
        )
      if (error) throw error
      
      // Reload assigned drivers for this trip
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
      const { error } = await supabase.from('route_drivers').upsert({
        route_id: routeId,
        driver_id: driverId,
        is_active: true,
      }, { onConflict: 'route_id,driver_id' })

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900">إدارة الخطوط والسائقين</h2>
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
      <div className="grid gap-3 sm:gap-4 lg:gap-6">
        {routes.map((route) => {
          const assignedDrivers = routeDrivers
            .filter(rd => rd.route_id === route.id)
            .map(rd => rd.driver)
            .filter(Boolean) as Driver[]

          return (
            <div key={route.id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6 overflow-hidden">
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
                        handleAssignDriver(route.id, e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      رحلات هذا الخط (مواعيد + كشف أسماء)
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRouteForTrip(route)
                          setCreateTripType('arrival')
                          setShowCreateTrip(true)
                        }}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold"
                        title="إنشاء رحلة القادمين"
                      >
                        + القادمين
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRouteForTrip(route)
                          setCreateTripType('departure')
                          setShowCreateTrip(true)
                        }}
                        className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition text-xs sm:text-sm font-bold"
                        title="إنشاء رحلة المغادرين"
                      >
                        + المغادرين
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedRouteTrips((p) => ({ ...p, [route.id]: !p[route.id] }))
                          // lazy-load when opening
                          const willOpen = !expandedRouteTrips[route.id]
                          if (willOpen) loadTripsForRoute(route.id)
                        }}
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-xs sm:text-sm font-bold"
                      >
                        {expandedRouteTrips[route.id] ? 'إخفاء' : 'عرض'}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadTripsForRoute(route.id)}
                        disabled={Boolean(routeTripsLoading[route.id])}
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 transition text-xs sm:text-sm font-bold disabled:opacity-50"
                      >
                        {routeTripsLoading[route.id] ? 'جارٍ التحديث...' : 'تحديث'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const list = routeTrips[route.id] || []
                          if (list.length === 0) {
                            toast('لا يوجد كشف للنسخ. افتح "عرض" ثم حدّث.')
                            return
                          }
                          const lines = list
                            .map((r, idx) => {
                              const people = 1 + (Number(r.companions_count || 0) || 0)
                              const date = r.arrival_date || '-'
                              const status = r.trip_status || '-'
                              return `${idx + 1}) ${r.visitor_name} — ${people} أشخاص — ${r.city} — ${date} — ${status}`
                            })
                            .join('\n')
                          try {
                            await navigator.clipboard.writeText(lines)
                            toast.success('تم نسخ كشف الأسماء')
                          } catch {
                            toast.error('تعذر نسخ الكشف')
                          }
                        }}
                        className="px-3 py-2 rounded-lg bg-green-50 text-green-800 hover:bg-green-100 transition text-xs sm:text-sm font-bold"
                        title="نسخ كشف الركاب لهذه الرحلات"
                      >
                        نسخ الكشف
                      </button>
                    </div>
                  </div>

                  {expandedRouteTrips[route.id] && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setExpandedRouteTrips((p) => ({ ...p, [`${route.id}__tab`]: true }))}
                          className="px-3 py-1.5 rounded-lg bg-green-50 text-green-800 border border-green-200 text-xs font-bold"
                        >
                          القادمون
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedRouteTrips((p) => ({ ...p, [`${route.id}__tab`]: false }))}
                          className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold"
                        >
                          المغادرون
                        </button>
                      </div>

                      {(routeTrips[route.id] || []).length === 0 ? (
                        <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                          لا توجد رحلات مجدولة لهذا الخط بعد. استخدم زر &quot;تحديد موعد&quot; داخل طلب الزيارة أو من القائمة أدناه بعد ظهورها.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(routeTrips[route.id] || [])
                            .filter((t) => {
                              const tabIsArrival = Boolean((expandedRouteTrips as any)[`${route.id}__tab`] ?? true)
                              return tabIsArrival ? (t.trip_type || 'arrival') === 'arrival' : (t.trip_type || 'arrival') === 'departure'
                            })
                            .map((t) => {
                            return (
                              <TripCardWithMap
                                key={t.id}
                                trip={{
                                  id: t.id,
                                  trip_date: t.arrival_date || '',
                                  meeting_time: t.meeting_time || null,
                                  departure_time: t.departure_time || null,
                                  start_location_name: t.start_location_name || '',
                                  start_lat: t.start_lat || 0,
                                  start_lng: t.start_lng || 0,
                                  end_location_name: t.end_location_name || '',
                                  end_lat: t.end_lat || 0,
                                  end_lng: t.end_lng || 0,
                                  trip_type: (t.trip_type as any) || 'arrival',
                                }}
                                onUpdate={() => loadTripsForRoute(route.id)}
                                onEditTrip={() => setSelectedTripId(t.id)}
                                assignedDrivers={tripAssignedDrivers[t.id]}
                                allDrivers={drivers}
                                onAssignDriver={(tripId, driverId) => handleAssignDriverToTrip(tripId, driverId, route.id)}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Drivers Overview */}
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              السائقون (الكل)
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
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

        <div className="grid gap-3 sm:gap-4">
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
              const waDigits = normalizePhoneForWhatsApp(d.phone || '')
              const waHref = waDigits ? `https://wa.me/${waDigits}` : `https://wa.me/?text=${encodeURIComponent(`تواصل مع السائق: ${d.name} — ${d.phone}`)}`
              const telDigits = normalizePhoneForTel(d.phone || '')
              const telHref = telDigits ? `tel:${telDigits}` : ''
              const mapHref =
                lastLoc ? `https://www.google.com/maps?q=${lastLoc.lat},${lastLoc.lng}` : ''

              return (
                <div key={d.id} className="border border-gray-200 rounded-xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900">{d.name}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${d.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {d.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                        {live?.is_available ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-green-600 text-white border-green-700">
                            متاح
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-200 text-gray-800 border-gray-300">
                            غير متاح
                          </span>
                        )}
                        {d.user_id ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            مربوط بحساب
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-yellow-50 text-yellow-800 border-yellow-200">
                            بدون حساب
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs sm:text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-4 h-4 text-gray-500" />
                          {d.phone}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Bus className="w-4 h-4 text-gray-500" />
                          {d.vehicle_type} • {d.seats_count} مقعد
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          خطوط مربوطة: {routesCount}
                        </span>
                      </div>
                      {acc && (
                        <div className="mt-1 text-[11px] sm:text-xs text-gray-600">
                          حساب: {(acc.full_name || 'بدون اسم')} — {(acc.phone || 'بدون رقم')} — الدور الحالي: {(acc.role || 'user')}
                        </div>
                      )}
                      {lastLoc && (
                        <div className="mt-2 text-[11px] sm:text-xs text-gray-600">
                          آخر موقع: {new Date(lastLoc.updated_at).toLocaleString('ar-JO')} •{' '}
                          <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-bold hover:underline">
                            فتح على الخريطة
                          </a>
                        </div>
                      )}
                      {live?.updated_at && (
                        <div className="mt-1 text-[11px] sm:text-xs text-gray-500">
                          حالة متاح: آخر تحديث {new Date(live.updated_at).toLocaleString('ar-JO')}
                        </div>
                      )}
                    </div>

                    {/* Action buttons: grid on mobile to avoid overflow, wrap on larger screens */}
                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-wrap sm:gap-2">
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full px-2.5 py-2 rounded-lg bg-green-600 text-white text-xs sm:text-sm font-bold hover:bg-green-700 transition inline-flex items-center justify-center gap-2"
                        title="تواصل واتساب"
                      >
                        <Phone className="w-4 h-4" />
                        واتساب
                      </a>
                      {telHref && (
                        <a
                          href={telHref}
                          className="w-full px-2.5 py-2 rounded-lg bg-amber-50 text-amber-900 text-xs sm:text-sm font-bold hover:bg-amber-100 transition inline-flex items-center justify-center gap-2 border border-amber-200"
                          title="اتصال مباشر"
                        >
                          <Phone className="w-4 h-4" />
                          اتصال
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => loadDriverLastLocation(d)}
                        disabled={Boolean(driverLocLoading[d.id])}
                        className="w-full px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        title="آخر موقع مسجل"
                      >
                        <Navigation className="w-4 h-4" />
                        {driverLocLoading[d.id] ? 'تحميل...' : 'آخر موقع'}
                      </button>
                      <button
                        type="button"
                        onClick={() => loadDriverLocationHistory(d)}
                        disabled={Boolean(driverLocLoading[d.id])}
                        className="w-full px-2.5 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold hover:bg-gray-200 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                        title="سجل حركة (آخر 20 نقطة)"
                      >
                        <MapPin className="w-4 h-4" />
                        سجل حركة
                      </button>
                      {d.user_id && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(d.user_id || '')
                              toast.success('تم نسخ User ID')
                            } catch {
                              toast.error('تعذر النسخ')
                            }
                          }}
                          className="w-full px-2.5 py-2 rounded-lg bg-gray-100 text-gray-800 text-xs sm:text-sm font-bold hover:bg-gray-200 transition inline-flex items-center justify-center gap-2"
                          title="نسخ معرف الحساب (يُستخدم للربط والصلاحيات)"
                        >
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">معرف الحساب</span>
                          <span className="sm:hidden">المعرّف</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleDriverActive(d.id, !d.is_active)}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
                          d.is_active
                            ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                            : 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200'
                        }`}
                        title={d.is_active ? 'تعطيل السائق (لن يظهر للحجز/التعيين)' : 'تفعيل السائق'}
                      >
                        {d.is_active ? 'تعطيل' : 'تفعيل'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteDriver(d.id)}
                        className="w-full px-2.5 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs sm:text-sm font-bold transition inline-flex items-center justify-center gap-2"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

          {drivers.length === 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
              لا يوجد سائقون بعد. اضغط &quot;إضافة سائق&quot; لإنشاء أول سائق.
            </div>
          )}
        </div>
      </div>

      {/* Driver History Modal */}
      {openHistoryFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-800">
                  سجل حركة السائق: {openHistoryFor.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setOpenHistoryFor(null)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  إغلاق
                </button>
              </div>

              <div className="space-y-2">
                {(driverLocHistory[openHistoryFor.id] || []).length === 0 ? (
                  <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    لا يوجد سجل حركة حالياً. تأكد أن السائق بدأ التتبع أثناء رحلة نشطة.
                  </div>
                ) : (
                  (driverLocHistory[openHistoryFor.id] || []).map((x, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                      <div className="text-sm text-gray-800">
                        <div className="font-bold">{new Date(x.updated_at).toLocaleString('ar-JO')}</div>
                        <div className="text-xs text-gray-500">
                          طلب: #{String(x.request_id).slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${x.lat},${x.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs sm:text-sm font-bold hover:bg-blue-700 transition"
                      >
                        فتح
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      {showCreateTrip && selectedRouteForTrip && (
        <CreateTripModal
          routeId={selectedRouteForTrip.id}
          routeName={selectedRouteForTrip.name}
          tripType={createTripType}
          defaultStart={
            createTripType === 'departure'
              ? { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng }
              : { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng }
          }
          defaultEnd={
            createTripType === 'departure'
              ? { name: selectedRouteForTrip.start_location_name, lat: selectedRouteForTrip.start_lat, lng: selectedRouteForTrip.start_lng }
              : { name: selectedRouteForTrip.end_location_name, lat: selectedRouteForTrip.end_lat, lng: selectedRouteForTrip.end_lng }
          }
          onClose={() => {
            setShowCreateTrip(false)
            setSelectedRouteForTrip(null)
          }}
          onSuccess={() => {
            // Reload trips for this route
            loadTripsForRoute(selectedRouteForTrip.id)
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-sm sm:max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6">إضافة سائق جديد</h3>
              <form action={handleAddDriver} className="space-y-4 sm:space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs sm:text-sm text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">ربط السائق بحساب (اختياري)</p>
                  <p>
                    إذا اخترت حسابًا هنا، سيتمكن السائق من تسجيل الدخول إلى لوحة السائق وبدء التتبع وتحديث المسار حسب الصلاحيات.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">حساب السائق (User ID)</label>
                  <select
                    name="user_id"
                    value={driverForm.user_id}
                    onChange={(e) => {
                      const userId = e.target.value
                      if (!userId) {
                        setDriverForm((p) => ({ ...p, user_id: '', name: '', phone: '' }))
                        setDriverAutofill({ name: false, phone: false })
                        return
                      }

                      const acc = driverAccounts.find((a) => a.user_id === userId)
                      const nextName = (acc?.full_name || '').trim()
                      const nextPhone = (acc?.phone || '').trim()
                      setDriverForm((p) => ({
                        ...p,
                        user_id: userId,
                        name: nextName || p.name,
                        phone: nextPhone || p.phone,
                      }))
                      setDriverAutofill({ name: Boolean(nextName), phone: Boolean(nextPhone) })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  >
                    <option value="">بدون ربط (سائق بدون تسجيل دخول)</option>
                    {driverAccounts.map((acc) => (
                      <option key={acc.user_id} value={acc.user_id}>
                        {(acc.full_name || 'بدون اسم')} — {(acc.phone || 'بدون رقم')} — {(acc.role || 'user')}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
                    ملاحظة: الحساب يجب أن يكون موجودًا بالفعل (مستخدم مسجل). سيتم تعيين دوره إلى driver تلقائياً.
                  </p>
                  {driverForm.user_id && (driverAutofill.name || driverAutofill.phone) && (
                    <p className="mt-1 text-[11px] sm:text-xs text-green-700">
                      تم تعبئة بيانات السائق تلقائياً من الحساب المختار.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الاسم</label>
                  <input
                    name="name"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm((p) => ({ ...p, name: e.target.value }))}
                    readOnly={Boolean(driverForm.user_id) && driverAutofill.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                  {Boolean(driverForm.user_id) && driverAutofill.name && (
                    <p className="mt-1 text-[11px] sm:text-xs text-gray-500">تم جلب الاسم من الحساب (يمكن تغييره من بيانات الحساب إن لزم).</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الهاتف</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm((p) => ({ ...p, phone: e.target.value }))}
                    readOnly={Boolean(driverForm.user_id) && driverAutofill.phone}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                  {Boolean(driverForm.user_id) && driverAutofill.phone && (
                    <p className="mt-1 text-[11px] sm:text-xs text-gray-500">تم جلب الهاتف من الحساب.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">نوع المركبة</label>
                  <select
                    name="vehicle_type"
                    required
                    value={driverForm.vehicle_type}
                    onChange={(e) => setDriverForm((p) => ({ ...p, vehicle_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  >
                    <option value="حافلة">حافلة</option>
                    <option value="فان">فان</option>
                    <option value="سيارة">سيارة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">عدد المقاعد</label>
                  <input
                    name="seats_count"
                    type="number"
                    required
                    min="1"
                    value={driverForm.seats_count}
                    onChange={(e) => setDriverForm((p) => ({ ...p, seats_count: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddDriver(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm sm:text-base"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

