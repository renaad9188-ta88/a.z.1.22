'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ArrowRight, MapPin, Navigation, Bus, Calendar, Upload, X, DollarSign, MessageCircle, Phone } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import RequestFollowStepper from './request-follow/RequestFollowStepper'
import RemainingPaymentSection from './request-follow/RemainingPaymentSection'
import BookedTripCard from './request-follow/BookedTripCard'
import AvailableTripsModal from './request-follow/AvailableTripsModal'
import HelpContactButtons from '@/components/HelpContactButtons'

type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  visit_type?: string | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  arrival_date: string | null
  departure_date: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  trip_status: string | null
  admin_notes: string | null
  trip_id: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  deposit_paid?: boolean | null
  deposit_amount?: number | null
  city?: string | null
  created_at: string
  updated_at: string
}

const POST_APPROVAL_SUBMITTED_MARK = 'حالة الاستكمال: مرسل'

type ActionLogItem = {
  kind: 'admin_response' | 'admin_booking' | 'admin_created' | 'user_booking_change'
  title: string
  body: string
  dateText?: string
}

function extractAllAdminResponses(notes: string): Array<{ body: string; dateText?: string }> {
  const marker = '=== رد الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
  const res: Array<{ body: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const dateIdx = chunk.lastIndexOf('تاريخ الرد:')
    if (dateIdx !== -1) {
      const body = chunk.slice(0, dateIdx).trim()
      const dateText = chunk.slice(dateIdx).replace('تاريخ الرد:', '').trim()
      if (body) res.push({ body, dateText })
      continue
    }
    res.push({ body: chunk })
  }
  return res.reverse()
}

function extractUserBookingChanges(notes: string): Array<{ tripInfo?: string; stopInfo?: string; dateText?: string }> {
  const marker = '=== تعديل الحجز ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
  const res: Array<{ tripInfo?: string; stopInfo?: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const mod: any = {}
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('نقطة النزول:') || trimmed.startsWith('نقطة التحميل:')) {
        mod.stopInfo = trimmed.split(':')[1]?.trim()
      } else if (trimmed.startsWith('تاريخ التعديل:')) {
        mod.dateText = trimmed.replace('تاريخ التعديل:', '').trim()
      } else if (trimmed && !trimmed.startsWith('تم تعديل الحجز') && !trimmed.startsWith('من قبل') && !trimmed.startsWith('الرحلة السابقة:') && !trimmed.startsWith('الرحلة الجديدة:')) {
        if (!mod.tripInfo) mod.tripInfo = trimmed
      }
    }
    if (mod.tripInfo || mod.stopInfo) res.push(mod)
  }
  return res.reverse()
}

function extractAdminBookings(notes: string): Array<{ tripInfo?: string; stopInfo?: string; dateText?: string; tripType?: string }> {
  const marker = '=== حجز من الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1)
  const res: Array<{ tripInfo?: string; stopInfo?: string; dateText?: string; tripType?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const out: any = {}
    const lines = chunk.split('\n').map((x) => x.trim()).filter(Boolean)
    for (const line of lines) {
      if (line.startsWith('تم حجز رحلة')) out.tripType = line
      else if (line.startsWith('نقطة النزول:') || line.startsWith('نقطة التحميل:')) out.stopInfo = line.split(':')[1]?.trim()
      else if (line.startsWith('تاريخ الحجز:')) out.dateText = line.replace('تاريخ الحجز:', '').trim()
      else if (!line.startsWith('تم حجز') && !line.startsWith('تاريخ')) {
        if (!out.tripInfo) out.tripInfo = line
      }
    }
    if (out.tripInfo || out.tripType) res.push(out)
  }
  return res.reverse()
}

function extractAdminCreated(notes: string): { adminId?: string; dateText?: string } | null {
  const marker = '=== إنشاء من الإدارة ==='
  const idx = notes.lastIndexOf(marker)
  if (idx === -1) return null
  const after = notes.slice(idx + marker.length).trim()
  if (!after) return null
  const adminIdLine = after.split('\n').map((x) => x.trim()).find((l) => l.startsWith('معرّف الإدمن:'))
  const dateLine = after.split('\n').map((x) => x.trim()).find((l) => l.startsWith('تاريخ الإنشاء:'))
  const adminId = adminIdLine ? adminIdLine.replace('معرّف الإدمن:', '').trim() : undefined
  const dateText = dateLine ? dateLine.replace('تاريخ الإنشاء:', '').trim() : undefined
  return { adminId, dateText }
}

export default function RequestFollow({ requestId, userId }: { requestId: string; userId: string }) {
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<ReqRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showAvailableTrips, setShowAvailableTrips] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<any[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [bookedTrip, setBookedTrip] = useState<any | null>(null)
  const [tripStopsById, setTripStopsById] = useState<Record<string, any[]>>({})
  const [loadingStopsId, setLoadingStopsId] = useState<string | null>(null)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const [selectedStopByTrip, setSelectedStopByTrip] = useState<Record<string, string>>({}) // tripId -> stopId
  const [remainingPaymentImage, setRemainingPaymentImage] = useState<File | null>(null)
  const [remainingPaymentPreview, setRemainingPaymentPreview] = useState<string | null>(null)
  const [uploadingRemainingPayment, setUploadingRemainingPayment] = useState(false)
  const [uploadedRemainingPaymentUrl, setUploadedRemainingPaymentUrl] = useState<string | null>(null)
  const [bookingStep, setBookingStep] = useState<'arrival' | 'departure'>('arrival')
  const [selectedArrivalTripId, setSelectedArrivalTripId] = useState<string | null>(null)
  const [calculatedDepartureDate, setCalculatedDepartureDate] = useState<string | null>(null)
  const [departureTrip, setDepartureTrip] = useState<any | null>(null)
  const [selectedDropoffStop, setSelectedDropoffStop] = useState<{ id: string; name: string } | null>(null)
  const [selectedPickupStop, setSelectedPickupStop] = useState<{ id: string; name: string } | null>(null)

  const actionLog: ActionLogItem[] = useMemo(() => {
    if (!request) return []
    const notes = (request.admin_notes || '') as string
    const list: ActionLogItem[] = []

    const created = extractAdminCreated(notes)
    if (created) {
      list.push({
        kind: 'admin_created',
        title: 'تم إنشاء الطلب من الإدارة',
        body: created.adminId ? `تم إنشاء الطلب لمساعدتك.\nالإدمن: ${created.adminId}` : 'تم إنشاء الطلب لمساعدتك.',
        dateText: created.dateText,
      })
    }

    for (const r of extractAllAdminResponses(notes)) {
      list.push({
        kind: 'admin_response',
        title: 'رد من الإدارة',
        body: r.body,
        dateText: r.dateText,
      })
    }

    for (const b of extractAdminBookings(notes)) {
      list.push({
        kind: 'admin_booking',
        title: 'حجز من الإدارة',
        body: `${b.tripType ? `${b.tripType}\n` : ''}${b.tripInfo || ''}${b.stopInfo ? `\nنقطة: ${b.stopInfo}` : ''}`.trim(),
        dateText: b.dateText,
      })
    }

    for (const m of extractUserBookingChanges(notes)) {
      list.push({
        kind: 'user_booking_change',
        title: 'تعديل حجز (من المستخدم)',
        body: `${m.tripInfo || ''}${m.stopInfo ? `\nنقطة: ${m.stopInfo}` : ''}`.trim(),
        dateText: m.dateText,
      })
    }

    return list.slice(0, 12)
  }, [request])

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,visit_type,status,arrival_date,departure_date,payment_verified,remaining_amount,trip_status,admin_notes,trip_id,selected_dropoff_stop_id,selected_pickup_stop_id,deposit_paid,deposit_amount,city,created_at,updated_at'
        )
        .eq('id', requestId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error('الطلب غير موجود')
        return
      }
      setRequest(data as any)
      
      // تحميل الرحلة المحجوزة إن وجدت
      if ((data as any).trip_id) {
        loadBookedTrip((data as any).trip_id)
      } else {
        setBookedTrip(null)
      }
    } catch (e: any) {
      console.error('Follow load error:', e)
      toast.error('تعذر تحميل متابعة الطلب')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const onFocus = () => load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, userId])

  // تحميل أسماء نقاط الصعود/النزول المختارة (لتظهر للمستخدم)
  useEffect(() => {
    const loadSelectedStops = async () => {
      if (!request) return
      try {
        if ((request as any).selected_dropoff_stop_id) {
          const stopId = (request as any).selected_dropoff_stop_id
          // 1) Try trip stop points
          let { data } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          // 2) Fallback: route default stops
          if (!data) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            data = (res as any)?.data || null
          }
          setSelectedDropoffStop(data ? { id: data.id, name: (data as any).name } : null)
        } else {
          setSelectedDropoffStop(null)
        }
      } catch {
        setSelectedDropoffStop(null)
      }

      try {
        if ((request as any).selected_pickup_stop_id) {
          const stopId = (request as any).selected_pickup_stop_id
          // 1) Try trip stop points
          let { data } = await supabase
            .from('route_trip_stop_points')
            .select('id,name')
            .eq('id', stopId)
            .maybeSingle()
          // 2) Fallback: route default stops
          if (!data) {
            const res = await supabase
              .from('route_stop_points')
              .select('id,name')
              .eq('id', stopId)
              .maybeSingle()
            data = (res as any)?.data || null
          }
          setSelectedPickupStop(data ? { id: data.id, name: (data as any).name } : null)
        } else {
          setSelectedPickupStop(null)
        }
      } catch {
        setSelectedPickupStop(null)
      }
    }

    loadSelectedStops()
  }, [request, supabase])

  const loadBookedTrip = async (tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name')
        .eq('id', tripId)
        .maybeSingle()
      
      if (error) throw error
      setBookedTrip(data)
    } catch (e: any) {
      console.error('Error loading booked trip:', e)
      setBookedTrip(null)
    }
  }

  const loadAvailableTrips = async (tripType?: 'arrival' | 'departure') => {
    try {
      setLoadingTrips(true)
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
      
      // إذا كان visit_type === 'visit'، فلتر حسب نوع الرحلة
      if (request?.visit_type === 'visit') {
        const filterType = tripType || bookingStep
        query = query.eq('trip_type', filterType)
        
        // إذا كنا نبحث عن رحلات المغادرة، فلتر حسب التاريخ المحسوب
        if (filterType === 'departure' && calculatedDepartureDate) {
          const departureDate = new Date(calculatedDepartureDate)
          const weekBefore = new Date(departureDate)
          weekBefore.setDate(weekBefore.getDate() - 7)
          const weekAfter = new Date(departureDate)
          weekAfter.setDate(weekAfter.getDate() + 7)
          
          query = query
            .gte('trip_date', weekBefore.toISOString().split('T')[0])
            .lte('trip_date', weekAfter.toISOString().split('T')[0])
        }
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setAvailableTrips(data || [])
      
      // تحميل نقاط التوقف تلقائياً لكل رحلة
      if (data && data.length > 0) {
        for (const trip of data) {
          await loadTripStops(trip.id)
        }
      }
    } catch (e: any) {
      console.error('Error loading available trips:', e)
      toast.error('تعذر تحميل الرحلات المتاحة')
      setAvailableTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const loadTripStops = async (tripId: string) => {
    if (tripStopsById[tripId]) return
    try {
      const trip = (availableTrips || []).find((t: any) => t.id === tripId) || null
      const tripType: 'arrival' | 'departure' = (trip?.trip_type as any) || bookingStep

      const { data, error } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,order_index,lat,lng')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      if (error) throw error

      const tripStops = (data || []) as any[]
      if (tripStops.length > 0) {
        setTripStopsById((p) => ({ ...p, [tripId]: tripStops }))
        return
      }

      // Fallback: route default stops (pickup/dropoff/both)
      const routeId = trip?.route_id as string | undefined
      if (!routeId) {
        setTripStopsById((p) => ({ ...p, [tripId]: [] }))
        return
      }

      const allowedKinds = tripType === 'departure' ? ['pickup', 'both'] : ['dropoff', 'both']
      try {
        const { data: routeStops, error: rsErr } = await supabase
          .from('route_stop_points')
          .select('id,name,order_index,lat,lng,stop_kind')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .in('stop_kind', allowedKinds as any)
          .order('order_index', { ascending: true })
        if (rsErr) throw rsErr
        setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
      } catch (e: any) {
        // Backward compatibility if stop_kind is not migrated yet
        const { data: routeStops } = await supabase
          .from('route_stop_points')
          .select('id,name,order_index,lat,lng')
          .eq('route_id', routeId)
          .eq('is_active', true)
          .order('order_index', { ascending: true })
        setTripStopsById((p) => ({ ...p, [tripId]: (routeStops as any) || [] }))
      }
    } catch (e: any) {
      console.error('Error loading stop points:', e)
      setTripStopsById((p) => ({ ...p, [tripId]: [] }))
    }
  }

  const handleBookTrip = async (tripId: string) => {
    if (!request) return
    
    try {
      const trip = availableTrips.find((t) => t.id === tripId)
      if (!trip) {
        toast.error('الرحلة غير موجودة')
        return
      }
      
      // ✅ Validation: التحقق من أن تاريخ الرحلة ليس في الماضي
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tripDate = new Date(trip.trip_date + 'T00:00:00')
      
      if (tripDate < today) {
        toast.error('لا يمكن حجز رحلة بتاريخ قديم. يرجى اختيار رحلة أخرى.')
        return
      }
      
      const tripType = trip?.trip_type || 'arrival'
      const selectedStopId = selectedStopByTrip[tripId] || null
      
      // إذا كان visit_type === 'visit' وتم حجز رحلة قدوم
      if (request.visit_type === 'visit' && tripType === 'arrival' && bookingStep === 'arrival') {
        // حساب موعد المغادرة (شهر من تاريخ القدوم)
        const arrivalDate = new Date(trip.trip_date)
        const departureDate = new Date(arrivalDate)
        departureDate.setMonth(departureDate.getMonth() + 1)
        
        // حفظ رحلة القدوم
        const updateData: any = {
          trip_id: tripId,
          arrival_date: trip.trip_date,
          selected_dropoff_stop_id: selectedStopId || null,
          trip_status: 'pending_arrival',
          updated_at: new Date().toISOString(),
        }
        
        const { error } = await supabase
          .from('visit_requests')
          .update(updateData)
          .eq('id', request.id)
        
        if (error) throw error
        
        // الانتقال إلى خطوة حجز المغادرة
        setSelectedArrivalTripId(tripId)
        setCalculatedDepartureDate(departureDate.toISOString().split('T')[0])
        setBookingStep('departure')
        setShowAvailableTrips(false)
        setSelectedStopByTrip({})
        
        // إعادة تحميل رحلات المغادرة
        setTimeout(() => {
          setShowAvailableTrips(true)
          loadAvailableTrips('departure')
        }, 100)
        
        toast.success(`تم حجز رحلة القدوم. موعد المغادرة المتوقع: ${formatDate(departureDate.toISOString().split('T')[0])}. يرجى اختيار رحلة المغادرة.`)
        return
      }
      
      // إذا كان حجز رحلة المغادرة
      if (tripType === 'departure' && bookingStep === 'departure') {
        const updateData: any = {
          trip_id: tripId,
          departure_date: trip.trip_date,
          selected_pickup_stop_id: selectedStopId || null,
          trip_status: 'pending_arrival',
          updated_at: new Date().toISOString(),
        }
        
        const { error } = await supabase
          .from('visit_requests')
          .update(updateData)
          .eq('id', request.id)
        
        if (error) throw error
        
        // تحميل رحلة المغادرة
        await loadBookedTrip(tripId)
        setDepartureTrip(availableTrips.find((t) => t.id === tripId))
        
        toast.success('تم حجز رحلة المغادرة بنجاح')
        setShowAvailableTrips(false)
        setBookingStep('arrival')
        setSelectedStopByTrip({})
        load()
        return
      }
      
      // الكود الأصلي للأنواع الأخرى
      const updateData: any = {
        trip_id: tripId,
        trip_status: 'pending_arrival',
        updated_at: new Date().toISOString(),
      }
      
      // حفظ نقطة النزول للقادمون أو نقطة التحميل للمغادرون
      if (tripType === 'arrival' && selectedStopId) {
        updateData.selected_dropoff_stop_id = selectedStopId
      } else if (tripType === 'departure' && selectedStopId) {
        updateData.selected_pickup_stop_id = selectedStopId
      }
      
      // التحقق من وجود حجز سابق
      const hadPreviousBooking = Boolean(request.trip_id)
      const previousTripId = request.trip_id
      
      // إضافة سجل التعديل في admin_notes
      const currentNotes = (request.admin_notes || '') as string
      const tripInfo = trip ? `${trip.start_location_name} → ${trip.end_location_name} (${formatDate(trip.trip_date)})` : 'رحلة جديدة'
      const stopInfo = selectedStopId && tripStopsById[tripId] 
        ? tripStopsById[tripId].find((s: any) => s.id === selectedStopId)?.name 
        : null
      
      let updatedNotes = currentNotes
      if (hadPreviousBooking) {
        const modificationNote = `\n\n=== تعديل الحجز ===\nتم تعديل الحجز من قبل المستخدم\nالرحلة السابقة: ${previousTripId}\nالرحلة الجديدة: ${tripId}\n${tripInfo}${stopInfo ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopInfo}` : ''}\nتاريخ التعديل: ${formatDateTime(new Date())}`
        updatedNotes = currentNotes + modificationNote
        updateData.admin_notes = updatedNotes
      }
      
      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)
      
      if (error) throw error
      
      // ✅ Logging: تسجيل حجز/تعديل رحلة
      try {
        const { logBookingCreated } = await import('@/lib/audit')
        await logBookingCreated(request.id, tripId, {
          visitor_name: request.visitor_name,
          trip_type: tripType,
          selected_stop_id: selectedStopId,
        })
      } catch (logErr) {
        console.error('Error logging booking:', logErr)
        // لا نوقف العملية إذا فشل الـ logging
      }
      
      toast.success(hadPreviousBooking ? 'تم تعديل الحجز بنجاح' : 'تم حجز الرحلة بنجاح')
      setShowAvailableTrips(false)
      setSelectedStopByTrip({})
      load()
      
      // إشعار للمستخدم
      try {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification({
          userId: request.user_id,
          title: hadPreviousBooking ? 'تم تعديل الحجز' : 'تم حجز الرحلة',
          message: hadPreviousBooking 
            ? 'تم تعديل حجز رحلتك بنجاح. سيتم مراجعة التعديل من الإدارة.'
            : 'تم حجز رحلتك بنجاح. يمكنك متابعة تفاصيل الرحلة من هنا.',
          type: 'success',
          relatedType: 'trip',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
      }
      
      // إشعار للإدمن عند التعديل
      if (hadPreviousBooking) {
        try {
          const { notifyAllAdmins } = await import('@/lib/notifications')
          await notifyAllAdmins({
            title: 'تم تعديل الحجز من قبل المستخدم',
            message: `قام المستخدم ${request.visitor_name} بتعديل حجز رحلته.\nالرحلة الجديدة: ${tripInfo}${stopInfo ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopInfo}` : ''}`,
            type: 'warning',
            relatedType: 'trip',
            relatedId: request.id,
          })
        } catch (notifyError) {
          console.error('Error sending admin notification:', notifyError)
        }
      } else {
        // إشعار للإدمن عند الحجز الأول
        try {
          const { notifyAllAdmins } = await import('@/lib/notifications')
          await notifyAllAdmins({
            title: 'حجز رحلة جديد',
            message: `تم حجز رحلة للمستخدم ${request.visitor_name}`,
            type: 'info',
            relatedType: 'trip',
            relatedId: request.id,
          })
        } catch (notifyError) {
          console.error('Error sending admin notification:', notifyError)
        }
      }
    } catch (e: any) {
      console.error('Error booking trip:', e)
      toast.error(e.message || 'حدث خطأ أثناء حجز الرحلة')
    }
  }

  const handleChangeBooking = () => {
    // إذا كان visit_type === 'visit' وليس لدينا رحلة قدوم محجوزة، ابدأ بحجز القدوم
    if (request?.visit_type === 'visit' && !request.arrival_date) {
      setBookingStep('arrival')
      setShowAvailableTrips(true)
      loadAvailableTrips('arrival')
    } else if (request?.visit_type === 'visit' && request.arrival_date && !request.departure_date) {
      // إذا كان لدينا رحلة قدوم لكن لا رحلة مغادرة، ابدأ بحجز المغادرة
      const arrivalDate = new Date(request.arrival_date)
      const departureDate = new Date(arrivalDate)
      departureDate.setMonth(departureDate.getMonth() + 1)
      setCalculatedDepartureDate(departureDate.toISOString().split('T')[0])
      setBookingStep('departure')
      setShowAvailableTrips(true)
      loadAvailableTrips('departure')
    } else {
      setBookingStep('arrival')
      setShowAvailableTrips(true)
      loadAvailableTrips()
    }
  }

  const toggleTripStops = async (tripId: string) => {
    const next = expandedTripId === tripId ? null : tripId
    setExpandedTripId(next)
    if (next) {
      await loadTripStops(tripId)
    }
  }

  const handleRemainingPaymentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('الصورة أكبر من 5 ميجابايت')
      return
    }

    setRemainingPaymentImage(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setRemainingPaymentPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.currentTarget.value = ''
  }

  const removeRemainingPaymentImage = () => {
    setRemainingPaymentImage(null)
    setRemainingPaymentPreview(null)
  }

  const uploadRemainingPayment = async () => {
    if (!remainingPaymentImage || !request) {
      toast.error('يرجى اختيار صورة الدفع')
      return
    }

    setUploadingRemainingPayment(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول')
        return
      }

      // رفع الصورة
      const fileExt = remainingPaymentImage.name.split('.').pop()
      const fileName = `${user.id}/remaining_payment_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('passports')
        .upload(fileName, remainingPaymentImage)

      if (uploadError) throw uploadError

      // إنشاء signed URL للصورة (لأن bucket passports خاص)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('passports')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 أيام

      if (signedUrlError) throw signedUrlError

      const imageUrl = signedUrlData?.signedUrl || fileName

      // تحديث admin_notes
      const currentNotes = (request.admin_notes || '') as string
      const updatedNotes = currentNotes + `\nصورة الدفع المتبقي: ${imageUrl}\nتم رفع صورة الدفع المتبقي بتاريخ: ${formatDate(new Date())}`

      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({
          admin_notes: updatedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (updateError) throw updateError

      toast.success('تم رفع صورة الدفع بنجاح. سيتم مراجعتها من الإدارة.')
      setRemainingPaymentImage(null)
      setRemainingPaymentPreview(null)
      load()

      // إشعار للإدمن
      try {
        const { notifyAllAdmins } = await import('@/lib/notifications')
        await notifyAllAdmins({
          title: 'صورة دفع متبقي جديدة',
          message: `تم رفع صورة الدفع المتبقي للمستخدم ${request.visitor_name}`,
          type: 'info',
          relatedType: 'request',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending admin notification:', notifyError)
      }
    } catch (e: any) {
      console.error('Error uploading remaining payment:', e)
      toast.error(e.message || 'حدث خطأ أثناء رفع الصورة')
    } finally {
      setUploadingRemainingPayment(false)
    }
  }

  const steps = useMemo(() => {
    if (!request) return []
    
    const notes = (request.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isApproved = request.status === 'approved' || request.status === 'completed'
    const hasArrival = Boolean(request.arrival_date)
    const depositPaid = Boolean(request.deposit_paid)
    const isUnderReview = request.status === 'under_review'

    return [
      {
        id: 1,
        title: 'تم تقديم الطلب',
        done: !isDraft,
        help: 'قدّم طلبك وارفع صورة الجواز فقط.',
      },
      {
        id: 2,
        title: 'انتظار الموافقة',
        done: isApproved,
        help: isUnderReview
          ? 'طلبك الآن قيد المراجعة لدى الإدارة.'
          : depositPaid
          ? 'تم استلام الرسوم من الإدارة.'
          : 'بانتظار استلام الطلب من الإدارة.',
      },
      {
        id: 3,
        title: 'الحجز والتتبع',
        done: hasArrival || Boolean(request.trip_id),
        help: 'بعد الموافقة، يمكنك حجز الرحلة ومتابعة التتبع عند انطلاق الرحلة.',
      },
    ]
  }, [request])

  useEffect(() => {
    if (!request) return
    
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isApproved = request?.status === 'approved' || request?.status === 'completed'
    
    // تحديد الخطوة النشطة بناءً على الحالة
    if (isDraft) {
      setActiveStep(1)
    } else if (isApproved) {
      // بعد الموافقة - الخطوة 3 نشطة مباشرة
      setActiveStep(3)
    } else {
      // بانتظار الموافقة
      setActiveStep(2)
    }
  }, [request])

  // تحميل signed URL لصورة الدفع المتبقي المرفوعة
  useEffect(() => {
    const loadUploadedRemainingPaymentImage = async () => {
      if (!request) {
        setUploadedRemainingPaymentUrl(null)
        return
      }
      
      const notes = (request.admin_notes || '') as string
      const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
      const rawUrl = match?.[1]?.trim()
      
      if (!rawUrl) {
        setUploadedRemainingPaymentUrl(null)
        return
      }
      
      // إذا كان الرابط يحتوي على token (signed URL)، استخدمه مباشرة
      if (rawUrl.includes('?token=') || rawUrl.includes('&token=')) {
        setUploadedRemainingPaymentUrl(rawUrl)
        return
      }
      
      // إذا لم يكن signed URL، قم بإنشاء signed URL جديد
      try {
        const { getSignedImageUrl } = await import('@/components/request-details/utils')
        const signedUrl = await getSignedImageUrl(rawUrl, supabase)
        setUploadedRemainingPaymentUrl(signedUrl)
      } catch (error) {
        console.error('Error loading remaining payment image signed URL:', error)
        // في حالة الخطأ، استخدم الرابط الأصلي
        setUploadedRemainingPaymentUrl(rawUrl)
      }
    }
    
    loadUploadedRemainingPaymentImage()
  }, [request, supabase])

  const current = steps.find((s) => s.id === activeStep)
  const canGoNext = activeStep < 3 && Boolean(steps.find((s) => s.id === activeStep)?.done)

  if (loading) {
    return (
      <div className="page">
        <div className="page-container">
          <div className="card">
            <div className="p-6 text-center text-gray-600">جاري التحميل...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!request) return null

  const isDraft = ((request.admin_notes || '') as string).startsWith('[DRAFT]')
  const isApproved = request.status === 'approved' || request.status === 'completed'
  const trackingHref = `/#map`

  return (
    <div className="page">
      <div className="page-container">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة التحكم</span>
        </Link>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900">متابعة الطلب</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  الطلب: <span className="font-bold text-gray-800">{request.visitor_name}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/request/${request.id}`}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold"
                >
                  تفاصيل الطلب
                </Link>
                <Link
                  href={trackingHref}
                  className="px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2"
                  title="تتبّع على الخريطة"
                >
                  <MapPin className="w-4 h-4 text-blue-600" />
                  تتبّع على الخريطة
                </Link>
              </div>
            </div>

            {/* Stepper */}
            <div className="mt-4">
              <RequestFollowStepper
                steps={steps}
                activeStep={activeStep}
                onStepClick={setActiveStep}
              />
            </div>
          </div>

          {/* Stage content */}
          <div className="p-4 sm:p-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-extrabold text-gray-900">
                    المرحلة {activeStep}: {current?.title}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 leading-relaxed">{current?.help}</p>
                </div>
                <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  current?.done ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {current?.done ? 'مكتملة' : 'قيد الانتظار'}
                </span>
              </div>

              <div className="mt-4">
                <HelpContactButtons
                  message={`مرحباً، أحتاج مساعدة بخصوص متابعة طلب الزيارة رقم ${request.id.slice(0, 8).toUpperCase()}.\nالزائر: ${request.visitor_name}`}
                />
                <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
                  ملاحظة: عند الضغط على واتساب/اتصال سيتم فتح تطبيق التواصل فقط، ولن تتغير حالة الطلب تلقائياً.
                </p>
              </div>

              {!!actionLog.length && (
                <div className="mt-4">
                  <details className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <summary className="cursor-pointer text-sm font-extrabold text-gray-900">
                      سجل الإجراءات (ما تم على طلبك)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {actionLog.map((it, idx) => (
                        <div key={`${it.kind}-${idx}`} className="border border-gray-200 rounded-lg p-2 sm:p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs sm:text-sm font-bold text-gray-900">{it.title}</p>
                            {it.dateText && (
                              <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap">{it.dateText}</span>
                            )}
                          </div>
                          <p className="mt-1 text-xs sm:text-sm text-gray-700 whitespace-pre-line leading-relaxed">{it.body}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Actions per step */}
              <div className="mt-4 space-y-2">
                {activeStep === 1 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-4">
                      تم تقديم الطلب بنجاح. يرجى التواصل مع الموظف المسؤول لدفع الرسوم.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href="https://wa.me/962798905595"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        واتساب
                      </a>
                      <a
                        href="tel:00962798905595"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                        >
                        <Phone className="w-4 h-4" />
                        اتصال
                      </a>
                      </div>
                      </div>
                )}
                {activeStep === 2 && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-4">
                      {(() => {
                        const isApproved = request.status === 'approved' || request.status === 'completed'
                        if (isApproved) return 'تمت الموافقة على الطلب. يمكنك الانتقال للحجز.'

                        if (request.deposit_paid) {
                          // deposit_paid يتم تفعيله عند تأكيد الإدمن لاستلام الرسوم
                          return '✅ تم استلام الرسوم من الإدارة. طلبك الآن قيد المراجعة وبانتظار الموافقة (قد يستغرق 7 إلى 14 يوم). بعد الموافقة سيفتح الحجز مباشرة.'
                        }

                        if (request.status === 'under_review') {
                          return '📌 تم استلام طلبك من الإدارة وهو قيد المراجعة. يمكنك دفع الرسوم الآن أو لاحقاً عبر التواصل مع الموظف المسؤول.'
                        }

                        return 'بانتظار استلام طلبك من الإدارة. إذا رغبت بدفع الرسوم الآن أو الاستفسار، تواصل مع الموظف المسؤول.'
                      })()}
                    </p>
                    {!request.deposit_paid && (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            const shortCode = request.id.slice(0, 8).toUpperCase()
                            const message = `مرحباً، أريد استكمال طلب الزيارة رقم ${shortCode}\nالزائر: ${request.visitor_name}\nمكان الانطلاق: ${request.city || 'غير محدد'}\nتم تقديم الطلب عبر المنصة. يرجى إعلامي بكيفية دفع الرسوم.`
                            const whatsappUrl = `https://wa.me/962798905595?text=${encodeURIComponent(message)}`
                            window.open(whatsappUrl, '_blank')
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          تواصل عبر واتساب (دفع/استفسار)
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <a
                            href="https://wa.me/962798905595"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                          >
                            <MessageCircle className="w-4 h-4" />
                            واتساب
                          </a>
                          <a
                            href="tel:00962798905595"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                          >
                            <Phone className="w-4 h-4" />
                            اتصال
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    {/* حجز الرحلة - متاح مباشرة بعد الموافقة */}
                    {isApproved ? (
                      <>
                        {request.trip_id && bookedTrip ? (
                          <BookedTripCard
                            trip={bookedTrip}
                            isBookingConfirmed={(() => {
                              const notes = (request.admin_notes || '') as string
                              return notes.includes('تم تأكيد الحجز')
                            })()}
                            onChangeBooking={handleChangeBooking}
                          />
                        ) : (
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                            {(() => {
                              const notes = (request.admin_notes || '') as string
                              const isBookingConfirmed = notes.includes('تم تأكيد الحجز')
                              
                              // إخفاء الأزرار بعد تأكيد الحجز
                              if (isBookingConfirmed) {
                                return (
                                  <div className="bg-gradient-to-r from-green-500 to-green-600 border-2 border-green-400 rounded-xl p-4 sm:p-5 shadow-lg">
                                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                      <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white flex-shrink-0" />
                                      <h4 className="text-lg sm:text-xl font-extrabold text-white">تم تأكيد الحجز</h4>
                                    </div>
                                    <div className="bg-white/95 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                                      <p className="text-sm sm:text-base font-bold text-gray-900 leading-relaxed">
                                        ✅ تم تأكيد حجز رحلتك بنجاح
                                      </p>
                                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                        سيتم تتبع رحلتك عند الانطلاق. يمكنك معرفة المسار وترقب الوصول من خلال متابعة الرحلة على الخريطة.
                                      </p>
                                    </div>
                                  </div>
                                )
                              }
                              
                              return (
                                <>
                                  <p className="text-sm text-green-800 mb-3">
                                    تم فتح الحجز. يمكنك الآن حجز رحلة من الرحلات المتاحة أو تحديد موعد قدوم مخصص.
                                  </p>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // إذا كان visit_type === 'visit' وليس لدينا رحلة قدوم محجوزة، ابدأ بحجز القدوم
                                        if (request?.visit_type === 'visit' && !request.arrival_date) {
                                          setBookingStep('arrival')
                                          setShowAvailableTrips(true)
                                          loadAvailableTrips('arrival')
                                        } else if (request?.visit_type === 'visit' && request.arrival_date && !request.departure_date) {
                                          // إذا كان لدينا رحلة قدوم لكن لا رحلة مغادرة، ابدأ بحجز المغادرة
                                          const arrivalDate = new Date(request.arrival_date)
                                          const departureDate = new Date(arrivalDate)
                                          departureDate.setMonth(departureDate.getMonth() + 1)
                                          setCalculatedDepartureDate(departureDate.toISOString().split('T')[0])
                                          setBookingStep('departure')
                                          setShowAvailableTrips(true)
                                          loadAvailableTrips('departure')
                                        } else {
                                          setBookingStep('arrival')
                                          setShowAvailableTrips(true)
                                          loadAvailableTrips()
                                        }
                                      }}
                                      disabled={(() => {
                                        const notes = (request?.admin_notes || '') as string
                                        return notes.includes('تم تأكيد الحجز')
                                      })()}
                                      className={`px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                                        (() => {
                                          const notes = (request?.admin_notes || '') as string
                                          return notes.includes('تم تأكيد الحجز')
                                        })()
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      <Bus className="w-4 h-4" />
                                      عرض الرحلات المتاحة
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowSchedule(true)}
                                      disabled={(() => {
                                        const notes = (request?.admin_notes || '') as string
                                        return notes.includes('تم تأكيد الحجز')
                                      })()}
                                      className={`px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                                        (() => {
                                          const notes = (request?.admin_notes || '') as string
                                          return notes.includes('تم تأكيد الحجز')
                                        })()
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                    >
                                      <Calendar className="w-4 h-4" />
                                      حجز موعد مخصص
                                    </button>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600">
                          بانتظار الموافقة من الإدارة لفتح الحجز.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Link
                        href={trackingHref}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                        title="تتبّع على الخريطة"
                      >
                        <MapPin className="w-4 h-4 text-blue-600" />
                        تتبّع على الخريطة
                      </Link>
                      {request.arrival_date && !request.trip_id && (
                        <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                          الموعد الحالي: <span className="font-bold text-gray-900">{formatDate(request.arrival_date)}</span>
                        </div>
                      )}
                    </div>

                    {(selectedDropoffStop || selectedPickupStop) && (
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-extrabold text-gray-900 mb-2">نقاط الصعود/النزول</p>
                        <div className="space-y-2 text-sm text-gray-700">
                          {selectedDropoffStop && (
                            <div>
                              <span className="font-bold text-gray-900">نقطة النزول:</span> {selectedDropoffStop.name}
                  </div>
                )}
                          {selectedPickupStop && (
                            <div>
                              <span className="font-bold text-gray-900">نقطة الصعود:</span> {selectedPickupStop.name}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* التنقل (السابق/التالي) تم إزالته لتجنب إرباك المستخدم — يمكنك التنقل عبر أرقام المراحل بالأعلى */}
          </div>
        </div>
      </div>

      {showSchedule && (
        <TripSchedulingModal
          request={request as any}
          onClose={() => setShowSchedule(false)}
          onUpdate={load}
          isAdmin={false}
        />
      )}

      {/* Available Trips Modal */}
      <AvailableTripsModal
        isOpen={showAvailableTrips}
        loading={loadingTrips}
        trips={availableTrips}
        visitType={request?.visit_type}
        bookingStep={bookingStep}
        calculatedDepartureDate={calculatedDepartureDate}
        expandedTripId={expandedTripId}
        tripStopsById={tripStopsById}
        loadingStopsId={loadingStopsId}
        selectedStopByTrip={selectedStopByTrip}
        onClose={() => setShowAvailableTrips(false)}
        onToggleStops={toggleTripStops}
        onSelectStop={(tripId, stopId) => {
          setSelectedStopByTrip((p) => ({
            ...p,
            [tripId]: stopId,
          }))
        }}
        onBookTrip={handleBookTrip}
        isBookingDisabled={(() => {
          const notes = (request?.admin_notes || '') as string
          return notes.includes('تم تأكيد الحجز')
        })()}
      />
    </div>
  )
}


