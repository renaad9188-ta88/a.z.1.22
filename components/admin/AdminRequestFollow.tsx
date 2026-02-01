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

  const load = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,status,admin_notes,rejection_reason,payment_verified,remaining_amount,arrival_date,departure_date,trip_status,trip_id,assigned_to,selected_dropoff_stop_id,selected_pickup_stop_id,deposit_paid,created_at,updated_at'
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
            setSelectedDropoffStop(null)
            setSelectedPickupStop(null)
          }
        } catch {
          setBookedTrip(null)
          setBookedStops(null)
        }
      } else {
        setBookedTrip(null)
        setBookedStops(null)
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
    // الخطوة 1 تتفعل عندما يدفع المستخدم (!isDraft) وبعد أن يضغط الإدمن "تم استلام الطلب" (status !== 'pending')
    const isReceived = Boolean(request) && !isDraft && request?.status !== 'pending'
    const hasBooking = Boolean((request as any)?.trip_id)
    const hasRemainingPaymentImage = notes.includes('صورة الدفع المتبقي:')

    return [
      { 
        id: 1, 
        title: 'استلام الطلب', 
        done: isReceived, 
        help: isDraft 
          ? 'المستخدم قام برفع الجواز لكن لم يدفع الرسوم بعد. بانتظار دفع الرسوم لإرسال الطلب للإدارة.'
          : 'المستخدم قام برفع الجواز ودفع الرسوم. اضغط "تم استلام الطلب" لإرسال رد تلقائي للمستخدم وتسجيل الاستلام.' 
      },
      { 
        id: 2, 
        title: 'الموافقة على الطلب', 
        done: isApproved || request?.status === 'rejected', 
        help: 'قم بقبول الطلب أو رفضه. بعد الموافقة، سيتم تفعيل دفع المبلغ المتبقي للمستخدم.' 
      },
      { 
        id: 3, 
        title: 'تأكيد دفع المبلغ المتبقي (فتح الحجز)', 
        done: paymentVerified, 
        help: 'بعد أن يرفع المستخدم صورة الدفع المتبقي (25 دينار)، قم بتأكيد الدفع لفتح الحجز له.' 
      },
      { 
        id: 4, 
        title: 'الحجز/المتابعة', 
        done: hasBooking || hasArrival, 
        help: 'ستظهر هنا الرحلة التي حجزها المستخدم + يمكنك متابعة الموعد.' 
      },
    ]
  }, [request])

  useEffect(() => {
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    
    // إذا كان الطلب draft (لم يدفع)، الخطوة 1 نشطة
    if (isDraft) {
      setActiveStep(1)
      return
    }
    
    // بعد الدفع، نحدد الخطوة النشطة بناءً على الخطوات المكتملة
    const firstIncomplete = steps.find((s) => !s.done)?.id || 4
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
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() } as any)
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
      const { error } = await supabase
        .from('visit_requests')
        .update({ status: 'rejected', rejection_reason: reason || null, updated_at: new Date().toISOString() } as any)
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

  const appendAdminResponseAndNotify = async (msg: string, alsoMarkReceived?: boolean) => {
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
  const contactRaw = String(userProfile?.whatsapp_phone || adminInfo?.syrianPhone || userProfile?.phone || adminInfo?.jordanPhone || '')
  const waDigits = contactRaw.replace(/[^\d]/g, '')
  const callDigits = String(userProfile?.phone || adminInfo?.syrianPhone || adminInfo?.jordanPhone || '').replace(/[^\d+]/g, '')

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

              {/* Actions */}
              <div className="mt-4 space-y-2">
                {activeStep === 1 && (() => {
                  const notes = (request?.admin_notes || '') as string
                  const isDraft = notes.startsWith('[DRAFT]')
                  const isPending = request?.status === 'pending'
                  const depositPaid = Boolean(request?.deposit_paid)
                  
                  // التحقق من أن الطلب تم إرساله فعلياً وتم دفع الرسوم
                  // يجب أن يكون: status === 'pending' وليس draft و deposit_paid === true
                  const canReceive = isPending && !isDraft && depositPaid
                  
                  // إذا لم يتم إرسال الطلب بعد أو لم يتم دفع الرسوم
                  if (!canReceive) {
                    return (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-amber-600" />
                          <p className="font-extrabold text-amber-900 text-sm">
                            {isDraft
                              ? 'المستخدم رفع الجواز - بانتظار دفع الرسوم وإرسال الطلب'
                              : !depositPaid
                              ? 'المستخدم رفع الجواز - بانتظار دفع الرسوم'
                              : 'بانتظار إرسال الطلب من المستخدم'
                            }
                          </p>
                        </div>
                        <p className="text-sm text-amber-800">
                          {isDraft
                            ? 'المستخدم قام برفع الجواز لكن لم يدفع الرسوم ولم يرسل الطلب بعد. سيتم تفعيل زر "استلام الطلب" بعد دفع الرسوم وإرسال الطلب.'
                            : !depositPaid
                            ? 'المستخدم قام برفع الجواز لكن لم يدفع الرسوم بعد. سيتم تفعيل زر "استلام الطلب" بعد دفع الرسوم وإرسال الطلب.'
                            : 'المستخدم لم يرسل الطلب بعد. سيتم تفعيل زر "استلام الطلب" بعد إرسال الطلب.'
                          }
                        </p>
                        <div className="bg-white border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-gray-700">
                            <strong>ملاحظة:</strong> لا يمكنك استلام الطلب أو الموافقة عليه قبل أن يدفع المستخدم الرسوم ويرسل الطلب.
                          </p>
                        </div>
                      </div>
                    )
                  }
                  
                  // إذا تم إرسال الطلب ودفع الرسوم (status === 'pending' و !isDraft و deposit_paid === true) - يظهر زر استلام الطلب
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-900 text-sm">المستخدم أرسل الطلب - جاهز للاستلام</p>
                          <p className="text-xs text-gray-600 mt-1">اضغط &quot;تم استلام الطلب&quot; لإرسال رد تلقائي للمستخدم وتسجيل الاستلام.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-semibold inline-flex items-center gap-2"
                              title="واتساب"
                            >
                              <MessageCircle className="w-4 h-4" />
                              واتساب
                            </a>
                          )}
                          {callDigits && (
                            <a
                              href={`tel:${callDigits}`}
                              className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition text-xs font-semibold inline-flex items-center gap-2"
                              title="اتصال"
                            >
                              <Phone className="w-4 h-4" />
                              اتصال
                            </a>
                          )}
                        </div>
                      </div>

                      {/* عرض صور الدفعة الأولية */}
                      <DepositPaymentImages
                        imageUrls={depositPaymentImageUrls}
                        originalUrls={adminInfo?.paymentImages}
                      />

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => appendAdminResponseAndNotify('تم استلام طلبك وسيتم التواصل معك قريباً.', true)}
                          disabled={saving}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          تم استلام الطلب
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminResponseAndNotify('يرجى تزويدنا بصورة جواز أوضح/صالحة لإكمال الطلب.')}
                          disabled={saving}
                          className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          طلب صورة أوضح للجواز
                        </button>
                        <button
                          type="button"
                          onClick={() => appendAdminResponseAndNotify('يرجى مراجعة بيانات الطلب وإكمال النواقص ثم إعادة الإرسال.')}
                          disabled={saving}
                          className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-black transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          طلب إكمال النواقص
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {activeStep === 2 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={approve}
                      disabled={saving || request.status === 'approved'}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      قبول الطلب
                    </button>
                    <button
                      type="button"
                      onClick={reject}
                      disabled={saving || request.status === 'rejected'}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
                    >
                      رفض الطلب
                    </button>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      <p className="font-extrabold text-gray-900 text-sm">تأكيد دفع المبلغ المتبقي</p>
                    </div>
                    
                    {/* عرض صورة الدفع المتبقي */}
                    <RemainingPaymentImage
                      imageUrl={remainingPaymentImageUrl}
                      loading={(() => {
                        const notes = (request?.admin_notes || '') as string
                        const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
                        return Boolean(match?.[1]?.trim() && !remainingPaymentImageUrl)
                      })()}
                      remaining={remaining}
                      paymentVerified={request.payment_verified}
                      saving={saving}
                      onVerify={() => setPaymentVerified(true)}
                      onUnverify={() => setPaymentVerified(false)}
                    />
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-3">
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

                    <BookingActions
                      request={request}
                      userProfile={userProfile}
                      saving={saving}
                      isBookingConfirmed={(() => {
                        const notes = (request?.admin_notes || '') as string
                        return notes.includes('تم تأكيد الحجز')
                      })()}
                      onEditSchedule={() => setShowSchedule(true)}
                      onConfirmBooking={async () => {
                        if (!request) return
                        try {
                          setSaving(true)
                          const stamp = new Date().toISOString()
                          const section = `\n\n=== رد الإدارة ===\nتم تأكيد الحجز\nتاريخ الرد: ${stamp}`
                          const updatedNotes = ((request.admin_notes || '') as string) + section
                          
                          const { error } = await supabase
                            .from('visit_requests')
                            .update({ 
                              admin_notes: updatedNotes,
                              trip_status: 'pending_arrival',
                              updated_at: new Date().toISOString() 
                            } as any)
                            .eq('id', request.id)
                          
                          if (error) throw error
                          await notifyCustomMessage(request.user_id, request.id, 'تم تأكيد الحجز')
                          toast.success('تم تأكيد الحجز')
                          await load()
                        } catch (e: any) {
                          console.error('confirm booking error:', e)
                          toast.error(e?.message || 'تعذر تأكيد الحجز')
                        } finally {
                          setSaving(false)
                        }
                      }}
                    />
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
    </div>
  )
}


