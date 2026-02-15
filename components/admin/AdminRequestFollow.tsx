'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, Save, MessageCircle, Phone, Bus, Calendar, MapPin, DollarSign, Navigation } from 'lucide-react'
import TripSchedulingModal from '@/components/admin/TripSchedulingModal'
import { parseAdminNotes } from '@/components/request-details/utils'
import { formatDate } from '@/lib/date-utils'
import AvailableTripsModal from '@/components/request-follow/AvailableTripsModal'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { notifyCustomMessage } from '@/lib/notifications'
import AdminRequestFollowStepper from './AdminRequestFollowStepper'
import AdminResponseSection from './AdminResponseSection'
import DepositPaymentImages from './DepositPaymentImages'
import RemainingPaymentImage from './RemainingPaymentImage'
import StepActions from './StepActions'
import BookedTripDetails from './BookedTripDetails'
import TripModificationsHistory from './TripModificationsHistory'
import type { Role } from './request-follow/types'
import { extractLatestAdminResponse, extractAllAdminResponses, extractTripModifications, POST_APPROVAL_SUBMITTED_MARK } from './request-follow/utils'
import { useRequestData } from './request-follow/hooks/useRequestData'
import { useTripData } from './request-follow/hooks/useTripData'
import { useRequestActions } from './request-follow/hooks/useRequestActions'
import { useAvailableTrips } from './request-follow/hooks/useAvailableTrips'

export default function AdminRequestFollow({
  requestId,
  adminUserId,
  role,
}: {
  requestId: string
  adminUserId: string
  role: Role
}) {
  const [activeStep, setActiveStep] = useState(1)
  const [showSchedule, setShowSchedule] = useState(false)
  const [confirmingBooking, setConfirmingBooking] = useState(false)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  // Request Data Hook (includes payment images)
  const {
    request,
    setRequest,
    loading,
    userProfile,
    remainingPaymentImageUrl,
    depositPaymentImageUrls,
    reload,
  } = useRequestData(requestId, adminUserId, role)
  
  const adminInfo = useMemo(() => parseAdminNotes((request?.admin_notes || '') as string) || {}, [request])

  // Trip Data Hook
  const {
    bookedTrip,
    bookedStops,
    selectedDropoffStop,
    selectedPickupStop,
    assignedDrivers,
    loadTripData,
  } = useTripData()

  // Request Actions Hook
  const {
    saving,
    newResponse,
    setNewResponse,
    approve,
    reject,
    setPaymentVerified,
    saveResponse,
    appendAdminResponseAndNotify,
  } = useRequestActions(request, reload)

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
    bookingStep,
    calculatedDepartureDate,
    toggleTripStops,
    openBookingModal,
    handleAdminBookTrip,
  } = useAvailableTrips(request, role)

  // Load trip data when request changes
  useEffect(() => {
    if (request) {
      loadTripData((request as any)?.trip_id, request)
    }
  }, [
    request?.trip_id,
    request?.selected_dropoff_stop_id,
    request?.selected_pickup_stop_id,
    loadTripData,
    request,
  ])

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

  const isBookingConfirmed = useMemo(() => {
    const notes = (request?.admin_notes || '') as string
    return notes.includes('تم تأكيد الحجز')
  }, [request])

  const confirmBooking = async () => {
    if (!request) return
    try {
      setConfirmingBooking(true)
      const stamp = new Date().toISOString()
      const currentNotes = ((request.admin_notes || '') as string) || ''
      const roleLabel = role === 'supervisor' ? 'المشرف' : 'الإدارة'
      const nextNotes = currentNotes.includes('تم تأكيد الحجز')
        ? currentNotes
        : currentNotes + `\n\n=== تأكيد الحجز ===\nتم تأكيد الحجز من ${roleLabel}\nتاريخ التأكيد: ${stamp}`

      const updateData: any = {
        admin_notes: nextNotes,
        updated_at: stamp,
      }
      // If booking was waiting approval, move it to active
      if (request.trip_status === 'scheduled_pending_approval') {
        updateData.trip_status = 'pending_arrival'
      }

      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)
      if (error) throw error

      // Notify user
      try {
        await notifyCustomMessage(
          request.user_id,
          request.id,
          `✅ تم تأكيد الحجز من ${roleLabel}. يمكنك الآن متابعة تفاصيل الحجز والتتبع من صفحة متابعة الطلب.`
        )
      } catch (e) {
        console.error('Error notifying user confirm booking:', e)
      }

      toast.success('تم تأكيد الحجز')
      await reload()
    } catch (e: any) {
      console.error('confirmBooking error:', e)
      toast.error(e?.message || 'تعذر تأكيد الحجز')
    } finally {
      setConfirmingBooking(false)
    }
  }

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

  const current = steps.find((s) => s.id === activeStep)
  const canGoNext = activeStep < 4 && Boolean(current?.done)
  const canGoPrev = activeStep > 1


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

                    {Boolean((request as any)?.trip_id) && !isBookingConfirmed && (
                      <div className={`border-2 rounded-lg p-4 sm:p-5 ${
                        request.trip_status === 'scheduled_pending_approval'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <p className={`font-extrabold text-sm sm:text-base ${
                          request.trip_status === 'scheduled_pending_approval' ? 'text-orange-900' : 'text-green-900'
                        }`}>
                          {request.trip_status === 'scheduled_pending_approval'
                            ? 'حجز بانتظار الموافقة'
                            : 'تم تسجيل الحجز'}
                        </p>
                        <p className={`text-xs sm:text-sm mt-1 ${
                          request.trip_status === 'scheduled_pending_approval' ? 'text-orange-800' : 'text-green-800'
                        }`}>
                          اضغط &quot;تأكيد الحجز&quot; لإرسال تأكيد للمستخدم وتثبيت الحجز.
                        </p>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={confirmBooking}
                            disabled={saving || confirmingBooking}
                            className="w-full sm:w-auto px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
                          >
                            {saving || confirmingBooking ? 'جاري الحفظ...' : 'تأكيد الحجز'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-extrabold text-gray-900">حجز للمستخدم (من {role === 'supervisor' ? 'المشرف' : 'الإدارة'})</p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        يمكنك اختيار رحلة للمستخدم وتحديد نقطة النزول/التحميل. سيتم حفظها وتظهر للمستخدم في صفحته تلقائياً.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openBookingModal('arrival')}
                          disabled={saving || request.status === 'rejected' || isBookingConfirmed}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50"
                        >
                          {(request as any)?.trip_id ? 'تعديل رحلة القدوم' : 'حجز رحلة القدوم'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openBookingModal('departure')}
                          disabled={saving || request.status === 'rejected' || isBookingConfirmed}
                          className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
                        >
                          {(request as any)?.trip_id ? 'تعديل رحلة المغادرة' : 'حجز رحلة المغادرة'}
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
          onUpdate={reload}
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
        onBookTrip={(tripId) => handleAdminBookTrip(tripId, reload)}
        isBookingDisabled={saving || request.status === 'rejected'}
      />
    </div>
  )
}


