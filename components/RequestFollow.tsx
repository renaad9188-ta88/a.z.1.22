'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, ArrowRight, MapPin, Navigation, Bus, Calendar, Upload, X, DollarSign, MessageCircle, Phone } from 'lucide-react'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { formatDate } from '@/lib/date-utils'
import RequestFollowStepper from './request-follow/RequestFollowStepper'
import RemainingPaymentSection from './request-follow/RemainingPaymentSection'
import BookedTripCard from './request-follow/BookedTripCard'
import AvailableTripsModal from './request-follow/AvailableTripsModal'
import HelpContactButtons from '@/components/HelpContactButtons'
import { useRequestData } from './request-follow/hooks/useRequestData'
import { useTripData } from './request-follow/hooks/useTripData'
import { useAvailableTrips } from './request-follow/hooks/useAvailableTrips'
import { useTripBooking } from './request-follow/hooks/useTripBooking'
import { usePaymentUpload } from './request-follow/hooks/usePaymentUpload'
import { extractAllAdminResponses, extractUserBookingChanges, extractAdminBookings, extractAdminCreated } from './request-follow/utils'
import type { ActionLogItem } from './request-follow/types'

export default function RequestFollow({ requestId, userId }: { requestId: string; userId: string }) {
  const [activeStep, setActiveStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [bookingStep, setBookingStep] = useState<'arrival' | 'departure'>('arrival')
  const [calculatedDepartureDate, setCalculatedDepartureDate] = useState<string | null>(null)

  // Request Data Hook
  const {
    request,
    loading,
    reload,
  } = useRequestData(requestId, userId)

  // Trip Data Hook
  const {
    bookedTrip,
    selectedDropoffStop,
    selectedPickupStop,
    loadBookedTrip,
  } = useTripData(request)

  // Available Trips Hook
  const {
    showAvailableTrips,
    setShowAvailableTrips,
    availableTrips,
    loadingTrips,
    tripStopsById,
    loadingStopsId,
    expandedTripId,
    selectedStopByTrip,
    setSelectedStopByTrip,
    selectedArrivalTripId,
    setSelectedArrivalTripId,
    departureTrip,
    setDepartureTrip,
    toggleTripStops,
    loadAvailableTrips,
  } = useAvailableTrips(request, bookingStep, calculatedDepartureDate, reload)

  // Trip Booking Hook
  const {
    handleBookTrip,
    handleChangeBooking,
  } = useTripBooking(
    request,
    availableTrips,
    tripStopsById,
    selectedStopByTrip,
    bookingStep,
    calculatedDepartureDate,
    reload,
    setSelectedArrivalTripId,
    setCalculatedDepartureDate,
    setBookingStep,
    setShowAvailableTrips,
    setSelectedStopByTrip,
    loadAvailableTrips,
    loadBookedTrip,
    setDepartureTrip
  )

  // Payment Upload Hook
  const {
    remainingPaymentImage,
    remainingPaymentPreview,
    uploadingRemainingPayment,
    uploadedRemainingPaymentUrl,
    handleRemainingPaymentUpload,
    removeRemainingPaymentImage,
    uploadRemainingPayment,
  } = usePaymentUpload(request, reload)

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
          ? 'تم تسجيل دفع/إرسال الرسوم. بانتظار استلام الطلب من الإدارة.'
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

                        if (request.status === 'under_review') {
                          // under_review = الإدارة استلمت الطلب وبدأت المراجعة
                          if (request.deposit_paid) {
                            return '📌 تم استلام طلبك من الإدارة وهو قيد المراجعة. (تم تسجيل الرسوم). بانتظار الموافقة. بعد الموافقة سيفتح الحجز مباشرة.'
                          }
                          return '📌 تم استلام طلبك من الإدارة وهو قيد المراجعة. الدفع لاحقاً عند التواصل معنا. بانتظار الموافقة.'
                        }

                        // deposit_paid هنا يعني أن المستخدم دفع/أرسل الرسوم (وليس أن الإدارة استلمتها)
                        if (request.deposit_paid) {
                          return '💰 تم تسجيل دفع/إرسال الرسوم. بانتظار استلام الطلب من الإدارة. بعد الاستلام سيتم تحويله إلى قيد المراجعة.'
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
                            isPendingApproval={request.trip_status === 'scheduled_pending_approval'}
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
          onUpdate={reload}
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
        onToggleStops={(tripId) => {
          const trip = availableTrips.find((t) => t.id === tripId)
          const tripType: 'arrival' | 'departure' = (trip?.trip_type as any) || bookingStep
          toggleTripStops(tripId, tripType)
        }}
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


