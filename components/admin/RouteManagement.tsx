'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { MapPin, Plus, Users, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import TripSchedulingModal from './TripSchedulingModal'
import CreateTripModal from './CreateTripModal'
import TripDetailsModal from './TripDetailsModal'
import TripCardWithMap from './TripCardWithMap'
import TripsList from './TripsList'
import AssignDriverToTripModal from './AssignDriverToTripModal'
import DriversList from './DriversList'
import RouteCard from './RouteCard'
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
  const [tripListFilter, setTripListFilter] = useState<'upcoming' | 'ended' | 'all'>('upcoming')
  const [createRouteId, setCreateRouteId] = useState<string>('')
  const [routeTrips, setRouteTrips] = useState<Record<string, RouteTripLite[]>>({})
  const [routeTripsLoading, setRouteTripsLoading] = useState<Record<string, boolean>>({})
  const [tripAssignedDrivers, setTripAssignedDrivers] = useState<Record<string, Driver[]>>({})
  const [tripPassengers, setTripPassengers] = useState<Record<string, Array<{
    id: string
    visitor_name: string
    companions_count: number
    phone: string | null
    full_name: string | null
    whatsapp_phone?: string | null
    jordan_phone?: string | null
  }>>>({})
  const [showPassengersModal, setShowPassengersModal] = useState<{ tripId: string; passengers: any[] } | null>(null)
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)
  const [assignDriverModal, setAssignDriverModal] = useState<{ driver: Driver; tripType: 'arrival' | 'departure' } | null>(null)
  const [activeSection, setActiveSection] = useState<'arrivals' | 'departures' | 'drivers'>('arrivals')
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
    // منع الخلط بصرياً: عند تبديل القسم نغلق التوسعات السابقة
    setExpandedRouteTrips({})
  }, [activeSection])

  const refreshDriverLive = async () => {
    try {
      const ids = (drivers || []).map((d: any) => d.id).filter(Boolean)
      if (ids.length === 0) return
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
      setDriverLiveMap((prev) => ({ ...prev, ...map }))
    } catch {
      // avoid toast spam
    }
  }

  useEffect(() => {
    const t = setInterval(() => {
      refreshDriverLive()
    }, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers.length])

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
      if (!createRouteId && (routesRes.data || []).length > 0) {
        setCreateRouteId((routesRes.data || [])[0].id)
      }

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
      const todayISO = new Date().toISOString().slice(0, 10)
      let q = supabase
        .from('route_trips')
        .select('id,trip_type,trip_date,meeting_time,departure_time,start_location_name,start_lat,start_lng,end_location_name,end_lat,end_lng,is_active,created_at')
        .eq('route_id', routeId)
        .eq('is_active', true)

      // Default for office: upcoming trips only
      if (tripListFilter === 'upcoming') {
        q = q.gte('trip_date', todayISO).order('trip_date', { ascending: true }).order('departure_time', { ascending: true })
      } else if (tripListFilter === 'ended') {
        q = q.lt('trip_date', todayISO).order('trip_date', { ascending: false }).order('departure_time', { ascending: false })
      } else {
        q = q.order('trip_date', { ascending: true }).order('departure_time', { ascending: true })
      }

      const { data: tripsData, error: tripsErr } = await q
      
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
          let profilesMap: Record<string, { phone: string | null; full_name: string | null; whatsapp_phone: string | null; jordan_phone: string | null }> = {}
          
          if (userIds.length > 0) {
            const { data: profiles, error: profErr } = await supabase
              .from('profiles')
              .select('user_id, phone, full_name, whatsapp_phone, jordan_phone')
              .in('user_id', userIds)
            
            if (!profErr && profiles) {
              profiles.forEach((p: any) => {
                profilesMap[p.user_id] = {
                  phone: p.phone || null,
                  full_name: p.full_name || null,
                  whatsapp_phone: p.whatsapp_phone || null,
                  jordan_phone: p.jordan_phone || null,
                }
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
              whatsapp_phone: profilesMap[p.user_id]?.whatsapp_phone || null,
              jordan_phone: profilesMap[p.user_id]?.jordan_phone || null,
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

  useEffect(() => {
    // When filter changes, reload trips for expanded routes only (avoid extra load)
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

              {routes.length > 0 && (
                <button
                  onClick={() => {
                    const route = routes.find((r) => r.id === createRouteId) || routes[0]
                    setSelectedRouteForTrip(route)
                    setCreateTripType(activeTripType)
                    setShowCreateTrip(true)
                  }}
                  className={`w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition text-sm sm:text-base font-extrabold text-white ${
                    activeTripType === 'arrival' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  {activeTripType === 'arrival' ? 'إنشاء رحلة قادمين' : 'إنشاء رحلة مغادرين'}
                </button>
              )}
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
                onTripListFilterChange={(next) => setTripListFilter(next)}
                onToggleTrips={(routeId) => {
                  setExpandedRouteTrips((p) => ({ ...p, [routeId]: !p[routeId] }))
                }}
                onLoadTrips={loadTripsForRoute}
                onAssignDriver={handleAssignDriver}
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
            getAccountForDriver={getAccountForDriver}
            getAssignedRoutesCount={getAssignedRoutesCount}
            normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
            normalizePhoneForTel={normalizePhoneForTel}
            loadDriverLastLocation={loadDriverLastLocation}
            loadDriverLocationHistory={loadDriverLocationHistory}
            onOpenHistory={setOpenHistoryFor}
            toggleDriverActive={toggleDriverActive}
            deleteDriver={deleteDriver}
            onAssignToTrip={(driver, tripType) => setAssignDriverModal({ driver, tripType })}
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
          tripId={showPassengersModal.tripId}
          passengers={showPassengersModal.passengers}
          onClose={() => setShowPassengersModal(null)}
          normalizePhoneForWhatsApp={normalizePhoneForWhatsApp}
        />
      )}
    </div>
  )
}

