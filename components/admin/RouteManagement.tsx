'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Trash2, Edit, Bus, Users, Phone, Navigation, Copy, Calendar, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'
import TripSchedulingModal from './TripSchedulingModal'
import CreateTripModal from './CreateTripModal'
import TripDetailsModal from './TripDetailsModal'
import TripCardWithMap from './TripCardWithMap'
import TripsList from './TripsList'
import DriversList from './DriversList'
import PassengersModal from './PassengersModal'
import DriverHistoryModal from './DriverHistoryModal'
import AddDriverModal from './AddDriverModal'
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
  const [editTripData, setEditTripData] = useState<any>(null)
  const [copyTripData, setCopyTripData] = useState<any>(null)
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
  const [tripPassengers, setTripPassengers] = useState<Record<string, Array<{
    id: string
    visitor_name: string
    companions_count: number
    phone: string | null
    full_name: string | null
  }>>>({})
  const [showPassengersModal, setShowPassengersModal] = useState<{ tripId: string; passengers: any[] } | null>(null)
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
      
      // Load assigned drivers and passengers for each trip
      const tripIds = formattedTrips.map((t: any) => t.id)
      if (tripIds.length > 0) {
        // Load assigned drivers
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
        
        // Load passengers for each trip
        const { data: passengersData, error: passengersErr } = await supabase
          .from('visit_requests')
          .select('id, visitor_name, companions_count, user_id, trip_id')
          .in('trip_id', tripIds)
          .neq('trip_status', 'rejected')
        
        if (!passengersErr && passengersData) {
          const userIds = Array.from(new Set(passengersData.map((p: any) => p.user_id).filter(Boolean)))
          let profilesMap: Record<string, { phone: string | null; full_name: string | null }> = {}
          
          if (userIds.length > 0) {
            const { data: profiles, error: profErr } = await supabase
              .from('profiles')
              .select('user_id, phone, full_name')
              .in('user_id', userIds)
            
            if (!profErr && profiles) {
              profiles.forEach((p: any) => {
                profilesMap[p.user_id] = { phone: p.phone, full_name: p.full_name }
              })
            }
          }
          
          const passengersByTrip: Record<string, any[]> = {}
          passengersData.forEach((p: any) => {
            if (!passengersByTrip[p.trip_id]) passengersByTrip[p.trip_id] = []
            passengersByTrip[p.trip_id].push({
              id: p.id,
              visitor_name: p.visitor_name,
              companions_count: p.companions_count || 0,
              phone: profilesMap[p.user_id]?.phone || null,
              full_name: profilesMap[p.user_id]?.full_name || null,
            })
          })
          
          setTripPassengers((prev) => ({ ...prev, ...passengersByTrip }))
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

  const handleEditTrip = async (tripId: string, routeId: string) => {
    try {
      const { data: tripData, error } = await supabase
        .from('route_trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (error) throw error
      
      const route = routes.find(r => r.id === routeId)
      if (!route) {
        toast.error('لم يتم العثور على الخط')
        return
      }
      
      setEditTripData(tripData)
      setSelectedRouteForTrip(route)
      setCreateTripType((tripData.trip_type as any) || 'arrival')
      setShowCreateTrip(true)
    } catch (e: any) {
      console.error('handleEditTrip error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
    }
  }

  const handleCopyTrip = async (tripId: string, routeId: string) => {
    try {
      const { data: tripData, error } = await supabase
        .from('route_trips')
        .select('*')
        .eq('id', tripId)
        .single()
      
      if (error) throw error
      
      const route = routes.find(r => r.id === routeId)
      if (!route) {
        toast.error('لم يتم العثور على الخط')
        return
      }
      
      setCopyTripData(tripData)
      setEditTripData(null) // Clear edit data
      setSelectedRouteForTrip(route)
      setCreateTripType((tripData.trip_type as any) || 'arrival')
      setShowCreateTrip(true)
    } catch (e: any) {
      console.error('handleCopyTrip error:', e)
      toast.error(e?.message || 'تعذر تحميل بيانات الرحلة')
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
    // ✅ تحسين رسالة التأكيد: التحقق من وجود رحلات مرتبطة
    try {
      const { data: linkedTrips, error: checkErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, route_trips(id, trip_date, start_location_name, end_location_name)')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .limit(5)
      
      if (checkErr) throw checkErr
      
      const driver = drivers.find((d) => d.id === driverId)
      const driverName = driver?.name || 'هذا السائق'
      
      let confirmMessage = `⚠️ تحذير: هل أنت متأكد من حذف السائق "${driverName}"؟\n\n`
      
      if (linkedTrips && linkedTrips.length > 0) {
        const count = linkedTrips.length
        const tripsList = linkedTrips.slice(0, 3)
          .map((lt: any) => {
            const trip = lt.route_trips
            return trip ? `${trip.start_location_name} → ${trip.end_location_name} (${trip.trip_date})` : ''
          })
          .filter(Boolean)
          .join('\n- ')
        const moreText = count > 3 ? `\nو ${count - 3} رحلة أخرى` : ''
        
        confirmMessage += `هذا السائق مرتبط بـ ${count} رحلة/رحلات:\n- ${tripsList}${moreText}\n\n`
        confirmMessage += `سيتم إزالة ربطه بالخطوط وإلغاء تعيينه من جميع الرحلات.\n\n`
      } else {
        confirmMessage += `سيتم إزالة ربطه بالخطوط.\n\n`
      }
      
      confirmMessage += `هل أنت متأكد من المتابعة؟`
      
      if (!confirm(confirmMessage)) return
    } catch (checkErr: any) {
      console.error('Error checking linked trips:', checkErr)
      // إذا فشل التحقق، نستخدم رسالة بسيطة
      if (!confirm('هل أنت متأكد من حذف السائق؟ سيتم إزالة ربطه بالخطوط وإلغاء تعيينه من الرحلات.')) return
    }
    
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
      
      // إعادة تحميل السائقين من قاعدة البيانات للحصول على البيانات الصحيحة
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
        .eq('trip_id', tripId)
        .eq('is_active', true)
      
      if (!assignErr && assignments) {
        const drivers = assignments
          .filter((a: any) => a.drivers)
          .map((a: any) => a.drivers as Driver)
        
        setTripAssignedDrivers((p) => ({
          ...p,
          [tripId]: drivers,
        }))
        
        // ✅ Logging: تسجيل تعيين السائق
        const assignedDriver = drivers.find((d: Driver) => d.id === driverId)
        if (assignedDriver) {
          try {
            const { logDriverAssigned } = await import('@/lib/audit')
            await logDriverAssigned(tripId, driverId, assignedDriver.name)
          } catch (logErr) {
            console.error('Error logging driver assignment:', logErr)
          }
        }
      }
      
      toast.success('تم ربط السائق بالرحلة بنجاح')
    } catch (e: any) {
      console.error('Assign driver to trip error:', e)
      toast.error(e?.message || 'تعذر ربط السائق بالرحلة')
    }
  }

  const handleUnassignDriverFromTrip = async (tripId: string, driverId: string, routeId: string) => {
    try {
      // ✅ Logging: تسجيل إلغاء تعيين السائق (قبل إعادة التحميل)
      const driverToUnassign = tripAssignedDrivers[tripId]?.find((d: Driver) => d.id === driverId)
      
      const { error } = await supabase
        .from('route_trip_drivers')
        .update({ is_active: false })
        .eq('trip_id', tripId)
        .eq('driver_id', driverId)
      
      if (error) throw error
      
      if (driverToUnassign) {
        try {
          const { logDriverUnassigned } = await import('@/lib/audit')
          await logDriverUnassigned(tripId, driverId, driverToUnassign.name)
        } catch (logErr) {
          console.error('Error logging driver unassignment:', logErr)
        }
      }
      
      // إعادة تحميل السائقين من قاعدة البيانات
      const { data: assignments, error: assignErr } = await supabase
        .from('route_trip_drivers')
        .select('trip_id, driver_id, drivers(id, name, vehicle_type, phone)')
        .eq('trip_id', tripId)
        .eq('is_active', true)
      
      if (!assignErr && assignments) {
        const drivers = assignments
          .filter((a: any) => a.drivers)
          .map((a: any) => a.drivers as Driver)
        
        setTripAssignedDrivers((p) => ({
          ...p,
          [tripId]: drivers,
        }))
      }
      
      toast.success('تم إزالة السائق من الرحلة')
    } catch (e: any) {
      console.error('Unassign driver from trip error:', e)
      toast.error(e?.message || 'تعذر إزالة السائق من الرحلة')
    }
  }

  const handleShowPassengers = (tripId: string) => {
    const passengers = tripPassengers[tripId] || []
    setShowPassengersModal({ tripId, passengers })
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
                    className="w-full sm:w-auto px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border-2 border-blue-200 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                          <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
                            رحلات هذا الخط
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                            عرض وإدارة جميع الرحلات المجدولة
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedRouteTrips((p) => ({ ...p, [route.id]: !p[route.id] }))
                            // lazy-load when opening
                            const willOpen = !expandedRouteTrips[route.id]
                            if (willOpen) loadTripsForRoute(route.id)
                          }}
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md"
                        >
                          {expandedRouteTrips[route.id] ? (
                            <>
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              إخفاء
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                              عرض الرحلات
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => loadTripsForRoute(route.id)}
                          disabled={Boolean(routeTripsLoading[route.id])}
                          className="px-3 py-2 rounded-lg bg-white text-gray-800 hover:bg-gray-50 border-2 border-gray-300 transition text-xs sm:text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        >
                          {routeTripsLoading[route.id] ? (
                            <>
                              <span className="animate-spin">⟳</span>
                              جارٍ التحديث...
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 sm:w-4 sm:h-4" />
                              تحديث
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const trips = routeTrips[route.id] || []
                            if (trips.length === 0) {
                              toast('لا يوجد رحلات للنسخ. افتح "عرض" ثم حدّث.')
                              return
                            }
                            
                            try {
                              // جمع معلومات كل رحلة مع الحاجزين
                              const lines: string[] = []
                              
                              for (const trip of trips) {
                                // معلومات الرحلة
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
                                
                                // الحاجزين في هذه الرحلة
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
                          }}
                          className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md"
                          title="نسخ جميع الرحلات مع الحاجزين وأرقام الهواتف"
                        >
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                          نسخ الكشف
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedRouteTrips[route.id] && (
                    <TripsList
                      trips={routeTrips[route.id] || []}
                      routeId={route.id}
                      tabIsArrival={Boolean((expandedRouteTrips as any)[`${route.id}__tab`] ?? true)}
                      onTabChange={(isArrival) => {
                        setExpandedRouteTrips((p) => ({ ...p, [`${route.id}__tab`]: isArrival }))
                      }}
                      passengersCount={Object.fromEntries(
                        Object.entries(tripPassengers).map(([tripId, passengers]) => [
                          tripId,
                          passengers?.length || 0
                        ])
                      )}
                      assignedDrivers={tripAssignedDrivers}
                      availableDrivers={drivers.filter(d => d.is_active !== false)}
                      onEdit={handleEditTrip}
                      onViewDetails={(tripId) => setSelectedTripId(tripId)}
                      onShowPassengers={handleShowPassengers}
                      onAssignDriver={handleAssignDriverToTrip}
                      onUnassignDriver={handleUnassignDriverFromTrip}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Drivers Overview */}
      <DriversList
        drivers={drivers}
        driverSearch={driverSearch}
        onSearchChange={setDriverSearch}
        driverAccounts={driverAccounts}
        driverLastLoc={driverLastLoc}
        driverLiveMap={driverLiveMap}
        driverLocLoading={driverLocLoading}
        getAccountForDriver={getAccountForDriver}
        getAssignedRoutesCount={getAssignedRoutesCount}
        normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
        normalizePhoneForTel={normalizePhoneForTel}
        loadDriverLastLocation={loadDriverLastLocation}
        loadDriverLocationHistory={loadDriverLocationHistory}
        onOpenHistory={setOpenHistoryFor}
        toggleDriverActive={toggleDriverActive}
        deleteDriver={deleteDriver}
      />

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
          onClose={() => {
            setShowCreateTrip(false)
            setEditTripData(null)
            setCopyTripData(null)
            setSelectedRouteForTrip(null)
          }}
          onSuccess={() => {
            // Reload trips for this route
            if (selectedRouteForTrip) {
              loadTripsForRoute(selectedRouteForTrip.id)
            }
            setEditTripData(null)
            setCopyTripData(null)
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
          onSubmit={handleAddDriver}
        />
      )}

      {/* Passengers Modal */}
      {showPassengersModal && (
        <PassengersModal
          passengers={showPassengersModal.passengers}
          onClose={() => setShowPassengersModal(null)}
          normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
        />
      )}
    </div>
  )
}

