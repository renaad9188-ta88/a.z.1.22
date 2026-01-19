'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Save, Clock, CheckCircle, Plane, MapPin } from 'lucide-react'
import { VisitRequest } from './types'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'
import toast from 'react-hot-toast'
import { notifyTripApproved, notifyTripRejected, notifyAdminTripRequest, createNotification } from '@/lib/notifications'
import DropoffPointSelector from '@/components/DropoffPointSelector'

interface TripSchedulingModalProps {
  request: VisitRequest | null
  onClose: () => void
  onUpdate: () => void
  isAdmin?: boolean // إذا كان true، يعني من لوحة الإدارة (يمكن الموافقة)، إذا false من لوحة المستخدم (يطلب الحجز)
}

// أيام القدوم المتاحة: الأحد، الثلاثاء، الخميس
const ARRIVAL_DAYS = [0, 2, 4] // 0 = الأحد، 2 = الثلاثاء، 4 = الخميس

// أيام المغادرة المتاحة: السبت، الاثنين، الأربعاء
const DEPARTURE_DAYS = [6, 1, 3] // 6 = السبت، 1 = الاثنين، 3 = الأربعاء

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// Helpers to avoid timezone shifts when dealing with date-only values (YYYY-MM-DD)
const toDateOnlyLocal = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const parseDateOnlyLocal = (s: string): Date => {
  const [yy, mm, dd] = (s || '').split('-').map((v) => Number(v))
  if (!yy || !mm || !dd) return new Date(s)
  return new Date(yy, mm - 1, dd)
}

export default function TripSchedulingModal({
  request,
  onClose,
  onUpdate,
  isAdmin = false,
}: TripSchedulingModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [selectedArrivalDate, setSelectedArrivalDate] = useState<string>('')
  const [availableArrivalDates, setAvailableArrivalDates] = useState<Date[]>([])
  const [availableDepartureDates, setAvailableDepartureDates] = useState<Date[]>([])
  const [dropoffPoint, setDropoffPoint] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null)
  const [showDropoffSelector, setShowDropoffSelector] = useState(false)
  const [arrivalTime, setArrivalTime] = useState<string>('10:00')
  const [departureTime, setDepartureTime] = useState<string>('10:00')

  useEffect(() => {
    if (request) {
      // إذا كان هناك تاريخ قدوم محفوظ، استخدمه
      if (request.arrival_date) {
        setSelectedArrivalDate(request.arrival_date)
        calculateDepartureDates(new Date(request.arrival_date))
      } else {
        // احسب تواريخ القدوم المتاحة (الأسابيع القادمة)
        calculateArrivalDates()
      }

      // تحميل نقطة النزول المخصصة إن وجدت
      if (request.id) {
        supabase
          .from('request_dropoff_points')
          .select('name, address, lat, lng')
          .eq('request_id', request.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (!error && data) {
              setDropoffPoint({
                name: data.name,
                address: data.address || '',
                lat: data.lat,
                lng: data.lng,
              })
            }
          })
      }

      // أوقات الرحلة (إن وجدت) أو افتراضي
      setArrivalTime((request as any)?.arrival_time || '10:00')
      setDepartureTime((request as any)?.departure_time || '10:00')
    }
  }, [request, supabase])

  const calculateArrivalDates = () => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // احسب التواريخ المتاحة للأسابيع الثلاثة القادمة
    for (let week = 0; week < 3; week++) {
      ARRIVAL_DAYS.forEach(dayIndex => {
        const date = new Date(today)
        const daysUntilDay = (dayIndex - date.getDay() + 7) % 7
        const targetDate = new Date(date)
        targetDate.setDate(date.getDate() + daysUntilDay + (week * 7))
        
        // تأكد من أن التاريخ في المستقبل
        if (targetDate >= today) {
          dates.push(targetDate)
        }
      })
    }

    // ترتيب التواريخ
    dates.sort((a, b) => a.getTime() - b.getTime())
    setAvailableArrivalDates(dates)
  }

  const calculateDepartureDates = (arrivalDate: Date) => {
    const dates: Date[] = []
    const departureDate = new Date(arrivalDate)
    departureDate.setMonth(departureDate.getMonth() + 1) // شهر من تاريخ القدوم

    // احسب تواريخ المغادرة المتاحة (أسبوع قبل وبعد التاريخ المحدد)
    const startDate = new Date(departureDate)
    startDate.setDate(startDate.getDate() - 7)

    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      if (DEPARTURE_DAYS.includes(date.getDay())) {
        dates.push(date)
      }
    }

    setAvailableDepartureDates(dates)
  }

  const handleArrivalDateChange = (date: string) => {
    setSelectedArrivalDate(date)
    if (date) {
      calculateDepartureDates(new Date(date))
    }
  }

  // التحقق من إمكانية التعديل (قبل الموعد بيوم واحد فقط)
  const canEditSchedule = (): { canEdit: boolean; reason: string } => {
    if (!request) {
      return { canEdit: false, reason: 'لا توجد بيانات للطلب' }
    }
    if (!request.arrival_date) {
      return { canEdit: true, reason: '' }
    }

    const arrivalDate = new Date(request.arrival_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    arrivalDate.setHours(0, 0, 0, 0)

    // حساب الفرق بالأيام
    const diffTime = arrivalDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return { 
        canEdit: false, 
        reason: 'لا يمكن تعديل الحجز بعد تاريخ القدوم أو في نفس اليوم' 
      }
    }

    if (diffDays > 1) {
      return { 
        canEdit: false, 
        reason: `يمكنك تعديل الحجز قبل الموعد بيوم واحد فقط. الموعد بعد ${diffDays} يوم` 
      }
    }

    return { canEdit: true, reason: '' }
  }

  const handleSave = async () => {
    if (!request || !selectedArrivalDate) {
      toast.error('يرجى اختيار تاريخ القدوم')
      return
    }

    // التحقق من إمكانية التعديل للمستخدم
    if (!isAdmin && request.arrival_date) {
      const editCheck = canEditSchedule()
      if (!editCheck.canEdit) {
        toast.error(editCheck.reason)
        return
      }
    }

    setLoading(true)
    try {
      const arrivalDate = new Date(selectedArrivalDate)
      const departureDate = new Date(arrivalDate)
      departureDate.setMonth(departureDate.getMonth() + 1)

      // اختر أقرب تاريخ مغادرة متاح
      let finalDepartureDate = departureDate
      const availableDeparture = availableDepartureDates.find(
        d => d >= departureDate
      )
      if (availableDeparture) {
        finalDepartureDate = availableDeparture
      } else if (availableDepartureDates.length > 0) {
        // إذا لم نجد تاريخ بعد القدوم، استخدم آخر تاريخ متاح
        finalDepartureDate = availableDepartureDates[availableDepartureDates.length - 1]
      }

      // إذا كان من لوحة الإدارة، موافقة مباشرة
      // إذا كان من لوحة المستخدم، ينتظر الموافقة
      const tripStatus = isAdmin ? 'pending_arrival' : 'scheduled_pending_approval'

      // اختر route_id: إذا كان الطلب فيه route_id نستخدمه، وإلا نأخذ أول route نشط كافتراضي
      let effectiveRouteId: string | null = (request as any)?.route_id || null
      if (!effectiveRouteId) {
        const { data: routeData } = await supabase
          .from('routes')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        effectiveRouteId = routeData?.id || null
      }

      // حفظ نقطة النزول إذا كانت محددة
      if (dropoffPoint && request.id) {
        try {
          const { error: dropoffError } = await supabase
            .from('request_dropoff_points')
            .upsert({
              request_id: request.id,
              route_id: effectiveRouteId,
              name: dropoffPoint.name,
              address: dropoffPoint.address,
              lat: dropoffPoint.lat,
              lng: dropoffPoint.lng,
            }, { onConflict: 'request_id' })

          if (dropoffError) {
            console.error('Error saving dropoff point:', dropoffError)
            // لا نوقف العملية إذا فشل حفظ نقطة النزول
          }
        } catch (dropoffErr) {
          console.error('Error in dropoff point save:', dropoffErr)
        }
      }

      // التأكد من أن القيم صحيحة
      const updateData: any = {
        arrival_date: toDateOnlyLocal(arrivalDate),
        departure_date: toDateOnlyLocal(finalDepartureDate),
        trip_status: tripStatus,
        route_id: effectiveRouteId,
        arrival_time: arrivalTime || null,
        departure_time: departureTime || null,
        updated_at: new Date().toISOString(),
      }

      // التأكد من أن trip_status ليس null
      if (!tripStatus || !['pending_arrival', 'scheduled_pending_approval', 'arrived', 'completed'].includes(tripStatus)) {
        throw new Error('قيمة حالة الرحلة غير صحيحة')
      }

      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) {
        console.error('Error updating trip schedule:', error)
        throw error
      }

      if (isAdmin) {
        toast.success('تم حجز موعد الرحلة بنجاح')
        // إشعار عند الموافقة المباشرة من الإدمن
        await notifyTripApproved(request.user_id, request.id, toDateOnlyLocal(arrivalDate))
      } else {
        // إرسال إشعار للمستخدم (تم إرسال طلب الحجز)
        try {
          const arrivalDateStr = toDateOnlyLocal(arrivalDate)
          
          let formattedDate = arrivalDateStr
          try {
            const { formatDate } = await import('@/lib/date-utils')
            formattedDate = formatDate(arrivalDateStr)
          } catch (formatError) {
            console.warn('Could not format date, using raw date:', formatError)
          }
          
          await createNotification({
            userId: request.user_id,
            title: 'تم إرسال طلب حجز الموعد',
            message: `تم إرسال طلب حجز موعد القدوم في ${formattedDate}. سيتم مراجعته من قبل الإدارة قريباً.`,
            type: 'info',
            relatedType: 'trip',
            relatedId: request.id,
          })
          
          console.log('✅ [TRIP SCHEDULING] User notification sent successfully')
        } catch (notifyError) {
          console.error('❌ [TRIP SCHEDULING] Error sending user notification:', notifyError)
        }

        // إشعار للمشرف المعيّن (إن وجد) عند طلب حجز موعد
        try {
          const assignedTo = (request as any)?.assigned_to as string | null | undefined
          if (assignedTo) {
            await createNotification({
              userId: assignedTo,
              title: 'طلب حجز موعد جديد',
              message: `المستخدم طلب حجز موعد للطلب ${request.visitor_name}. يرجى المراجعة.`,
              type: 'warning',
              relatedType: 'trip',
              relatedId: request.id,
            })
          }
        } catch (e) {
          console.warn('Could not notify assigned supervisor about booking request:', e)
        }

        // إرسال إشعار للإدمن عند طلب حجز موعد
        try {
          console.log('🔔 [TRIP SCHEDULING] User requested trip booking, preparing notification...')
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', request.user_id)
            .single()

          if (profileError) {
            console.warn('⚠️ [TRIP SCHEDULING] Could not fetch user profile:', profileError)
          }

          const arrivalDateStr = toDateOnlyLocal(arrivalDate)
          const userName = profile?.full_name || 'مستخدم'
          
          console.log('🔔 [TRIP SCHEDULING] Calling notifyAdminTripRequest with:', {
            requestId: request.id,
            visitorName: request.visitor_name,
            userName: userName,
            arrivalDate: arrivalDateStr
          })
          
          await notifyAdminTripRequest(
            request.id,
            request.visitor_name,
            userName,
            arrivalDateStr
          )
          
          console.log('✅ [TRIP SCHEDULING] Trip request notification sent successfully')
        } catch (notifyError) {
          console.error('❌ [TRIP SCHEDULING] Error sending trip request notification:', notifyError)
          // لا نوقف العملية إذا فشل الإشعار
        }

        toast.success('تم إرسال طلب حجز الموعد. سيتم مراجعته من قبل الإدارة')
      }
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الموعد')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!request) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({
          trip_status: 'pending_arrival',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) throw error

      // إرسال إشعار للمستخدم بالموافقة على الحجز
      try {
        if (request.arrival_date) {
          console.log('Sending trip approval notification to user...')
          await notifyTripApproved(
            request.user_id,
            request.id,
            request.arrival_date
          )
          console.log('Trip approval notification sent successfully')
        }
      } catch (notifyError) {
        console.error('Error sending trip approval notification:', notifyError)
        // لا نوقف العملية إذا فشل الإشعار
      }

      toast.success('تم الموافقة على حجز الموعد')
      onUpdate()
      onClose()
    } catch (error: any) {
      console.error('Error approving trip:', error)
      toast.error(error.message || 'حدث خطأ أثناء الموافقة')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!request) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({
          arrival_date: null,
          departure_date: null,
          trip_status: 'pending_arrival',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id)

      if (error) throw error

      // إنشاء إشعار للمستخدم
      await notifyTripRejected(request.user_id, request.id)

      toast.success('تم رفض حجز الموعد')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الرفض')
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isPendingApproval = request.trip_status === 'scheduled_pending_approval'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">حجز موعد الرحلة</h2>
              <p className="text-sm text-gray-600 mt-1">الزائر: {request.visitor_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* تنبيه الحجز المعلق */}
          {isPendingApproval && isAdmin && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-6 h-6 text-orange-600" />
                <h3 className="text-lg sm:text-xl font-bold text-orange-800">حجز بانتظار الموافقة</h3>
              </div>
              <p className="text-sm sm:text-base text-orange-700 mb-4">
                المستخدم طلب حجز موعد الرحلة. يرجى مراجعة التفاصيل أدناه بعناية قبل الموافقة أو الرفض.
              </p>
              
              {/* تفاصيل الحجز المطلوب */}
              {request.arrival_date && (
                <div className="bg-white rounded-lg p-4 border border-orange-300">
                  <h4 className="font-bold text-gray-800 mb-3 text-base">تفاصيل الحجز المطلوب:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-blue-600" />
                      <span className="text-gray-600">تاريخ القدوم:</span>
                      <span className="font-bold text-gray-800">{formatDate(request.arrival_date)}</span>
                      <span className="text-gray-500">({DAY_NAMES[parseDateOnlyLocal(request.arrival_date).getDay()]})</span>
                    </div>
                    {request.departure_date && (
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-green-600 rotate-180" />
                        <span className="text-gray-600">تاريخ المغادرة:</span>
                        <span className="font-bold text-gray-800">{formatDate(request.departure_date)}</span>
                        <span className="text-gray-500">({DAY_NAMES[parseDateOnlyLocal(request.departure_date).getDay()]})</span>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <span className="text-gray-600">مدة الإقامة:</span>
                      <span className="font-bold text-gray-800 mr-2">شهر واحد (30 يوم)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* معلومات الطلب */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3">معلومات الطلب</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">المدينة:</span>
                <span className="font-medium text-gray-800 mr-2">{request.city}</span>
              </div>
              <div>
                <span className="text-gray-600">نوع الزيارة:</span>
                <span className="font-medium text-gray-800 mr-2">
                  {request.visit_type === 'visit' ? 'زيارة' : request.visit_type === 'umrah' ? 'عمرة' : 'سياحة'}
                </span>
              </div>
            </div>
          </div>

          {/* تاريخ القدوم */}
          <div>
            <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              تاريخ القدوم (أحد، ثلاثاء، خميس)
            </label>
            {hasArrivalDate ? (
              <div className="space-y-3">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    تم حجز موعد القدوم: {formatDate(request.arrival_date!)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    يوم {DAY_NAMES[parseDateOnlyLocal(request.arrival_date!).getDay()]}
                  </p>
                </div>
                
                {/* رسالة التعديل للمستخدم */}
                {!isAdmin && (
                  <div className={`rounded-lg p-4 ${
                    canEditSchedule().canEdit 
                      ? 'bg-blue-50 border border-blue-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Clock className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        canEditSchedule().canEdit ? 'text-blue-600' : 'text-yellow-600'
                      }`} />
                      <div className="flex-1">
                        <p className={`text-sm font-medium mb-1 ${
                          canEditSchedule().canEdit ? 'text-blue-800' : 'text-yellow-800'
                        }`}>
                          {canEditSchedule().canEdit 
                            ? 'يمكنك تعديل الحجز الآن' 
                            : 'لا يمكن تعديل الحجز'}
                        </p>
                        <p className={`text-xs ${
                          canEditSchedule().canEdit ? 'text-blue-700' : 'text-yellow-700'
                        }`}>
                          {canEditSchedule().reason || 
                            'يمكنك تعديل موعد الحجز قبل الموعد بيوم واحد فقط. بعد ذلك لن تتمكن من التعديل.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* خيار التعديل للمستخدم */}
                {!isAdmin && canEditSchedule().canEdit && (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      تريد تعديل موعد الحجز؟
                    </p>
                    <select
                      value={selectedArrivalDate || request?.arrival_date || ''}
                      onChange={(e) => handleArrivalDateChange(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    >
                      {request?.arrival_date && (
                        <option value={request.arrival_date}>
                          {formatDate(request.arrival_date)} - {DAY_NAMES[parseDateOnlyLocal(request.arrival_date).getDay()]} (الحالي)
                        </option>
                      )}
                      {availableArrivalDates
                        .filter(date => {
                          const dateStr = toDateOnlyLocal(date)
                          return dateStr !== request.arrival_date
                        })
                        .map((date, index) => (
                          <option key={index} value={toDateOnlyLocal(date)}>
                            {formatDate(toDateOnlyLocal(date))} - {DAY_NAMES[date.getDay()]}
                          </option>
                        ))}
                    </select>
                    {selectedArrivalDate && selectedArrivalDate !== request.arrival_date && (
                      <p className="text-xs text-blue-600 mt-2">
                        سيتم تحديث تاريخ المغادرة تلقائياً بعد شهر من التاريخ الجديد
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={selectedArrivalDate}
                  onChange={(e) => handleArrivalDateChange(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                >
                  <option value="">اختر تاريخ القدوم</option>
                  {availableArrivalDates.map((date, index) => (
                    <option key={index} value={toDateOnlyLocal(date)}>
                      {formatDate(toDateOnlyLocal(date))} - {DAY_NAMES[date.getDay()]}
                    </option>
                  ))}
                </select>
                {selectedArrivalDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>تاريخ القدوم المختار:</strong> {formatDate(selectedArrivalDate)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      يوم {DAY_NAMES[parseDateOnlyLocal(selectedArrivalDate).getDay()]}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* وقت القدوم/المغادرة (للإدمن فقط) */}
          {isAdmin && selectedArrivalDate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">وقت القدوم</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-500">اختياري — يظهر على الصفحة الرئيسية وقائمة الرحلات.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-bold text-gray-800 mb-2">وقت المغادرة</label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
                <p className="mt-1 text-[11px] text-gray-500">اختياري — إذا تركته فارغاً لن يظهر وقت.</p>
              </div>
            </div>
          )}

          {/* تاريخ المغادرة */}
          {selectedArrivalDate && (
            <div>
              <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                تاريخ المغادرة المتوقع (شهر من القدوم)
              </label>
              {hasArrivalDate && request.departure_date ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    تاريخ المغادرة: {formatDate(request.departure_date)}
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    يوم {DAY_NAMES[parseDateOnlyLocal(request.departure_date).getDay()]}
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>ملاحظة:</strong> سيتم تحديد تاريخ المغادرة تلقائياً بعد شهر من تاريخ القدوم
                  </p>
                  {availableDepartureDates.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">التواريخ المتاحة للمغادرة (سبت، اثنين، أربعاء):</p>
                      <div className="flex flex-wrap gap-2">
                        {availableDepartureDates.slice(0, 5).map((date, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                          >
                            {formatDate(date.toISOString())}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* نقطة النزول */}
          {selectedArrivalDate && !isAdmin && (
            <div>
              <label className="block text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                نقطة النزول (اختياري)
              </label>
              {!showDropoffSelector && !dropoffPoint ? (
                <button
                  onClick={() => setShowDropoffSelector(true)}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-sm sm:text-base"
                >
                  + إضافة نقطة نزول مخصصة
                </button>
              ) : showDropoffSelector ? (
                <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
                  <DropoffPointSelector
                    requestId={request.id}
                    onSelect={(point) => {
                      setDropoffPoint(point)
                      setShowDropoffSelector(false)
                      toast.success('تم حفظ نقطة النزول')
                    }}
                  />
                  <button
                    onClick={() => {
                      setShowDropoffSelector(false)
                      if (!dropoffPoint) setDropoffPoint(null)
                    }}
                    className="mt-3 w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              ) : dropoffPoint ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">{dropoffPoint.name}</p>
                      {dropoffPoint.address && (
                        <p className="text-sm text-green-600 mt-1">{dropoffPoint.address}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setDropoffPoint(null)
                        setShowDropoffSelector(false)
                      }}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* معلومات إضافية */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-2">معلومات مهمة:</h4>
            <ul className="text-xs sm:text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>أيام القدوم المتاحة: الأحد، الثلاثاء، الخميس</li>
              <li>أيام المغادرة المتاحة: السبت، الاثنين، الأربعاء</li>
              <li>مدة الإقامة: شهر واحد من تاريخ القدوم</li>
              <li>سيتم إغلاق الطلب تلقائياً بعد انتهاء مدة الإقامة</li>
              {!isAdmin && (
                <li className="text-blue-700 font-medium mt-2">
                  <strong>قاعدة التعديل:</strong> يمكنك تعديل موعد الحجز قبل الموعد بيوم واحد فقط. بعد ذلك لن تتمكن من التعديل.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        {/* إذا كان الحجز بانتظار الموافقة وكان الإدمن، أظهر أزرار الموافقة/الرفض */}
        {isPendingApproval && isAdmin && hasArrivalDate ? (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>
                  سيتم تتبّع الرحلة بأمان ومعرفة الموقع ووقت الوصول، مع إمكانية التواصل مع السائق لحظة بلحظة.
                </span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm sm:text-base font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <X className="w-4 h-4" />
                  رفض الحجز
                </>
              )}
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  الموافقة على الحجز
                </>
              )}
            </button>
            </div>
          </div>
        ) : !hasArrivalDate || (hasArrivalDate && !isAdmin && canEditSchedule().canEdit && selectedArrivalDate && selectedArrivalDate !== request.arrival_date) ? (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>
                  سيتم تتبّع الرحلة بأمان ومعرفة الموقع ووقت الوصول، مع إمكانية التواصل مع السائق لحظة بلحظة.
                </span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm sm:text-base font-medium"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedArrivalDate || (hasArrivalDate && selectedArrivalDate === request.arrival_date)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {hasArrivalDate ? 'حفظ التعديلات' : (isAdmin ? 'حفظ الموعد' : 'طلب حجز الموعد')}
                </>
              )}
            </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

