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

            {/* Stepper (scrollable on mobile to avoid broken text) */}
            <div className="mt-4">
              <div className="flex items-start gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
                {steps.map((s, idx) => {
                  const isActive = s.id === activeStep
                  const isDone = s.done
                  const isClickable = s.id <= activeStep
                  return (
                    <div key={s.id} className="flex-1 min-w-[92px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
                      <button
                        type="button"
                        onClick={() => isClickable && setActiveStep(s.id)}
                        className={`w-full flex flex-col items-center gap-1 ${
                          isClickable ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        disabled={!isClickable}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                            isDone
                              ? 'bg-green-600 border-green-600 text-white'
                              : isActive
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-gray-300 text-gray-500'
                          }`}
                        >
                          {isDone ? <CheckCircle className="w-5 h-5" /> : <span className="font-bold">{s.id}</span>}
                        </div>
                        <div
                          className={`text-[11px] sm:text-xs font-bold text-center leading-snug ${
                            isActive ? 'text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {s.title}
                        </div>
                      </button>
                      {idx < steps.length - 1 && (
                        <div className="hidden sm:block h-0.5 bg-gray-200 -mt-5 mx-6"></div>
                      )}
                    </div>
                  )
                })}
              </div>
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
                      {depositPaymentImageUrls.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                            <p className="font-bold text-blue-900 text-sm">صور الدفعة الأولية ({depositPaymentImageUrls.length})</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {depositPaymentImageUrls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={url}
                                  alt={`صورة الدفعة ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition"
                                  onError={(e) => {
                                    console.error('Error loading payment image:', e)
                                    // في حالة فشل تحميل الصورة، حاول استخدام الرابط الأصلي
                                    const originalUrl = adminInfo?.paymentImages?.[index]
                                    if (originalUrl && originalUrl !== url) {
                                      (e.target as HTMLImageElement).src = originalUrl
                                    }
                                  }}
                                />
                              </a>
                            ))}
                          </div>
                          <p className="text-xs text-blue-800">
                            يرجى التحقق من صحة الدفعة قبل الضغط على &quot;تم استلام الطلب&quot;
                          </p>
                        </div>
                      )}

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
                    
                    {/* عرض صورة الدفع المتبقي إن وجدت */}
                    {(() => {
                      const notes = (request?.admin_notes || '') as string
                      const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
                      const hasPaymentImage = match?.[1]?.trim()
                      
                      if (hasPaymentImage && remainingPaymentImageUrl) {
                        return (
                          <div className="space-y-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-blue-800 mb-2 font-semibold">صورة الدفع المتبقي المرفوعة:</p>
                              <a
                                href={remainingPaymentImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={remainingPaymentImageUrl}
                                  alt="صورة الدفع المتبقي"
                                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                                  onError={(e) => {
                                    console.error('Error loading payment image:', e)
                                    // في حالة فشل تحميل الصورة، حاول استخدام الرابط الأصلي
                                    const rawUrl = match?.[1]?.trim()
                                    if (rawUrl && rawUrl !== remainingPaymentImageUrl) {
                                      (e.target as HTMLImageElement).src = rawUrl
                                    }
                                  }}
                                />
                              </a>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <p className="text-xs text-gray-700 mb-2">
                                المبلغ المتبقي: <span className="font-bold text-blue-700">25 دينار</span>
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                يشمل: الحجز + الموافقة + الإجراءات + توقيع الكفالة + تصوير الكفالة + رفعها على الموقع
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={() => setPaymentVerified(true)}
                                disabled={saving || Boolean(request.payment_verified)}
                                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                              >
                                تأكيد الدفع (فتح الحجز)
                              </button>
                              <button
                                type="button"
                                onClick={() => setPaymentVerified(false)}
                                disabled={saving || !Boolean(request.payment_verified)}
                                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold disabled:opacity-50"
                              >
                                إلغاء تأكيد الدفع
                              </button>
                            </div>
                          </div>
                        )
                      } else if (hasPaymentImage && !remainingPaymentImageUrl) {
                        // جاري تحميل signed URL
                        return (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 mb-2 font-semibold">صورة الدفع المتبقي المرفوعة:</p>
                            <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
                              <p className="text-gray-500 text-sm">جاري تحميل الصورة...</p>
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs text-amber-800">
                              بانتظار رفع المستخدم لصورة الدفع المتبقي (25 دينار). بعد الرفع، سيتم إشعارك.
                            </p>
                          </div>
                        )
                      }
                    })()}
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="space-y-3">
                    {/* Booked trip details (user-selected trip) */}
                    {(request as any)?.trip_id ? (
                      bookedTrip ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-extrabold text-green-900 flex items-center gap-2">
                                <Bus className="w-4 h-4" />
                                رحلة محجوزة
                              </p>
                              <p className="text-sm text-gray-900 font-bold mt-1 truncate">
                                {bookedTrip.start_location_name} → {bookedTrip.end_location_name}
                              </p>
                            </div>
                            {bookedTrip.trip_type && (
                              <span className="text-[11px] font-extrabold px-2 py-1 rounded-full border border-green-300 text-green-800 bg-white">
                                {String(bookedTrip.trip_type).includes('depart') ? 'مغادرون' : 'قادمون'}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                            <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                              <span className="text-gray-600 inline-flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-green-700" />
                                التاريخ
                              </span>
                              <span className="font-extrabold text-gray-900">{formatDate(bookedTrip.trip_date)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                              <span className="text-gray-600 inline-flex items-center gap-1">
                                <Clock className="w-4 h-4 text-green-700" />
                                التجمع
                              </span>
                              <span className="font-extrabold text-gray-900">{bookedTrip.meeting_time || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2 bg-white/70 border border-green-200 rounded-lg px-3 py-2">
                              <span className="text-gray-600 inline-flex items-center gap-1">
                                <Clock className="w-4 h-4 text-green-700" />
                                الانطلاق
                              </span>
                              <span className="font-extrabold text-gray-900">{bookedTrip.departure_time || '—'}</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <p className="text-xs font-extrabold text-gray-800 mb-2 inline-flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-blue-600" />
                              نقاط التوقف
                            </p>
                            {bookedStops && bookedStops.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {bookedStops.slice(0, 7).map((s, idx) => (
                                  <span
                                    key={s.id}
                                    className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 bg-white text-blue-900"
                                    title={s.name}
                                  >
                                    {idx + 1}. {s.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600">لا توجد نقاط توقف مسجلة لهذه الرحلة.</p>
                            )}
                          </div>

                          {/* عرض نقطة النزول/التحميل المختارة */}
                          {(selectedDropoffStop || selectedPickupStop) && (
                            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              {bookedTrip?.trip_type === 'arrival' && selectedDropoffStop && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-extrabold text-blue-900">نقطة النزول المختارة:</p>
                                    <p className="text-sm font-bold text-blue-800">{selectedDropoffStop.name}</p>
                                  </div>
                                </div>
                              )}
                              {bookedTrip?.trip_type === 'departure' && selectedPickupStop && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-extrabold text-blue-900">نقطة التحميل المختارة:</p>
                                    <p className="text-sm font-bold text-blue-800">{selectedPickupStop.name}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                          <p className="font-extrabold text-amber-900">تم تسجيل حجز على الطلب، لكن تعذر تحميل تفاصيل الرحلة.</p>
                          <p className="text-xs text-amber-800 mt-1">تحقق من صلاحيات RLS لجدول route_trips/route_trip_stop_points.</p>
                        </div>
                      )
                    ) : null}
                    
                    {/* عرض رحلة القدوم إذا كانت موجودة */}
                    {request?.arrival_date && bookedTrip?.trip_type === 'departure' && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-extrabold text-blue-900 flex items-center gap-2">
                              <Bus className="w-4 h-4" />
                              رحلة القدوم المحجوزة
                            </p>
                            <p className="text-xs text-blue-800 mt-1">
                              تاريخ القدوم: <span className="font-bold">{formatDate(request.arrival_date)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* عرض موعد المغادرة إذا كان موجوداً */}
                    {request?.departure_date && (
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-extrabold text-purple-900 flex items-center gap-2">
                              <Navigation className="w-4 h-4 rotate-180" />
                              موعد المغادرة
                            </p>
                            <p className="text-xs text-purple-800 mt-1">
                              تاريخ المغادرة: <span className="font-bold">{formatDate(request.departure_date)}</span>
                            </p>
                            {bookedTrip?.trip_type === 'departure' && bookedTrip.departure_time && (
                              <p className="text-xs text-purple-800 mt-1">
                                وقت الانطلاق: <span className="font-bold">{bookedTrip.departure_time}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!request?.trip_id && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4">
                        <p className="font-extrabold text-gray-800">لا يوجد حجز رحلة حتى الآن.</p>
                        <p className="text-xs text-gray-600 mt-1">سيظهر هنا تلقائياً عندما يحجز المستخدم رحلة.</p>
                      </div>
                    )}

                    {/* عرض سجل التعديلات */}
                    {tripModifications.length > 0 && (
                      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 sm:p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-700 flex-shrink-0" />
                          <p className="font-extrabold text-yellow-900 text-xs sm:text-sm">سجل تعديلات الحجز</p>
                        </div>
                        <div className="space-y-2">
                          {tripModifications.map((mod, idx) => (
                            <div key={idx} className="bg-white border border-yellow-200 rounded-lg p-2.5 sm:p-3">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                                <p className="text-xs font-bold text-yellow-800">تعديل #{tripModifications.length - idx}</p>
                                {mod.dateText && (
                                  <p className="text-xs text-gray-600 break-words">{mod.dateText}</p>
                                )}
                              </div>
                              {mod.tripInfo && (
                                <p className="text-xs sm:text-sm text-gray-800 mb-1 break-words">
                                  <span className="font-semibold">الرحلة:</span> {mod.tripInfo}
                                </p>
                              )}
                              {mod.stopInfo && (
                                <p className="text-xs sm:text-sm text-gray-800 break-words">
                                  <span className="font-semibold">النقطة المختارة:</span> {mod.stopInfo}
                                </p>
                              )}
                              {mod.oldTripId && mod.newTripId && (
                                <p className="text-xs text-gray-600 mt-1 break-words">
                                  تم التغيير من الرحلة {mod.oldTripId} إلى {mod.newTripId}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      {(() => {
                        const notes = (request?.admin_notes || '') as string
                        const isBookingConfirmed = notes.includes('تم تأكيد الحجز')
                        
                        // بعد تأكيد الحجز: إظهار زر تعديل الحجز + زر التواصل
                        if (isBookingConfirmed) {
                          const contactRaw = String(userProfile?.whatsapp_phone || userProfile?.phone || '')
                          const waDigits = contactRaw.replace(/[^\d]/g, '')
                          const callDigits = String(userProfile?.phone || userProfile?.jordan_phone || '').replace(/[^\d+]/g, '')
                          
                          return (
                            <div className="flex flex-col sm:flex-row gap-2">
                              {(request as any)?.trip_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // فتح modal تعديل الحجز
                                    setShowSchedule(true)
                                  }}
                                  className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                                >
                                  <Calendar className="w-4 h-4" />
                                  تعديل الحجز
                                </button>
                              )}
                              {waDigits && (
                                <a
                                  href={`https://wa.me/${waDigits}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  واتساب
                                </a>
                              )}
                              {callDigits && (
                                <a
                                  href={`tel:${callDigits}`}
                                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                                >
                                  <Phone className="w-4 h-4" />
                                  اتصال
                                </a>
                              )}
                              {!waDigits && !callDigits && (
                                <div className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
                                  لا يوجد رقم هاتف متاح
                                </div>
                              )}
                            </div>
                          )
                        }
                        
                        // قبل تأكيد الحجز: عرض الأزرار العادية
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowSchedule(true)}
                              disabled={saving || request.status !== 'approved'}
                              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              {request.arrival_date ? 'تعديل موعد القدوم' : 'تحديد موعد القدوم'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!request) return
                                try {
                                  setSaving(true)
                                  const stamp = new Date().toISOString()
                                  const section = `\n\n=== رد الإدارة ===\nتم تأكيد الحجز\nتاريخ الرد: ${stamp}`
                                  const updatedNotes = ((request.admin_notes || '') as string) + section
                                  
                                  // تحديث admin_notes و trip_status
                                  const { error } = await supabase
                                    .from('visit_requests')
                                    .update({ 
                                      admin_notes: updatedNotes,
                                      trip_status: 'pending_arrival', // تغيير الحالة من scheduled_pending_approval إلى pending_arrival
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
                              disabled={saving}
                              className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                              title="يرسل للمستخدم رسالة تأكيد الحجز"
                            >
                              تأكيد الحجز
                            </button>
                            {request.arrival_date && (
                              <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                                الموعد: <span className="font-bold">{formatDate(request.arrival_date)}</span>
                              </div>
                            )}
                          </>
                        )
                      })()}
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
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="font-extrabold text-gray-900 mb-2">ردود الإدارة (تصل للمستخدم)</p>
              {latestResponse ? (
                <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">آخر رد</p>
                  <p className="text-sm text-gray-800 font-semibold whitespace-pre-wrap">{latestResponse.body}</p>
                  {latestResponse.dateText && (
                    <p className="mt-1 text-[11px] text-gray-500">تاريخ: {latestResponse.dateText}</p>
                  )}
                </div>
              ) : (
                <div className="mb-3 text-sm text-gray-600">لا يوجد رد حتى الآن.</div>
              )}

              <textarea
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="اكتب رد الإدارة هنا..."
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveResponse}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  إرسال الرد
                </button>
                <button
                  type="button"
                  onClick={() => setNewResponse('')}
                  className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
                >
                  مسح
                </button>
              </div>

              {responseHistory.length > 1 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">سجل الردود</p>
                  <div className="space-y-2">
                    {responseHistory.slice(0, 5).map((r, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">
                          {r.dateText ? `تاريخ: ${r.dateText}` : 'بدون تاريخ'}
                        </p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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


