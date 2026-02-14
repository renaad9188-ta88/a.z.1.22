import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { formatDate, formatDateTime } from '@/lib/date-utils'
import type { ReqRow, TripLite } from '../types'

export function useTripBooking(
  request: ReqRow | null,
  availableTrips: TripLite[],
  tripStopsById: Record<string, any[]>,
  selectedStopByTrip: Record<string, string>,
  bookingStep: 'arrival' | 'departure',
  calculatedDepartureDate: string | null,
  onReload: () => void,
  setSelectedArrivalTripId: (id: string | null) => void,
  setCalculatedDepartureDate: (date: string | null) => void,
  setBookingStep: (step: 'arrival' | 'departure') => void,
  setShowAvailableTrips: (show: boolean) => void,
  setSelectedStopByTrip: (stops: Record<string, string>) => void,
  loadAvailableTrips: (type?: 'arrival' | 'departure') => Promise<void>,
  loadBookedTrip: (tripId: string) => Promise<void>,
  setDepartureTrip: (trip: TripLite | null) => void
) {
  const supabase = createSupabaseBrowserClient()

  const handleBookTrip = async (tripId: string) => {
    if (!request) return
    
    try {
      const notesGuard = (request.admin_notes || '') as string
      if (notesGuard.includes('تم تأكيد الحجز')) {
        toast.error('لا يمكن تعديل الحجز بعد تأكيده من الإدارة.')
        return
      }

      const trip = availableTrips.find((t) => t.id === tripId)
      if (!trip) {
        toast.error('الرحلة غير موجودة')
        return
      }
      
      // Validation: التحقق من أن تاريخ الرحلة ليس في الماضي
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
          // User booking should be reviewed/confirmed by admin
          trip_status: 'scheduled_pending_approval',
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
          // User booking should be reviewed/confirmed by admin
          trip_status: 'scheduled_pending_approval',
          updated_at: new Date().toISOString(),
        }
        
        const { error } = await supabase
          .from('visit_requests')
          .update(updateData)
          .eq('id', request.id)
        
        if (error) throw error
        
        // تحميل رحلة المغادرة
        await loadBookedTrip(tripId)
        setDepartureTrip(availableTrips.find((t) => t.id === tripId) || null)
        
        toast.success('تم حجز رحلة المغادرة بنجاح')
        setShowAvailableTrips(false)
        setBookingStep('arrival')
        setSelectedStopByTrip({})
        onReload()
        return
      }
      
      // الكود الأصلي للأنواع الأخرى
      const updateData: any = {
        trip_id: tripId,
        // User booking should be reviewed/confirmed by admin
        trip_status: 'scheduled_pending_approval',
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
      }
      
      toast.success(hadPreviousBooking ? 'تم تعديل الحجز بنجاح' : 'تم حجز الرحلة بنجاح')
      setShowAvailableTrips(false)
      setSelectedStopByTrip({})
      onReload()
      
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

  return {
    handleBookTrip,
    handleChangeBooking,
  }
}

