'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, ArrowRight, MapPin } from 'lucide-react'
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

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select(
          'id,user_id,visitor_name,visit_type,status,arrival_date,payment_verified,remaining_amount,trip_status,admin_notes,created_at,updated_at'
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSchedule(true)}
                      disabled={!Boolean(request.payment_verified)}
                      className={`px-4 py-2.5 rounded-lg transition text-sm font-semibold ${
                        Boolean(request.payment_verified)
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      title={!Boolean(request.payment_verified) ? 'بانتظار فتح الحجز من الإدارة' : 'حجز موعد القدوم'}
                    >
                      {request.arrival_date ? 'تعديل موعد القدوم' : 'حجز موعد القدوم'}
                    </button>
                    <Link
                      href={trackingHref}
                      className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
                      title="تتبّع على الخريطة"
                    >
                      <MapPin className="w-4 h-4 text-blue-600" />
                      تتبّع على الخريطة
                    </Link>
                    {request.arrival_date && (
                      <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
                        الموعد الحالي: <span className="font-bold text-gray-900">{formatDate(request.arrival_date)}</span>
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
    </div>
  )
}


