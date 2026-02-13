'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowRight, CheckCircle, Clock, Save, MessageCircle, Phone, Bus, Calendar, MapPin, DollarSign, Navigation } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { formatDate } from '@/lib/date-utils'
import { parseAdminNotes, getSignedImageUrl } from '@/components/request-details/utils'
import { notifyRequestApproved, notifyRequestRejected, notifyPaymentVerified, notifyCustomMessage } from '@/lib/notifications'
import AvailableTripsModal from '@/components/request-follow/AvailableTripsModal'
import AdminRequestFollowStepper from './AdminRequestFollowStepper'
import AdminResponseSection from './AdminResponseSection'
import DepositPaymentImages from './DepositPaymentImages'
import RemainingPaymentImage from './RemainingPaymentImage'
import StepActions from './StepActions'
import BookedTripDetails from './BookedTripDetails'
import TripModificationsHistory from './TripModificationsHistory'

type Role = 'admin' | 'supervisor'
type ContactProfile = { full_name: string | null; phone: string | null; jordan_phone?: string | null; whatsapp_phone?: string | null }

type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  admin_notes: string | null
  rejection_reason: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  arrival_date: string | null
  departure_date: string | null
  trip_status: string | null
  trip_id?: string | null
  assigned_to: string | null
  selected_dropoff_stop_id?: string | null
  selected_pickup_stop_id?: string | null
  deposit_paid?: boolean | null
  deposit_amount?: number | null
  companions_count?: number | null
  created_at: string
  updated_at: string
}

type TripLite = {
  id: string
  trip_date: string
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  trip_type?: string | null
}

type AssignedDriver = { id: string; name: string; phone: string | null; vehicle_type: string | null }

const POST_APPROVAL_SUBMITTED_MARK = 'حالة الاستكمال: مرسل'

function extractLatestAdminResponse(notes: string): { body: string; dateText?: string } | null {
  const marker = '=== رد الإدارة ==='
  const idx = notes.lastIndexOf(marker)
  if (idx === -1) return null
  const after = notes.slice(idx + marker.length).trim()
  if (!after) return null
  const dateIdx = after.lastIndexOf('تاريخ الرد:')
  if (dateIdx !== -1) {
    const body = after.slice(0, dateIdx).trim()
    const dateText = after.slice(dateIdx).replace('تاريخ الرد:', '').trim()
    return body ? { body, dateText } : null
  }
  return { body: after }
}

function extractAllAdminResponses(notes: string): Array<{ body: string; dateText?: string }> {
  const marker = '=== رد الإدارة ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1) // content after each marker
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
  // newest first (because we append to notes)
  return res.reverse()
}

function extractTripModifications(notes: string): Array<{ oldTripId?: string; newTripId?: string; tripInfo?: string; stopInfo?: string; dateText?: string }> {
  const marker = '=== تعديل الحجز ==='
  if (!notes.includes(marker)) return []
  const parts = notes.split(marker).slice(1) // content after each marker
  const res: Array<{ oldTripId?: string; newTripId?: string; tripInfo?: string; stopInfo?: string; dateText?: string }> = []
  for (const p of parts) {
    const chunk = (p || '').trim()
    if (!chunk) continue
    const mod: any = {}
    const lines = chunk.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('الرحلة السابقة:')) {
        mod.oldTripId = trimmed.replace('الرحلة السابقة:', '').trim()
      } else if (trimmed.startsWith('الرحلة الجديدة:')) {
        mod.newTripId = trimmed.replace('الرحلة الجديدة:', '').trim()
      } else if (trimmed.startsWith('نقطة النزول:') || trimmed.startsWith('نقطة التحميل:')) {
        mod.stopInfo = trimmed.split(':')[1]?.trim()
      } else if (trimmed.startsWith('تاريخ التعديل:')) {
        mod.dateText = trimmed.replace('تاريخ التعديل:', '').trim()
      } else if (trimmed && !trimmed.startsWith('تم تعديل الحجز') && !trimmed.startsWith('من قبل')) {
        // معلومات الرحلة (المسار والتاريخ)
        if (!mod.tripInfo) {
          mod.tripInfo = trimmed
        }
      }
    }
    if (mod.newTripId || mod.tripInfo) {
      res.push(mod)
    }
  }
  // newest first
  return res.reverse()
}

export default function AdminRequestFollow({
  requestId,
  adminUserId,
  role,
}: {
  requestId: string
  adminUserId: string
  role: Role
}) {
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<ReqRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newResponse, setNewResponse] = useState('')
  const [userProfile, setUserProfile] = useState<ContactProfile | null>(null)
  const [bookedTrip, setBookedTrip] = useState<TripLite | null>(null)
  const [bookedStops, setBookedStops] = useState<Array<{ id: string; name: string; order_index: number }> | null>(null)
  const [selectedDropoffStop, setSelectedDropoffStop] = useState<{ id: string; name: string } | null>(null)
  const [selectedPickupStop, setSelectedPickupStop] = useState<{ id: string; name: string } | null>(null)
  const [remainingPaymentImageUrl, setRemainingPaymentImageUrl] = useState<string | null>(null)
  const [depositPaymentImageUrls, setDepositPaymentImageUrls] = useState<string[]>([])
  const [assignedDrivers, setAssignedDrivers] = useState<AssignedDriver[]>([])
  // Admin-assisted booking (route trips + stop points)
  const [showAvailableTrips, setShowAvailableTrips] = useState(false)
  const [availableTrips, setAvailableTrips] = useState<any[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [tripStopsById, setTripStopsById] = useState<Record<string, any[]>>({})
  const [loadingStopsId, setLoadingStopsId] = useState<string | null>(null)
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null)
  const [selectedStopByTrip, setSelectedStopByTrip] = useState<Record<string, string>>({})
  const [bookingStep, setBookingStep] = useState<'arrival' | 'departure'>('arrival')
  const [calculatedDepartureDate, setCalculatedDepartureDate] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,status,admin_notes,rejection_reason,payment_verified,remaining_amount,arrival_date,departure_date,trip_status,trip_id,assigned_to,selected_dropoff_stop_id,selected_pickup_stop_id,deposit_paid,deposit_amount,companions_count,created_at,updated_at'
        )
        .eq('id', requestId)
        .single()
      if (error) throw error

      const row = data as any as ReqRow
      if (role === 'supervisor' && row.assigned_to && row.assigned_to !== adminUserId) {
        toast.error('هذا الطلب غير مخصص لك')
        setRequest(null)
        return
      }

      setRequest(row)

      // Load booked trip (if user booked route_trip)
      if ((row as any)?.trip_id) {
        try {
          const tripId = String((row as any).trip_id)
          const { data: t, error: tErr } = await supabase
            .from('route_trips')
            .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,trip_type')
            .eq('id', tripId)
            .maybeSingle()
          if (!tErr && t) {
            setBookedTrip(t as any)
            // Load assigned drivers for this trip
            try {
              const { data: drvRows } = await supabase
                .from('route_trip_drivers')
                .select('drivers(id,name,phone,vehicle_type)')
                .eq('trip_id', tripId)
                .eq('is_active', true)
              const list = (drvRows || [])
                .map((x: any) => x.drivers)
                .filter(Boolean) as AssignedDriver[]
              setAssignedDrivers(list)
            } catch {
              setAssignedDrivers([])
            }
            const { data: stops } = await supabase
              .from('route_trip_stop_points')
              .select('id,name,order_index')
              .eq('trip_id', tripId)
              .order('order_index', { ascending: true })
            setBookedStops((stops as any) || [])
            
            // تحميل نقطة النزول/التحميل المختارة
            const rowData = row as any
            if (rowData.selected_dropoff_stop_id) {
              const { data: dropoffStop } = await supabase
                .from('route_trip_stop_points')
                .select('id,name')
                .eq('id', rowData.selected_dropoff_stop_id)
                .maybeSingle()
              setSelectedDropoffStop(dropoffStop ? { id: dropoffStop.id, name: dropoffStop.name } : null)
            } else {
              setSelectedDropoffStop(null)
            }
            
            if (rowData.selected_pickup_stop_id) {
              const { data: pickupStop } = await supabase
                .from('route_trip_stop_points')
                .select('id,name')
                .eq('id', rowData.selected_pickup_stop_id)
                .maybeSingle()
              setSelectedPickupStop(pickupStop ? { id: pickupStop.id, name: pickupStop.name } : null)
            } else {
              setSelectedPickupStop(null)
            }
          } else {
            setBookedTrip(null)
            setBookedStops(null)
            setAssignedDrivers([])
            setSelectedDropoffStop(null)
            setSelectedPickupStop(null)
          }
        } catch {
          setBookedTrip(null)
          setBookedStops(null)
          setAssignedDrivers([])
        }
      } else {
        setBookedTrip(null)
        setBookedStops(null)
        setAssignedDrivers([])
      }

      // Load contact profile for WhatsApp/phone buttons
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name,phone,jordan_phone,whatsapp_phone')
          .eq('user_id', row.user_id)
          .maybeSingle()
        setUserProfile((prof as any) || null)
      } catch {
        setUserProfile(null)
      }
    } catch (e: any) {
      console.error('Admin follow load error:', e)
      toast.error(e?.message || 'تعذر تحميل الطلب')
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
  }, [requestId])

  const adminInfo = useMemo(() => parseAdminNotes((request?.admin_notes || '') as string) || {}, [request])
  const latestResponse = useMemo(() => extractLatestAdminResponse((request?.admin_notes || '') as string), [request])
  const responseHistory = useMemo(() => extractAllAdminResponses((request?.admin_notes || '') as string), [request])
  const tripModifications = useMemo(() => extractTripModifications((request?.admin_notes || '') as string), [request])

  const steps = useMemo(() => {
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const paymentVerified = Boolean(request?.payment_verified)
    const hasArrival = Boolean(request?.arrival_date)
    const isApproved = request?.status === 'approved' || request?.status === 'completed'
    const depositPaid = Boolean(request?.deposit_paid)
    // الخطوة 1 تتفعل عندما يدفع المستخدم (!isDraft) وبعد أن يضغط الإدمن "تم استلام الطلب" (status !== 'pending')
    const isReceived = Boolean(request) && !isDraft && request?.status !== 'pending'
    const hasBooking = Boolean((request as any)?.trip_id)
    const hasRemainingPaymentImage = notes.includes('صورة الدفع المتبقي:')

    return [
      { 
        id: 1, 
        title: 'تقديم الطلب', 
        done: isReceived, 
        help: depositPaid 
          ? 'المستخدم دفع الرسوم. اضغط "تم استلام الرسوم" للمتابعة.'
          : 'المستخدم قام برفع الجواز وتقديم الطلب. بانتظار دفع الرسوم من المستخدم.' 
      },
      { 
        id: 2, 
        title: 'الموافقة', 
        done: isApproved || request?.status === 'rejected', 
        help: 'قم بقبول الطلب أو رفضه. بعد الموافقة، سيتم فتح الحجز للمستخدم مباشرة.' 
      },
      { 
        id: 3, 
        title: 'الحجز والمتابعة', 
        done: hasBooking || hasArrival, 
        help: 'ستظهر هنا الرحلة التي حجزها المستخدم + يمكنك متابعة الموعد والتتبع.' 
      },
    ]
  }, [request])

  useEffect(() => {
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    
    // إذا كان الطلب draft، الخطوة 1 نشطة
    if (isDraft) {
      setActiveStep(1)
      return
    }
    
    // بعد تقديم الطلب، نحدد الخطوة النشطة بناءً على الخطوات المكتملة
    const firstIncomplete = steps.find((s) => !s.done)?.id || 3
    setActiveStep(firstIncomplete)
  }, [request, steps])

  // تحميل signed URL لصورة الدفع المتبقي
  useEffect(() => {
    const loadPaymentImageUrl = async () => {
      if (!request) {
        setRemainingPaymentImageUrl(null)
        return
      }
      
      const notes = (request.admin_notes || '') as string
      const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
      const rawUrl = match?.[1]?.trim()
      
      if (!rawUrl) {
        setRemainingPaymentImageUrl(null)
        return
      }
      
      // إذا كان الرابط يحتوي على token (signed URL)، استخدمه مباشرة
      if (rawUrl.includes('?token=') || rawUrl.includes('&token=')) {
        setRemainingPaymentImageUrl(rawUrl)
        return
      }
      
      // إذا لم يكن signed URL، قم بإنشاء signed URL جديد
      try {
        const signedUrl = await getSignedImageUrl(rawUrl, supabase)
        setRemainingPaymentImageUrl(signedUrl)
      } catch (error) {
        console.error('Error loading payment image signed URL:', error)
        // في حالة الخطأ، استخدم الرابط الأصلي
        setRemainingPaymentImageUrl(rawUrl)
      }
    }
    
    loadPaymentImageUrl()
  }, [request, supabase])

  // تحميل signed URLs لصور الدفعة الأولية
  useEffect(() => {
    const loadDepositPaymentImages = async () => {
      if (!request || !adminInfo?.paymentImages || adminInfo.paymentImages.length === 0) {
        setDepositPaymentImageUrls([])
        return
      }

      try {
        const signedUrls = await Promise.all(
          adminInfo.paymentImages.map(async (url: string) => {
            try {
              return await getSignedImageUrl(url, supabase)
            } catch (error) {
              console.warn('Error loading payment image signed URL:', error)
              return url
            }
          })
        )
        setDepositPaymentImageUrls(signedUrls.filter(Boolean))
      } catch (error) {
        console.error('Error loading deposit payment images:', error)
        setDepositPaymentImageUrls(adminInfo.paymentImages || [])
      }
    }

    loadDepositPaymentImages()
  }, [request, adminInfo?.paymentImages, supabase])

  const current = steps.find((s) => s.id === activeStep)
  const canGoNext = activeStep < 4 && Boolean(current?.done)
  const canGoPrev = activeStep > 1

  const approve = async () => {
    if (!request) return
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const autoMsg = '✅ تمت الموافقة على الطلب. تم فتح الحجز ويمكنك المتابعة من صفحة متابعة الطلب.'
      const section = `\n\n=== رد الإدارة ===\n${autoMsg}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'approved', 
          payment_verified: true, // فتح الحجز مباشرة عند الموافقة
          admin_notes: nextNotes,
          updated_at: stamp 
        } as any)
        .eq('id', request.id)
      if (error) throw error
      
      // ✅ Logging: تسجيل تغيير حالة الطلب
      try {
        const { logRequestStatusChanged } = await import('@/lib/audit')
        await logRequestStatusChanged(request.id, request.status, 'approved', request.visitor_name)
      } catch (logErr) {
        console.error('Error logging status change:', logErr)
      }
      
      // إرسال الإشعار بشكل منفصل مع معالجة الأخطاء واستخدام نفس Supabase client
      try {
        // استخدام نفس Supabase client المستخدم في الصفحة
        const { notifyRequestApproved } = await import('@/lib/notifications')
        await notifyRequestApproved(request.user_id, request.id, request.visitor_name, supabase)
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
        // لا نوقف العملية إذا فشل الإشعار
      }
      
      toast.success('تم قبول الطلب')
      await load()
    } catch (e: any) {
      console.error('approve error:', e)
      toast.error(e?.message || 'تعذر قبول الطلب')
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    if (!request) return
    const reason = prompt('أدخل سبب الرفض (اختياري):') || ''
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const autoMsg = reason?.trim()
        ? `✗ تم رفض الطلب.\nسبب الرفض: ${reason.trim()}`
        : '✗ تم رفض الطلب.'
      const section = `\n\n=== رد الإدارة ===\n${autoMsg}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: reason || null, 
          admin_notes: nextNotes,
          updated_at: stamp 
        } as any)
        .eq('id', request.id)
      if (error) throw error
      
      // ✅ Logging: تسجيل تغيير حالة الطلب
      try {
        const { logRequestStatusChanged } = await import('@/lib/audit')
        await logRequestStatusChanged(request.id, request.status, 'rejected', request.visitor_name)
      } catch (logErr) {
        console.error('Error logging status change:', logErr)
      }
      
      await notifyRequestRejected(request.user_id, request.id, request.visitor_name, reason || undefined)
      toast.success('تم رفض الطلب')
      await load()
    } catch (e: any) {
      console.error('reject error:', e)
      toast.error(e?.message || 'تعذر رفض الطلب')
    } finally {
      setSaving(false)
    }
  }

  const setPaymentVerified = async (val: boolean) => {
    if (!request) return
    try {
      setSaving(true)
      const { error } = await supabase
        .from('visit_requests')
        .update({ payment_verified: val, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      if (val) await notifyPaymentVerified(request.user_id, request.id)
      toast.success(val ? 'تم تأكيد الدفع' : 'تم إلغاء تأكيد الدفع')
      await load()
    } catch (e: any) {
      console.error('payment verify error:', e)
      toast.error(e?.message || 'تعذر تحديث حالة الدفع')
    } finally {
      setSaving(false)
    }
  }

  const saveResponse = async () => {
    if (!request) return
    const msg = newResponse.trim()
    if (!msg) return toast.error('اكتب رد الإدارة أولاً')
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${msg}\nتاريخ الرد: ${stamp}`
      const updatedNotes = ((request.admin_notes || '') as string) + section
      const { error } = await supabase
        .from('visit_requests')
        .update({ admin_notes: updatedNotes, updated_at: new Date().toISOString() } as any)
        .eq('id', request.id)
      if (error) throw error
      await notifyCustomMessage(request.user_id, request.id, msg)
      toast.success('تم إرسال الرد للمستخدم')
      setNewResponse('')
      await load()
    } catch (e: any) {
      console.error('saveResponse error:', e)
      toast.error(e?.message || 'تعذر إرسال الرد')
    } finally {
      setSaving(false)
    }
  }

  const appendAdminResponseAndNotify = async (
    msg: string,
    alsoMarkReceived?: boolean,
    alsoMarkDepositPaid?: boolean
  ) => {
    if (!request) return
    const clean = (msg || '').trim()
    if (!clean) return toast.error('لا يوجد نص لإرساله')
    
    // إذا كان alsoMarkReceived = true و status !== 'pending'، يعني تم استلامه مسبقاً
    if (alsoMarkReceived && request.status !== 'pending') {
      toast.error('تم استلام الطلب مسبقاً. لا يمكن إرسال إشعار الاستلام مرة أخرى.')
      return
    }
    
    try {
      setSaving(true)
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${clean}\nتاريخ الرد: ${stamp}`
      const nextNotes = ((request.admin_notes || '') as string) + section
      const update: any = { admin_notes: nextNotes, updated_at: new Date().toISOString() }
      if (alsoMarkReceived && request.status === 'pending') {
        update.status = 'under_review'
        // نحدد deposit_paid فقط عند تأكيد استلام الرسوم (وليس عند استلام الطلب بدون دفع)
        if (alsoMarkDepositPaid && !request.deposit_paid) {
          update.deposit_paid = true
          // حساب المبلغ بناءً على عدد الأشخاص (إذا كان موجوداً في companions_data)
          const companionsCount = request.companions_count || 0
          const totalPeople = companionsCount + 1 // الزائر الرئيسي + المرافقين
          update.deposit_amount = totalPeople * 10
          update.total_amount = totalPeople * 10
        }
      }
      const { error } = await supabase.from('visit_requests').update(update).eq('id', request.id)
      if (error) throw error
      await notifyCustomMessage(request.user_id, request.id, clean)
      toast.success('تم إرسال الرسالة للمستخدم')
      await load()
    } catch (e: any) {
      console.error('appendAdminResponseAndNotify error:', e)
      toast.error(e?.message || 'تعذر إرسال الرسالة')
    } finally {
      setSaving(false)
    }
  }

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

  const remaining = request.remaining_amount ?? 20
  // تواصل مع المستخدم صاحب الطلب (واتساب/اتصال)
  const userContactRaw = String(userProfile?.whatsapp_phone || userProfile?.phone || userProfile?.jordan_phone || '')
  const userWaDigits = userContactRaw.replace(/[^\d]/g, '')
  const userCallDigits = String(userProfile?.phone || userProfile?.whatsapp_phone || userProfile?.jordan_phone || '').replace(/[^\d+]/g, '')
  const shortCode = request.id.slice(0, 8).toUpperCase()
  const userDisplayName = String(userProfile?.full_name || request.visitor_name || '').trim()
  const userWhatsAppMsg = (() => {
    const isApproved = request.status === 'approved' || request.status === 'completed'
    const lines: string[] = []
    lines.push(`مرحباً ${userDisplayName || 'حضرتك'}،`)
    lines.push(`بخصوص طلب الزيارة رقم ${shortCode}.`)
    if (isApproved) {
      lines.push('✅ تمت الموافقة على الطلب.')
      lines.push('ممكن نتواصل لنرتب الحجز ونقاط التجمع/الصعود/النزول.')
      lines.push('يرجى أيضاً تجهيز/توقيع الكفالة.')
      // تنبيه للمبلغ المتبقي (إن وجد)
      if ((request.remaining_amount ?? 0) > 0) {
        lines.push(`يرجى دفع المبلغ المتبقي: ${request.remaining_amount} د.أ`)
      } else {
        lines.push('إذا بقي أي مبلغ، يرجى دفعه لإكمال الإجراءات.')
      }
    } else if (request.status === 'under_review') {
      lines.push('📌 تم استلام طلبك وهو قيد المراجعة.')
      lines.push('إذا احتجت مساعدة أو استفسار، راسلني هنا.')
      if (!request.deposit_paid) {
        lines.push('بالنسبة للرسوم: يمكنك الدفع الآن أو لاحقاً عند التواصل.')
      }
    } else {
      lines.push('طلبك بانتظار المتابعة من الإدارة.')
    }
    return lines.join('\n')
  })()

  const loadTripStops = async (tripId: string) => {
    if (tripStopsById[tripId]) return
    try {
      setLoadingStopsId(tripId)
      const { data, error } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,order_index')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      if (error) throw error
      setTripStopsById((p) => ({ ...p, [tripId]: (data as any) || [] }))
    } catch (e) {
      console.error('Error loading admin trip stops:', e)
      setTripStopsById((p) => ({ ...p, [tripId]: [] }))
    } finally {
      setLoadingStopsId(null)
    }
  }

  const toggleTripStops = async (tripId: string) => {
    const next = expandedTripId === tripId ? null : tripId
    setExpandedTripId(next)
    if (next) await loadTripStops(tripId)
  }

  const loadAvailableTrips = async (tripType?: 'arrival' | 'departure') => {
    try {
      setLoadingTrips(true)
      const today = new Date().toISOString().split('T')[0]
      const filterType = tripType || bookingStep

      let query = supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
        .eq('trip_type', filterType)

      // في حال المغادرة، إذا لدينا موعد قدوم، نقرّب النتائج حول موعد المغادرة المتوقع (شهر بعد القدوم)
      if (filterType === 'departure' && request.arrival_date) {
        const arrivalDate = new Date(request.arrival_date)
        const expectedDeparture = new Date(arrivalDate)
        expectedDeparture.setMonth(expectedDeparture.getMonth() + 1)
        const expected = expectedDeparture.toISOString().split('T')[0]
        setCalculatedDepartureDate(expected)

        const weekBefore = new Date(expectedDeparture)
        weekBefore.setDate(weekBefore.getDate() - 7)
        const weekAfter = new Date(expectedDeparture)
        weekAfter.setDate(weekAfter.getDate() + 7)
        query = query
          .gte('trip_date', weekBefore.toISOString().split('T')[0])
          .lte('trip_date', weekAfter.toISOString().split('T')[0])
      } else {
        setCalculatedDepartureDate(null)
      }

      const { data, error } = await query
      if (error) throw error
      setAvailableTrips((data as any) || [])
    } catch (e) {
      console.error('Error loading admin available trips:', e)
      toast.error('تعذر تحميل الرحلات المتاحة')
      setAvailableTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const openBookingModal = async (step: 'arrival' | 'departure') => {
    setBookingStep(step)
    setSelectedStopByTrip({})
    setExpandedTripId(null)
    setShowAvailableTrips(true)
    await loadAvailableTrips(step)
  }

  const handleAdminBookTrip = async (tripId: string) => {
    if (!request) return
    try {
      const trip = availableTrips.find((t) => t.id === tripId)
      if (!trip) return toast.error('الرحلة غير موجودة')

      const tripType: 'arrival' | 'departure' = (trip.trip_type as any) || bookingStep
      const selectedStopId = selectedStopByTrip[tripId] || null
      const stopName =
        selectedStopId && tripStopsById[tripId]
          ? tripStopsById[tripId].find((s: any) => s.id === selectedStopId)?.name
          : null

      const updateData: any = {
        trip_id: tripId,
        trip_status: 'pending_arrival',
        updated_at: new Date().toISOString(),
      }
      if (tripType === 'arrival') {
        updateData.arrival_date = trip.trip_date
        updateData.selected_dropoff_stop_id = selectedStopId
      } else {
        updateData.departure_date = trip.trip_date
        updateData.selected_pickup_stop_id = selectedStopId
      }

      const tripInfo = `${trip.start_location_name} → ${trip.end_location_name} (${formatDate(trip.trip_date)})`
      const adminNote = `\n\n=== حجز من الإدارة ===\nتم حجز رحلة ${tripType === 'arrival' ? 'قدوم' : 'مغادرة'} بواسطة الإدارة\n${tripInfo}${stopName ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopName}` : ''}\nتاريخ الحجز: ${new Date().toISOString()}`
      updateData.admin_notes = ((request.admin_notes || '') as string) + adminNote

      const { error } = await supabase.from('visit_requests').update(updateData).eq('id', request.id)
      if (error) throw error

      toast.success('تم حجز الرحلة للمستخدم')
      setShowAvailableTrips(false)
      setSelectedStopByTrip({})
      await load()

      // إشعار سريع للمستخدم (اختياري)
      try {
        await notifyCustomMessage(
          request.user_id,
          request.id,
          `تم حجز رحلة ${tripType === 'arrival' ? 'قدوم' : 'مغادرة'} لك من قبل الإدارة.\n${tripInfo}${stopName ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopName}` : ''}`
        )
      } catch (e) {
        console.error('Error notifying user about admin booking:', e)
      }
    } catch (e: any) {
      console.error('handleAdminBookTrip error:', e)
      toast.error(e?.message || 'تعذر حجز الرحلة')
    }
  }

  return (
    <div className="page">
      <div className="page-container">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 sm:gap-2 text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>العودة للوحة الإدارة</span>
        </Link>

        <div className="card">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900">متابعة الطلب (إدمن)</h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              الطلب: <span className="font-bold text-gray-800">{request.visitor_name}</span> • الكود:{' '}
              <span className="font-mono font-bold">{request.id.slice(0, 8).toUpperCase()}</span>
            </p>

            {/* Stepper */}
            <div className="mt-4">
              <AdminRequestFollowStepper
                steps={steps}
                activeStep={activeStep}
                onStepClick={setActiveStep}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
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

              {/* تواصل سريع مع المستخدم */}
              {(userWaDigits || userCallDigits) && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-900 mb-2">تواصل مع المستخدم</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {userWaDigits && (
                      <a
                        href={`https://wa.me/${userWaDigits}?text=${encodeURIComponent(userWhatsAppMsg)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                        title="واتساب المستخدم"
                      >
                        <MessageCircle className="w-4 h-4" />
                        واتساب المستخدم
                      </a>
                    )}
                    {userCallDigits && (
                      <a
                        href={`tel:${userCallDigits}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                        title="اتصال المستخدم"
                      >
                        <Phone className="w-4 h-4" />
                        اتصال المستخدم
                      </a>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
                    سيتم فتح واتساب برسالة جاهزة (يمكنك تعديلها قبل الإرسال).
                  </p>
                </div>
              )}

              {/* تواصل مع السائق المعيّن (إن وجد) */}
              {assignedDrivers.length > 0 && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs sm:text-sm font-bold text-gray-900 mb-2">تواصل مع السائق</p>
                  <div className="space-y-2">
                    {assignedDrivers.map((d) => {
                      const waDigits = String(d.phone || '').replace(/[^\d]/g, '')
                      const callDigits = String(d.phone || '').replace(/[^\d+]/g, '')
                      return (
                        <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-gray-200 rounded-lg p-2">
                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-gray-900 truncate">{d.name}</p>
                            <p className="text-[11px] text-gray-600 truncate">
                              {d.vehicle_type || '—'} {d.phone ? `• ${d.phone}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {waDigits && (
                              <a
                                href={`https://wa.me/${waDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-extrabold inline-flex items-center gap-2"
                              >
                                <MessageCircle className="w-4 h-4" />
                                واتساب
                              </a>
                            )}
                            {callDigits && (
                              <a
                                href={`tel:${callDigits}`}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-extrabold inline-flex items-center gap-2"
                              >
                                <Phone className="w-4 h-4" />
                                اتصال
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
                    يظهر هنا فقط السائق/السائقين المعيّنين للرحلة الحالية.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 space-y-2">
                {activeStep === 1 && (() => {
                  const notes = (request?.admin_notes || '') as string
                  const isDraft = notes.startsWith('[DRAFT]')
                  const isPending = request?.status === 'pending'
                  const depositPaid = Boolean(request?.deposit_paid)
                  
                  // التحقق من أن الطلب تم إرساله فعلياً (الإدمن يستطيع المتابعة حتى لو الدفع لاحقاً)
                  const canReceive = isPending && !isDraft
                  
                  // إذا لم يتم إرسال الطلب بعد
                  if (!canReceive) {
                    return (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-600" />
                          <p className="font-extrabold text-amber-900 text-sm">
                            بانتظار إرسال الطلب من المستخدم
                          </p>
                        </div>
                        <p className="text-sm text-amber-800">
                          المستخدم لم يرسل الطلب بعد.
                        </p>
                        <div className="bg-white border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-gray-700">
                            <strong>ملاحظة:</strong> بعد أن يرسل المستخدم الطلب، ستظهر أزرار المتابعة هنا.
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  // الطلب وصل للإدمن (pending و ليس draft): الإدمن يختار "تم استلام الرسوم" أو "سيدفع لاحقاً"
                  return (
                    <div className={`border-2 rounded-lg p-4 sm:p-5 space-y-4 ${depositPaid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="text-center">
                        <p className={`font-extrabold text-base sm:text-lg mb-2 ${depositPaid ? 'text-green-900' : 'text-amber-900'}`}>
                          {depositPaid ? '✓ تم تسجيل دفع الرسوم' : 'بانتظار قرار الدفع'}
                        </p>
                        <p className={`text-sm mb-4 ${depositPaid ? 'text-green-800' : 'text-amber-800'}`}>
                          اختر الإجراء المناسب: إمّا تأكيد استلام الرسوم أو المتابعة والدفع لاحقاً.
                        </p>
                      </div>

                      {/* عرض صور الدفعة (إن وُجدت) */}
                      {depositPaymentImageUrls.length > 0 && (
                        <DepositPaymentImages
                          imageUrls={depositPaymentImageUrls}
                          originalUrls={adminInfo?.paymentImages}
                        />
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            appendAdminResponseAndNotify(
                              '✅ تم استلام الرسوم وتحويل الطلب إلى مرحلة المراجعة الآن.\nالخطوة التالية: انتظار الموافقة.',
                              true,
                              true
                            )
                          }
                          disabled={saving}
                          className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-base sm:text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          {saving ? 'جاري الحفظ...' : '✓ تم استلام الرسوم'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            appendAdminResponseAndNotify(
                              '📌 تم استلام الطلب وتحويله إلى مرحلة المراجعة الآن.\nيمكنك دفع الرسوم لاحقاً عند التواصل معنا.\nالخطوة التالية: انتظار الموافقة.',
                              true,
                              false
                            )
                          }
                          disabled={saving}
                          className="w-full px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition text-base sm:text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          {saving ? 'جاري الحفظ...' : 'استلام الطلب (الدفع لاحقاً)'}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                        {userWaDigits && (
                          <a
                            href={`https://wa.me/${userWaDigits}?text=${encodeURIComponent(userWhatsAppMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
                          >
                            <MessageCircle className="w-4 h-4" />
                            واتساب المستخدم
                          </a>
                        )}
                        {userCallDigits && (
                          <a
                            href={`tel:${userCallDigits}`}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                          >
                            <Phone className="w-4 h-4" />
                            اتصال المستخدم
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {activeStep === 2 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 sm:p-5 space-y-4">
                    <div className="text-center">
                      <p className="font-extrabold text-blue-900 text-base sm:text-lg mb-2">
                        مرحلة الموافقة على الطلب
                      </p>
                      <p className="text-sm text-blue-800 mb-4">
                        قم بقبول الطلب أو رفضه. بعد الموافقة، سيتم فتح الحجز للمستخدم مباشرة.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={approve}
                        disabled={saving || request.status === 'approved'}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-base sm:text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {saving ? 'جاري الحفظ...' : '✓ قبول الطلب'}
                      </button>
                      <button
                        type="button"
                        onClick={reject}
                        disabled={saving || request.status === 'rejected'}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-base sm:text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      >
                        {saving ? 'جاري الحفظ...' : '✗ رفض الطلب'}
                      </button>
                    </div>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    <BookedTripDetails
                      bookedTrip={bookedTrip}
                      bookedStops={bookedStops}
                      selectedDropoffStop={selectedDropoffStop}
                      selectedPickupStop={selectedPickupStop}
                      arrivalDate={request?.arrival_date || null}
                      departureDate={request?.departure_date || null}
                      tripId={(request as any)?.trip_id || null}
                    />

                    <TripModificationsHistory modifications={tripModifications} />

                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-extrabold text-gray-900">حجز للمستخدم (من الإدارة)</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        يمكنك اختيار رحلة للمستخدم وتحديد نقطة النزول/التحميل. سيتم حفظها وتظهر للمستخدم في صفحته تلقائياً.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openBookingModal('arrival')}
                          disabled={saving || request.status === 'rejected'}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                        >
                          حجز رحلة القدوم
                        </button>
                        <button
                          type="button"
                          onClick={() => openBookingModal('departure')}
                          disabled={saving || request.status === 'rejected'}
                          className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
                        >
                          حجز رحلة المغادرة
                        </button>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setShowSchedule(true)}
                          disabled={saving || request.status === 'rejected'}
                          className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black transition text-sm font-semibold disabled:opacity-50"
                        >
                          تحديد/تعديل موعد مخصص (بدون رحلة)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => canGoPrev && setActiveStep((s) => Math.max(1, s - 1))}
                disabled={!canGoPrev}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold disabled:opacity-50"
              >
                السابق
              </button>
              <button
                type="button"
                onClick={() => canGoNext && setActiveStep((s) => Math.min(5, s + 1))}
                disabled={!canGoNext}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
              >
                التالي
              </button>
            </div>

            {/* Admin responses */}
            <AdminResponseSection
              latestResponse={latestResponse}
              responseHistory={responseHistory}
              newResponse={newResponse}
              saving={saving}
              onResponseChange={setNewResponse}
              onSave={saveResponse}
              onClear={() => setNewResponse('')}
            />

            <div className="text-[11px] text-gray-500">
              آخر تحديث: {formatDate(request.updated_at)} • تاريخ الإنشاء: {formatDate(request.created_at)}
            </div>
          </div>
        </div>
      </div>

      {showSchedule && (
        <TripSchedulingModal
          request={request as any}
          onClose={() => setShowSchedule(false)}
          onUpdate={load}
          isAdmin={true}
        />
      )}

      <AvailableTripsModal
        isOpen={showAvailableTrips}
        loading={loadingTrips}
        trips={availableTrips as any}
        visitType={(request as any)?.visit_type}
        bookingStep={bookingStep}
        calculatedDepartureDate={calculatedDepartureDate}
        expandedTripId={expandedTripId}
        tripStopsById={tripStopsById as any}
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
        onBookTrip={handleAdminBookTrip}
        isBookingDisabled={saving || request.status === 'rejected'}
      />
    </div>
  )
}


