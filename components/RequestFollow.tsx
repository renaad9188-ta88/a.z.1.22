'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ArrowRight, MapPin, Navigation, Bus, Calendar, Upload, X, DollarSign } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { formatDate } from '@/lib/date-utils'

type ReqRow = {
  id: string
  user_id: string
  visitor_name: string
  visit_type?: string | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  arrival_date: string | null
  payment_verified: boolean | null
  remaining_amount: number | null
  trip_status: string | null
  admin_notes: string | null
  trip_id: string | null
  created_at: string
  updated_at: string
}

const POST_APPROVAL_SUBMITTED_MARK = 'حالة الاستكمال: مرسل'

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

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,visit_type,status,arrival_date,payment_verified,remaining_amount,trip_status,admin_notes,trip_id,created_at,updated_at'
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

  const loadAvailableTrips = async () => {
    try {
      setLoadingTrips(true)
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('route_trips')
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id,trip_type')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
      
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
      const { data, error } = await supabase
        .from('route_trip_stop_points')
        .select('id,name,order_index,lat,lng')
        .eq('trip_id', tripId)
        .order('order_index', { ascending: true })
      if (error) throw error
      setTripStopsById((p) => ({ ...p, [tripId]: data || [] }))
    } catch (e: any) {
      console.error('Error loading stop points:', e)
      setTripStopsById((p) => ({ ...p, [tripId]: [] }))
    }
  }

  const handleBookTrip = async (tripId: string) => {
    if (!request) return
    
    try {
      const trip = availableTrips.find((t) => t.id === tripId)
      const tripType = trip?.trip_type || 'arrival'
      const selectedStopId = selectedStopByTrip[tripId] || null
      
      const updateData: any = {
        trip_id: tripId,
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
        const modificationNote = `\n\n=== تعديل الحجز ===\nتم تعديل الحجز من قبل المستخدم\nالرحلة السابقة: ${previousTripId}\nالرحلة الجديدة: ${tripId}\n${tripInfo}${stopInfo ? `\nنقطة ${tripType === 'arrival' ? 'النزول' : 'التحميل'}: ${stopInfo}` : ''}\nتاريخ التعديل: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`
        updatedNotes = currentNotes + modificationNote
        updateData.admin_notes = updatedNotes
      }
      
      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)
      
      if (error) throw error
      
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
    setShowAvailableTrips(true)
    loadAvailableTrips()
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
      const updatedNotes = currentNotes + `\nصورة الدفع المتبقي: ${imageUrl}\nتم رفع صورة الدفع المتبقي بتاريخ: ${new Date().toLocaleDateString('ar-SA')}`

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
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isApproved = request?.status === 'approved' || request?.status === 'completed'
    const paymentVerified = Boolean(request?.payment_verified)
    const hasArrival = Boolean(request?.arrival_date)
    const hasRemainingPaymentImage = notes.includes('صورة الدفع المتبقي:')

    return [
      {
        id: 1,
        title: 'تم استلام و رفع الطلب',
        done: Boolean(request) && !isDraft,
        help: isDraft
          ? 'يرجى دفع رسوم الطلب لإرسال الطلب للإدارة.'
          : 'تم دفع الرسوم وإرسال الطلب للإدارة بنجاح.',
      },
      {
        id: 2,
        title: 'بانتظار الموافقة',
        done: isApproved,
        help: '',
      },
      {
        id: 3,
        title: 'دفع المبلغ المتبقي و حجز الرحلة',
        done: hasArrival || Boolean(request?.trip_id),
        help: 'بعد الموافقة: ادفع المبلغ المتبقي (25 دينار) وارفع صورة الدفع، ثم احجز الرحلة.',
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

  const remaining = request.remaining_amount ?? 20
  const isDraft = ((request.admin_notes || '') as string).startsWith('[DRAFT]')
  const feesPaymentHref =
    (request.visit_type || '') === 'visit' ? `/services/jordan-visit/payment/${request.id}` : `/dashboard/request/${request.id}`
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
              <div className="flex items-center justify-between gap-2">
                {steps.map((s, idx) => {
                  const isActive = s.id === activeStep
                  const isDone = s.done
                  const isClickable = s.id <= activeStep
                  return (
                    <div key={s.id} className="flex-1 min-w-0">
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
                        <div className={`text-[11px] sm:text-xs font-bold text-center truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
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

              {/* Actions per step */}
              <div className="mt-4 space-y-2">
                {activeStep === 1 && (
                  <>
                    {isDraft ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={feesPaymentHref}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold text-center"
                        >
                          دفع رسوم الطلب
                        </Link>
                        <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                          بعد الدفع سيتم إرسال طلبك للإدارة مباشرة.
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700">
                        تم إرسال الطلب للإدارة. يمكنك الآن متابعة مرحلة موافقة الإدارة.
                      </div>
                    )}
                  </>
                )}
                {activeStep === 2 && (
                  <div className="text-sm text-gray-700">
                    بانتظار الموافقة على الطلب تحتاج ل عمل من 7 ايام ل 14 يوم. بعد الموافقة تفتح لك حجز الرحلة ل تتبع الرحلة.
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="space-y-4">
                    {/* دفع المبلغ المتبقي */}
                    {request.status === 'approved' && !request.payment_verified && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <h4 className="font-bold text-blue-800">دفع المبلغ المتبقي</h4>
                        </div>
                        <div className="bg-white rounded-lg p-3 mb-3">
                          <p className="text-sm font-semibold text-gray-800 mb-2">
                            المبلغ المتبقي: <span className="text-blue-700 text-lg">25 دينار</span>
                          </p>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            يشمل: الحجز + الموافقة + الإجراءات + توقيع الكفالة + تصوير الكفالة + رفعها على الموقع
                          </p>
                        </div>

                        {/* رفع صورة الدفع */}
                        {!remainingPaymentPreview ? (
                          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleRemainingPaymentUpload}
                              className="hidden"
                              id="remaining-payment-upload"
                            />
                            <label
                              htmlFor="remaining-payment-upload"
                              className="cursor-pointer flex flex-col items-center"
                            >
                              <Upload className="w-8 h-8 text-blue-400 mb-2" />
                              <span className="text-sm text-gray-700 mb-1">اضغط لرفع صورة الدفع</span>
                              <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت</span>
                            </label>
                          </div>
                        ) : (
                          <div className="relative">
                            <img
                              src={remainingPaymentPreview}
                              alt="صورة الدفع المتبقي"
                              className="w-full h-48 object-cover rounded-lg border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={removeRemainingPaymentImage}
                              className="absolute top-2 left-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={uploadRemainingPayment}
                              disabled={uploadingRemainingPayment}
                              className="mt-3 w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                            >
                              {uploadingRemainingPayment ? 'جاري الرفع...' : 'رفع صورة الدفع'}
                            </button>
                          </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs text-amber-800">
                            بعد رفع صورة الدفع، سيتم مراجعتها من الإدارة. بعد التأكيد سيتم فتح الحجز.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* حجز الرحلة - متاح فقط بعد payment_verified */}
                    {request.payment_verified ? (
                      <>
                        {request.trip_id && bookedTrip ? (
                          <div className="space-y-4">
                            {/* التحقق من تأكيد الحجز من الإدمن */}
                            {(() => {
                              const notes = (request.admin_notes || '') as string
                              const isBookingConfirmed = notes.includes('تم تأكيد الحجز')
                              
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
                              
                              return null
                            })()}
                            
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Bus className="w-5 h-5 text-green-600" />
                                    <h4 className="font-bold text-green-800">رحلة محجوزة</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-blue-600" />
                                      <span className="text-gray-700">التاريخ:</span>
                                      <span className="font-bold text-gray-900">{formatDate(bookedTrip.trip_date)}</span>
                                    </div>
                                    {bookedTrip.meeting_time && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        <span className="text-gray-700">وقت التجمع:</span>
                                        <span className="font-bold text-gray-900">{bookedTrip.meeting_time}</span>
                                      </div>
                                    )}
                                    {bookedTrip.departure_time && (
                                      <div className="flex items-center gap-2">
                                        <Navigation className="w-4 h-4 text-blue-600" />
                                        <span className="text-gray-700">وقت الانطلاق:</span>
                                        <span className="font-bold text-gray-900">{bookedTrip.departure_time}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4 text-orange-600" />
                                      <span className="text-gray-700">المسار:</span>
                                      <span className="font-bold text-gray-900">
                                        {bookedTrip.start_location_name} → {bookedTrip.end_location_name}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {(() => {
                                  const notes = (request.admin_notes || '') as string
                                  const isBookingConfirmed = notes.includes('تم تأكيد الحجز')
                                  
                                  // بعد تأكيد الحجز: إظهار زر تعديل الحجز
                                  if (isBookingConfirmed) {
                                    return (
                                      <button
                                        onClick={handleChangeBooking}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold whitespace-nowrap"
                                      >
                                        تعديل الحجز
                                      </button>
                                    )
                                  }
                                  
                                  // قبل تأكيد الحجز: إظهار زر تغيير الحجز
                                  return (
                                    <button
                                      onClick={handleChangeBooking}
                                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold whitespace-nowrap"
                                    >
                                      تغيير الحجز
                                    </button>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
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
                                        setShowAvailableTrips(true)
                                        loadAvailableTrips()
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
                          بانتظار تأكيد الدفع من الإدارة لفتح الحجز.
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
      {showAvailableTrips && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">الرحلات المتاحة</h2>
                  <p className="text-sm text-gray-600 mt-1">اختر رحلة من القائمة</p>
                </div>
              </div>
              <button
                onClick={() => setShowAvailableTrips(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {loadingTrips ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">جاري تحميل الرحلات...</p>
                </div>
              ) : availableTrips.length === 0 ? (
                <div className="text-center py-8">
                  <Bus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">لا توجد رحلات متاحة حالياً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableTrips.map((trip) => (
                    <div key={trip.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-gray-900">
                              {trip.start_location_name} → {trip.end_location_name}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span>{formatDate(trip.trip_date)}</span>
                            </div>
                            {trip.meeting_time && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>وقت التجمع: {trip.meeting_time}</span>
                              </div>
                            )}
                            {trip.departure_time && (
                              <div className="flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-blue-600" />
                                <span>وقت الانطلاق: {trip.departure_time}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => toggleTripStops(trip.id)}
                              className="w-full sm:w-auto text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-800 underline px-2 py-1 rounded hover:bg-blue-50 transition"
                            >
                              {expandedTripId === trip.id 
                                ? `إخفاء ${trip.trip_type === 'arrival' ? 'نقاط النزول' : 'نقاط التحميل'}`
                                : `عرض ${trip.trip_type === 'arrival' ? 'نقاط النزول' : 'نقاط التحميل'}`}
                            </button>

                            {expandedTripId === trip.id && (
                              <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                                {loadingStopsId === trip.id ? (
                                  <p className="text-xs text-gray-600">جاري تحميل محطات التوقف...</p>
                                ) : (tripStopsById[trip.id] || []).length === 0 ? (
                                  <p className="text-xs text-gray-600">
                                    لا توجد {trip.trip_type === 'arrival' ? 'نقاط نزول' : 'نقاط تحميل'} لهذه الرحلة.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">
                                      {trip.trip_type === 'arrival' 
                                        ? 'اختر نقطة النزول (اختياري):' 
                                        : 'اختر نقطة التحميل (اختياري):'}
                                    </p>
                                    {(tripStopsById[trip.id] || []).map((s: any, idx: number) => {
                                      const isSelected = selectedStopByTrip[trip.id] === s.id
                                      return (
                                        <button
                                          key={s.id}
                                          type="button"
                                          onClick={() => {
                                            setSelectedStopByTrip((p) => ({
                                              ...p,
                                              [trip.id]: isSelected ? '' : s.id,
                                            }))
                                          }}
                                          className={`w-full flex items-center gap-2 text-xs sm:text-sm p-2 rounded-lg transition ${
                                            isSelected
                                              ? 'bg-blue-100 border-2 border-blue-500 text-blue-900'
                                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                          }`}
                                        >
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                            isSelected
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-gray-300 text-gray-700'
                                          }`}>
                                            {idx + 1}
                                          </span>
                                          <div className="flex-1 text-right">
                                            <span className="font-bold text-gray-900 block">{s.name}</span>
                                            {trip.trip_type === 'arrival' && (
                                              <span className="text-[10px] text-gray-500">نقطة نزول</span>
                                            )}
                                            {trip.trip_type === 'departure' && (
                                              <span className="text-[10px] text-gray-500">نقطة تحميل</span>
                                            )}
                                          </div>
                                          {isSelected && (
                                            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleBookTrip(trip.id)}
                          disabled={(() => {
                            const notes = (request?.admin_notes || '') as string
                            return notes.includes('تم تأكيد الحجز')
                          })()}
                          className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg transition text-sm font-semibold whitespace-nowrap ${
                            (() => {
                              const notes = (request?.admin_notes || '') as string
                              return notes.includes('تم تأكيد الحجز')
                            })()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          حجز هذه الرحلة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


