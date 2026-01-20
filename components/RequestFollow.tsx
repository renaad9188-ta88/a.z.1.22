'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ArrowRight, MapPin, Navigation, Bus, Calendar } from 'lucide-react'
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
        .select('id,trip_date,meeting_time,departure_time,start_location_name,end_location_name,route_id')
        .eq('is_active', true)
        .gte('trip_date', today)
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })
        .limit(50)
      
      if (error) throw error
      setAvailableTrips(data || [])
    } catch (e: any) {
      console.error('Error loading available trips:', e)
      toast.error('تعذر تحميل الرحلات المتاحة')
      setAvailableTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }

  const handleBookTrip = async (tripId: string) => {
    if (!request) return
    
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ trip_id: tripId, updated_at: new Date().toISOString() })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.success('تم حجز الرحلة بنجاح')
      setShowAvailableTrips(false)
      load()
      
      // إشعار للمستخدم
      try {
        const { createNotification } = await import('@/lib/notifications')
        await createNotification({
          userId: request.user_id,
          title: 'تم حجز الرحلة',
          message: 'تم حجز رحلتك بنجاح. يمكنك متابعة تفاصيل الرحلة من هنا.',
          type: 'success',
          relatedType: 'trip',
          relatedId: request.id,
        })
      } catch (notifyError) {
        console.error('Error sending notification:', notifyError)
      }
      
      // إشعار للإدمن
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
    } catch (e: any) {
      console.error('Error booking trip:', e)
      toast.error(e.message || 'حدث خطأ أثناء حجز الرحلة')
    }
  }

  const handleChangeBooking = () => {
    setShowAvailableTrips(true)
    loadAvailableTrips()
  }

  const steps = useMemo(() => {
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isApproved = request?.status === 'approved' || request?.status === 'completed'
    const hasDecision = request?.status === 'approved' || request?.status === 'rejected' || request?.status === 'completed'
    const postApprovalSubmitted = notes.includes(POST_APPROVAL_SUBMITTED_MARK)
    const paymentVerified = Boolean(request?.payment_verified)
    const hasArrival = Boolean(request?.arrival_date)

    return [
      {
        id: 1,
        title: 'دفع رسوم الطلب',
        done: Boolean(request) && !isDraft,
        help: isDraft
          ? 'يرجى دفع رسوم الطلب لإرسال الطلب للإدارة.'
          : 'تم دفع الرسوم وإرسال الطلب للإدارة بنجاح.',
      },
      {
        id: 2,
        title: 'موافقة الإدارة',
        done: Boolean(hasDecision),
        help:
          request?.status === 'rejected'
            ? 'تم رفض الطلب. يمكنك مراجعة سبب الرفض من التفاصيل.'
            : isApproved
            ? 'تمت الموافقة على الطلب.'
            : 'بانتظار موافقة الإدارة على الطلب.',
      },
      {
        id: 3,
        title: 'استكمال بعد الموافقة',
        done: Boolean(postApprovalSubmitted) || paymentVerified,
        help: 'اختر الكفالة وطريقة الدفع ثم احفظ وأرسل الاستكمال.',
      },
      {
        id: 4,
        title: 'تأكيد الدفع',
        done: paymentVerified,
        help: 'بانتظار تأكيد الإدارة للدفع لفتح الحجز.',
      },
      {
        id: 5,
        title: 'حجز موعد القدوم',
        done: hasArrival,
        help: 'حدد موعد القدوم بعد فتح الحجز.',
      },
    ]
  }, [request])

  useEffect(() => {
    const firstIncomplete = steps.find((s) => !s.done)?.id || 5
    setActiveStep(firstIncomplete)
  }, [steps])

  const current = steps.find((s) => s.id === activeStep)
  const canGoNext = activeStep < 5 && Boolean(steps.find((s) => s.id === activeStep)?.done)

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
  const postApprovalHref = `/dashboard/request/${request.id}#post-approval`
  const isDraft = ((request.admin_notes || '') as string).startsWith('[DRAFT]')
  const feesPaymentHref =
    (request.visit_type || '') === 'visit' ? `/services/jordan-visit/payment/${request.id}` : `/dashboard/request/${request.id}`
  const trackingHref = `/dashboard/request/${request.id}/track`

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
                    بانتظار موافقة الإدارة. سيتم إشعارك عند القبول.
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={postApprovalHref}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold text-center"
                    >
                      استكمال الإجراءات
                    </Link>
                    <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                      المتبقي: <span className="font-bold text-blue-700">{remaining} دينار</span>
                    </div>
                  </div>
                )}

                {activeStep === 4 && (
                  <div className="text-sm text-gray-700">
                    تم إرسال الاستكمال. بانتظار تأكيد الدفع من الإدارة لفتح الحجز.
                  </div>
                )}

                {activeStep === 5 && (
                  <div className="space-y-3">
                    {/* عرض الرحلة المحجوزة */}
                    {request.trip_id && bookedTrip ? (
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
                          <button
                            onClick={handleChangeBooking}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold whitespace-nowrap"
                          >
                            تغيير الحجز
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 mb-3">
                          لم يتم حجز رحلة بعد. يمكنك حجز رحلة من الرحلات المتاحة أو تحديد موعد قدوم مخصص.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAvailableTrips(true)
                              loadAvailableTrips()
                            }}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                          >
                            <Bus className="w-4 h-4" />
                            عرض الرحلات المتاحة
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowSchedule(true)}
                            disabled={!Boolean(request.payment_verified)}
                            className={`px-4 py-2.5 rounded-lg transition text-sm font-semibold inline-flex items-center justify-center gap-2 ${
                              Boolean(request.payment_verified)
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            title={!Boolean(request.payment_verified) ? 'بانتظار فتح الحجز من الإدارة' : 'حجز موعد مخصص'}
                          >
                            <Calendar className="w-4 h-4" />
                            حجز موعد مخصص
                          </button>
                        </div>
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
                        </div>
                        <button
                          onClick={() => handleBookTrip(trip.id)}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
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


