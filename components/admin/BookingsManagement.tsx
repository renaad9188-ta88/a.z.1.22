'use client'

import { useEffect, useState, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Users, Phone, MessageCircle, Copy, Clock, MapPin, Bus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Plane } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

type TripBooking = {
  trip_id: string
  trip_date: string
  trip_type: 'arrival' | 'departure'
  meeting_time: string | null
  departure_time: string | null
  start_location_name: string
  end_location_name: string
  passengers: Array<{
    request_id: string
    visitor_name: string
    companions_count: number | null
    phone: string | null
    whatsapp_phone: string | null
    jordan_phone: string | null
    user_id: string
  }>
  drivers: Array<{
    id: string
    name: string
    phone: string
  }>
}

export default function BookingsManagement() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [arrivalTrips, setArrivalTrips] = useState<TripBooking[]>([])
  const [departureTrips, setDepartureTrips] = useState<TripBooking[]>([])
  const [expectedDepartures, setExpectedDepartures] = useState<Array<{
    request_id: string
    visitor_name: string
    companions_count: number | null
    arrival_date: string
    expected_departure_date: string
    actual_departure_date: string | null
    has_departure_trip: boolean
    phone: string | null
    whatsapp_phone: string | null
    jordan_phone: string | null
    user_id: string
  }>>([])
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'expected'>('arrivals')

  // Define loadExpectedDepartures first since loadBookings calls it
  const loadExpectedDepartures = async () => {
    try {
      // جلب جميع الطلبات المقبولة التي لها arrival_date
      const { data: requestsData, error: requestsErr } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          companions_count,
          arrival_date,
          departure_date,
          days_count,
          user_id,
          trip_id
        `)
        .eq('status', 'approved')
        .not('arrival_date', 'is', null)
        .order('arrival_date', { ascending: false })

      if (requestsErr) throw requestsErr

      // جلب ملفات المستخدمين
      const userIds = Array.from(new Set((requestsData || []).map((r: any) => r.user_id).filter(Boolean)))
      let profilesMap: Record<string, { phone: string | null; whatsapp_phone: string | null; jordan_phone: string | null }> = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('user_id, phone, whatsapp_phone, jordan_phone')
          .in('user_id', userIds)

        if (!profilesErr && profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.user_id] = {
              phone: p.phone || null,
              whatsapp_phone: p.whatsapp_phone || null,
              jordan_phone: p.jordan_phone || null,
            }
          })
        }
      }

      // جلب جميع رحلات المغادرة المحجوزة
      const { data: departureTripsData, error: departureTripsErr } = await supabase
        .from('route_trips')
        .select('id, trip_type')
        .eq('trip_type', 'departure')
        .eq('is_active', true)

      const departureTripIds = new Set((departureTripsData || []).map((t: any) => t.id))

      // حساب المغادرين المتوقعين
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const expected: typeof expectedDepartures = []

      ;(requestsData || []).forEach((req: any) => {
        if (!req.arrival_date) return

        const arrivalDate = new Date(req.arrival_date)
        arrivalDate.setHours(0, 0, 0, 0)

        // حساب تاريخ المغادرة المتوقع (شهر من القدوم أو arrival_date + days_count)
        const expectedDeparture = new Date(arrivalDate)
        if (req.days_count && req.days_count > 0) {
          expectedDeparture.setDate(expectedDeparture.getDate() + req.days_count)
        } else {
          expectedDeparture.setMonth(expectedDeparture.getMonth() + 1) // شهر افتراضي
        }

        // فقط إذا كان تاريخ المغادرة المتوقع في المستقبل أو اليوم
        if (expectedDeparture.getTime() >= today.getTime()) {
          const profile = profilesMap[req.user_id] || {}
          const hasDepartureTrip = req.trip_id && departureTripIds.has(req.trip_id)

          expected.push({
            request_id: req.id,
            visitor_name: req.visitor_name,
            companions_count: req.companions_count || 0,
            arrival_date: req.arrival_date,
            expected_departure_date: expectedDeparture.toISOString().split('T')[0],
            actual_departure_date: req.departure_date || null,
            has_departure_trip: hasDepartureTrip,
            phone: profile.phone || null,
            whatsapp_phone: profile.whatsapp_phone || null,
            jordan_phone: profile.jordan_phone || null,
            user_id: req.user_id,
          })
        }
      })

      // ترتيب حسب تاريخ المغادرة المتوقع
      expected.sort((a, b) => a.expected_departure_date.localeCompare(b.expected_departure_date))

      setExpectedDepartures(expected)
    } catch (e: any) {
      console.error('Load expected departures error:', e)
      // لا نعرض خطأ هنا، فقط نسجل
    }
  }

  const loadBookings = async () => {
    try {
      setLoading(true)

      // جلب جميع الرحلات النشطة مع trip_id
      const { data: tripsData, error: tripsErr } = await supabase
        .from('route_trips')
        .select('id, trip_date, trip_type, meeting_time, departure_time, start_location_name, end_location_name')
        .eq('is_active', true)
        .gte('trip_date', new Date().toISOString().split('T')[0]) // فقط المستقبلية
        .order('trip_date', { ascending: true })
        .order('departure_time', { ascending: true })

      if (tripsErr) throw tripsErr

      if (!tripsData || tripsData.length === 0) {
        setArrivalTrips([])
        setDepartureTrips([])
        return
      }

      const tripIds = tripsData.map((t) => t.id)

      // جلب جميع الحجوزات المرتبطة بهذه الرحلات
      const { data: bookingsData, error: bookingsErr } = await supabase
        .from('visit_requests')
        .select(`
          id,
          trip_id,
          visitor_name,
          companions_count,
          user_id
        `)
        .in('trip_id', tripIds)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true })

      // جلب ملفات المستخدمين بشكل منفصل
      const userIds = Array.from(new Set((bookingsData || []).map((b: any) => b.user_id).filter(Boolean)))
      let profilesMap: Record<string, { phone: string | null; whatsapp_phone: string | null; jordan_phone: string | null }> = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('user_id, phone, whatsapp_phone, jordan_phone')
          .in('user_id', userIds)

        if (!profilesErr && profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap[p.user_id] = {
              phone: p.phone || null,
              whatsapp_phone: p.whatsapp_phone || null,
              jordan_phone: p.jordan_phone || null,
            }
          })
        }
      }

      if (bookingsErr) throw bookingsErr

      // جلب السائقين المعيّنين لكل رحلة
      const { data: driversData, error: driversErr } = await supabase
        .from('route_trip_drivers')
        .select(`
          trip_id,
          drivers!inner(id, name, phone)
        `)
        .in('trip_id', tripIds)
        .eq('is_active', true)

      if (driversErr) throw driversErr

      // تجميع البيانات
      const bookingsByTrip: Record<string, TripBooking> = {}

      tripsData.forEach((trip: any) => {
        bookingsByTrip[trip.id] = {
          trip_id: trip.id,
          trip_date: trip.trip_date,
          trip_type: (trip.trip_type || 'arrival') as 'arrival' | 'departure',
          meeting_time: trip.meeting_time,
          departure_time: trip.departure_time,
          start_location_name: trip.start_location_name,
          end_location_name: trip.end_location_name,
          passengers: [],
          drivers: [],
        }
      })

      // إضافة الحجوزات
      ;(bookingsData || []).forEach((booking: any) => {
        if (booking.trip_id && bookingsByTrip[booking.trip_id]) {
          const profile = profilesMap[booking.user_id] || {}
          bookingsByTrip[booking.trip_id].passengers.push({
            request_id: booking.id,
            visitor_name: booking.visitor_name,
            companions_count: booking.companions_count || 0,
            phone: profile.phone || null,
            whatsapp_phone: profile.whatsapp_phone || null,
            jordan_phone: profile.jordan_phone || null,
            user_id: booking.user_id,
          })
        }
      })

      // إضافة السائقين
      ;(driversData || []).forEach((assignment: any) => {
        if (assignment.trip_id && bookingsByTrip[assignment.trip_id] && assignment.drivers) {
          bookingsByTrip[assignment.trip_id].drivers.push({
            id: assignment.drivers.id,
            name: assignment.drivers.name,
            phone: assignment.drivers.phone,
          })
        }
      })

      // فصل القادمين عن المغادرين
      const arrivals: TripBooking[] = []
      const departures: TripBooking[] = []

      Object.values(bookingsByTrip).forEach((trip) => {
        if (trip.passengers.length > 0) {
          if (trip.trip_type === 'arrival') {
            arrivals.push(trip)
          } else {
            departures.push(trip)
          }
        }
      })

      setArrivalTrips(arrivals)
      setDepartureTrips(departures)

      // جلب المغادرين المتوقعين (الذين قدموا ولم يغادروا بعد)
      await loadExpectedDepartures()
    } catch (e: any) {
      console.error('Load bookings error:', e)
      toast.error(e?.message || 'تعذر تحميل الحجوزات')
    } finally {
      setLoading(false)
    }
  }

  const normalizePhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return ''
    const digits = phone.replace(/[^\d]/g, '')
    return digits.length >= 10 ? digits : ''
  }

  const getBestPhone = (passenger: TripBooking['passengers'][0] | undefined | null) => {
    if (!passenger) return ''
    return passenger.whatsapp_phone || passenger.jordan_phone || passenger.phone || ''
  }

  const copyAllPhones = async (trip: TripBooking, type: 'whatsapp' | 'phone') => {
    const phones = trip.passengers
      .map((p) => {
        if (type === 'whatsapp') {
          const wa = normalizePhoneForWhatsApp(getBestPhone(p))
          return wa || null
        } else {
          return getBestPhone(p) || null
        }
      })
      .filter(Boolean)
      .join('\n')

    if (!phones) {
      toast.error('لا توجد أرقام متاحة')
      return
    }

    try {
      await navigator.clipboard.writeText(phones)
      toast.success(`تم نسخ ${trip.passengers.length} رقم`)
    } catch {
      toast.error('تعذر النسخ')
    }
  }

  const openWhatsAppGroup = (trip: TripBooking) => {
    const phones = trip.passengers
      .map((p) => {
        const wa = normalizePhoneForWhatsApp(getBestPhone(p))
        return wa || null
      })
      .filter(Boolean)

    if (phones.length === 0) {
      toast.error('لا توجد أرقام واتساب متاحة')
      return
    }

    // واتساب جماعي (يحتاج إلى رقم واحد على الأقل)
    const firstPhone = phones[0]
    const otherPhones = phones.slice(1).join(',')
    const url = `https://wa.me/${firstPhone}${otherPhones ? `?text=${encodeURIComponent('مجموعة رحلة: ' + trip.start_location_name + ' → ' + trip.end_location_name)}` : ''}`
    window.open(url, '_blank')
  }

  const copyAllNamesForDate = async (trips: TripBooking[]) => {
    const names = trips
      .flatMap((trip) =>
        trip.passengers.map((p) => {
          const totalPeople = 1 + (p.companions_count || 0)
          return `${p.visitor_name}${totalPeople > 1 ? ` (${totalPeople} أشخاص)` : ''}`
        })
      )
      .join('\n')

    if (!names) {
      toast.error('لا توجد أسماء متاحة')
      return
    }

    try {
      await navigator.clipboard.writeText(names)
      toast.success(`تم نسخ ${trips.reduce((sum, t) => sum + t.passengers.length, 0)} اسم`)
    } catch {
      toast.error('تعذر النسخ')
    }
  }

  const copyAllPhonesForDate = async (trips: TripBooking[], type: 'whatsapp' | 'phone') => {
    const phones = trips
      .flatMap((trip) =>
        trip.passengers.map((p) => {
          if (type === 'whatsapp') {
            return normalizePhoneForWhatsApp(getBestPhone(p)) || null
          } else {
            return getBestPhone(p) || null
          }
        })
      )
      .filter(Boolean)
      .join('\n')

    if (!phones) {
      toast.error('لا توجد أرقام متاحة')
      return
    }

    try {
      await navigator.clipboard.writeText(phones)
      toast.success(`تم نسخ ${trips.reduce((sum, t) => sum + t.passengers.length, 0)} رقم`)
    } catch {
      toast.error('تعذر النسخ')
    }
  }

  const openWhatsAppGroupForDate = (trips: TripBooking[]) => {
    const phones = trips
      .flatMap((trip) =>
        trip.passengers.map((p) => {
          const wa = normalizePhoneForWhatsApp(getBestPhone(p))
          return wa || null
        })
      )
      .filter(Boolean)

    if (phones.length === 0) {
      toast.error('لا توجد أرقام واتساب متاحة')
      return
    }

    const firstPhone = phones[0]
    const dateStr = formatDate(trips[0]?.trip_date || '')
    const url = `https://wa.me/${firstPhone}?text=${encodeURIComponent('مجموعة رحلة ' + dateStr)}`
    window.open(url, '_blank')
  }

  const toggleTrip = (tripId: string) => {
    const newExpanded = new Set(expandedTrips)
    if (newExpanded.has(tripId)) {
      newExpanded.delete(tripId)
    } else {
      newExpanded.add(tripId)
    }
    setExpandedTrips(newExpanded)
  }

  const getDaysUntilTrip = (tripDate: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const trip = new Date(tripDate)
    trip.setHours(0, 0, 0, 0)
    const diff = Math.floor((trip.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDateLabel = (date: string) => {
    const daysUntil = getDaysUntilTrip(date)
    if (daysUntil === 0) {
      return 'اليوم - ' + formatDate(date)
    } else if (daysUntil === 1) {
      return 'غداً - ' + formatDate(date)
    } else if (daysUntil === 2) {
      return 'بعد غد - ' + formatDate(date)
    } else if (daysUntil > 0) {
      return `بعد ${daysUntil} أيام - ${formatDate(date)}`
    } else {
      return formatDate(date)
    }
  }

  // تجميع الرحلات حسب التاريخ
  const groupTripsByDate = (trips: TripBooking[]) => {
    const groups: Record<string, TripBooking[]> = {}
    trips.forEach((trip) => {
      const dateKey = trip.trip_date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(trip)
    })
    // ترتيب التواريخ
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, trips]) => ({ date, trips }))
  }

  const renderTripCard = (trip: TripBooking, isDeparture: boolean = false) => {
    const isExpanded = expandedTrips.has(trip.trip_id)
    const daysUntil = getDaysUntilTrip(trip.trip_date)
    const totalPeople = trip.passengers.reduce((sum, p) => sum + 1 + (p.companions_count || 0), 0)
    const hasUpcomingDeparture = isDeparture && daysUntil <= 3 && daysUntil >= 0

    return (
      <div
        key={trip.trip_id}
        className={`bg-white rounded-xl border-2 ${
          hasUpcomingDeparture ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
        } p-4 sm:p-5 md:p-6 shadow-md hover:shadow-lg transition`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  {trip.start_location_name} → {trip.end_location_name}
                </span>
              </h3>
              {hasUpcomingDeparture && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600 text-white text-[10px] sm:text-xs font-bold">
                  <AlertCircle className="w-3 h-3" />
                  {daysUntil === 0 ? 'اليوم' : daysUntil === 1 ? 'غداً' : `بعد ${daysUntil} أيام`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-bold">{formatDate(trip.trip_date)}</span>
              </div>
              {trip.meeting_time && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Clock className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>تجمع: {trip.meeting_time}</span>
                </div>
              )}
              {trip.departure_time && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Clock className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>انطلاق: {trip.departure_time}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-700">
                <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="font-bold">{totalPeople} شخص ({trip.passengers.length} حجز)</span>
              </div>
            </div>
            {trip.drivers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {trip.drivers.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] sm:text-xs font-bold"
                  >
                    <Bus className="w-3 h-3" />
                    {d.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => toggleTrip(trip.trip_id)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap flex-shrink-0"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                إخفاء
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                عرض التفاصيل
              </>
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => openWhatsAppGroup(trip)}
                className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                واتساب جماعي
              </button>
              <button
                onClick={() => copyAllPhones(trip, 'whatsapp')}
                className="px-3 py-2 rounded-lg bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ أرقام واتساب
              </button>
              <button
                onClick={() => copyAllPhones(trip, 'phone')}
                className="px-3 py-2 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                نسخ جميع الأرقام
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 mb-2">قائمة الركاب:</h4>
              {trip.passengers.map((passenger, idx) => {
                const phone = getBestPhone(passenger)
                const waPhone = normalizePhoneForWhatsApp(phone)
                const totalPeople = 1 + (passenger.companions_count || 0)

                return (
                  <div
                    key={passenger.request_id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-gray-900">
                          {idx + 1}. {passenger.visitor_name}
                        </span>
                        <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                          {totalPeople} {totalPeople === 1 ? 'شخص' : 'أشخاص'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-[11px] sm:text-xs text-gray-600">
                        {phone && (
                          <a
                            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {phone}
                          </a>
                        )}
                        {waPhone && (
                          <a
                            href={`https://wa.me/${waPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            واتساب
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // useEffect and early returns after all function definitions
  useEffect(() => {
    loadBookings()
  }, [])

  // Early return for loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              إدارة الحجوزات والرحلات
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              عرض جميع الحجوزات للقادمين والمغادرين مع أرقام الاتصال
            </p>
          </div>
          <button
            onClick={loadBookings}
            disabled={loading}
            className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-xs sm:text-sm font-bold disabled:opacity-50"
          >
            تحديث
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              activeTab === 'arrivals'
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
            }`}
          >
            القادمون ({arrivalTrips.length})
          </button>
          <button
            onClick={() => setActiveTab('departures')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              activeTab === 'departures'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            المغادرون ({departureTrips.length})
          </button>
          <button
            onClick={() => setActiveTab('expected')}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-bold transition ${
              activeTab === 'expected'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            متوقعون ({expectedDepartures.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'arrivals' ? (
        <div className="space-y-6">
          {arrivalTrips.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
              لا توجد حجوزات للقادمين حالياً
            </div>
          ) : (
            groupTripsByDate(arrivalTrips).map(({ date, trips }) => (
              <div key={date} className="space-y-4">
                <div className="sticky top-0 z-10 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3 sm:p-4 shadow-md">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-700 flex-shrink-0" />
                        <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">
                          {getDateLabel(date)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-green-200">
                          {trips.length} {trips.length === 1 ? 'رحلة' : 'رحلات'}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-green-200">
                          {trips.reduce((sum, t) => sum + t.passengers.reduce((s, p) => s + 1 + (p.companions_count || 0), 0), 0)} {trips.reduce((sum, t) => sum + t.passengers.reduce((s, p) => s + 1 + (p.companions_count || 0), 0), 0) === 1 ? 'شخص' : 'أشخاص'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-green-200">
                      <button
                        onClick={() => copyAllNamesForDate(trips)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-green-800 border border-green-300 hover:bg-green-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ جميع الأسماء"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ الأسماء
                      </button>
                      <button
                        onClick={() => copyAllPhonesForDate(trips, 'whatsapp')}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-green-800 border border-green-300 hover:bg-green-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ أرقام واتساب"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ واتساب
                      </button>
                      <button
                        onClick={() => copyAllPhonesForDate(trips, 'phone')}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-green-800 border border-green-300 hover:bg-green-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ جميع الأرقام"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ الأرقام
                      </button>
                      <button
                        onClick={() => openWhatsAppGroupForDate(trips)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="واتساب جماعي لجميع الركاب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        واتساب جماعي
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {trips.map((trip) => renderTripCard(trip, false))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'departures' ? (
        <div className="space-y-6">
          {departureTrips.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
              لا توجد حجوزات للمغادرين حالياً
            </div>
          ) : (
            groupTripsByDate(departureTrips).map(({ date, trips }) => (
              <div key={date} className="space-y-4">
                <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-3 sm:p-4 shadow-md">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700 flex-shrink-0" />
                        <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">
                          {getDateLabel(date)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-purple-200">
                          {trips.length} {trips.length === 1 ? 'رحلة' : 'رحلات'}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-purple-200">
                          {trips.reduce((sum, t) => sum + t.passengers.reduce((s, p) => s + 1 + (p.companions_count || 0), 0), 0)} {trips.reduce((sum, t) => sum + t.passengers.reduce((s, p) => s + 1 + (p.companions_count || 0), 0), 0) === 1 ? 'شخص' : 'أشخاص'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200">
                      <button
                        onClick={() => copyAllNamesForDate(trips)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-purple-800 border border-purple-300 hover:bg-purple-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ جميع الأسماء"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ الأسماء
                      </button>
                      <button
                        onClick={() => copyAllPhonesForDate(trips, 'whatsapp')}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-purple-800 border border-purple-300 hover:bg-purple-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ أرقام واتساب"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ واتساب
                      </button>
                      <button
                        onClick={() => copyAllPhonesForDate(trips, 'phone')}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-purple-800 border border-purple-300 hover:bg-purple-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="نسخ جميع الأرقام"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        نسخ الأرقام
                      </button>
                      <button
                        onClick={() => openWhatsAppGroupForDate(trips)}
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        title="واتساب جماعي لجميع الركاب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        واتساب جماعي
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {trips.map((trip) => renderTripCard(trip, true))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'expected' ? (
        <div className="space-y-6">
          {expectedDepartures.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600">
              لا يوجد مغادرين متوقعين حالياً
            </div>
          ) : (
            groupTripsByDate(
              expectedDepartures.map((d) => ({
                trip_id: d.request_id,
                trip_date: d.expected_departure_date,
                trip_type: 'departure' as const,
                meeting_time: null,
                departure_time: null,
                start_location_name: 'عمان',
                end_location_name: d.arrival_date ? formatDate(d.arrival_date) : '',
                passengers: [
                  {
                    request_id: d.request_id,
                    visitor_name: d.visitor_name,
                    companions_count: d.companions_count,
                    phone: d.phone,
                    whatsapp_phone: d.whatsapp_phone,
                    jordan_phone: d.jordan_phone,
                    user_id: d.user_id,
                  },
                ],
                drivers: [],
              }))
            ).map(({ date, trips }) => {
              const daysUntil = getDaysUntilTrip(date)
              const isUrgent = daysUntil <= 3 && daysUntil >= 0
              const urgentCount = trips.filter((t) => {
                const tripDays = getDaysUntilTrip(t.trip_date)
                return tripDays <= 3 && tripDays >= 0
              }).length

              return (
                <div key={date} className="space-y-4">
                  <div
                    className={`sticky top-0 z-10 border-2 rounded-xl p-3 sm:p-4 shadow-md ${
                      isUrgent
                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300'
                        : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Plane className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`} />
                          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">
                            {getDateLabel(date)}
                          </h3>
                          {isUrgent && urgentCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-bold">
                              <AlertCircle className="w-3 h-3" />
                              {urgentCount} {urgentCount === 1 ? 'شخص' : 'أشخاص'} يغادرون قريباً
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-full border border-amber-200">
                            {trips.length} {trips.length === 1 ? 'شخص' : 'أشخاص'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200">
                        <button
                          onClick={() => {
                            const names = trips
                              .map((t) => {
                                const p = t.passengers?.[0]
                                if (!p) return null
                                const totalPeople = 1 + (p.companions_count || 0)
                                return `${p.visitor_name}${totalPeople > 1 ? ` (${totalPeople} أشخاص)` : ''}`
                              })
                              .filter(Boolean)
                              .join('\n')
                            navigator.clipboard.writeText(names).then(() => toast.success(`تم نسخ ${trips.length} اسم`))
                          }}
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-amber-800 border border-amber-300 hover:bg-amber-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          نسخ الأسماء
                        </button>
                        <button
                          onClick={() => {
                            const phones = trips
                              .map((t) => {
                                const p = t.passengers?.[0]
                                return p ? normalizePhoneForWhatsApp(getBestPhone(p)) : null
                              })
                              .filter(Boolean)
                              .join('\n')
                            navigator.clipboard.writeText(phones).then(() => toast.success(`تم نسخ ${trips.length} رقم`))
                          }}
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white text-amber-800 border border-amber-300 hover:bg-amber-100 transition text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          نسخ واتساب
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {trips.map((trip) => {
                      const passenger = trip.passengers[0]
                      const originalData = expectedDepartures.find((d) => d.request_id === trip.trip_id)
                      const hasDeparted = originalData?.has_departure_trip || originalData?.actual_departure_date
                      const daysUntil = getDaysUntilTrip(trip.trip_date)
                      const isUrgentTrip = daysUntil <= 3 && daysUntil >= 0
                      const totalPeople = 1 + (passenger?.companions_count || 0)
                      const phone = getBestPhone(passenger)
                      const waPhone = normalizePhoneForWhatsApp(phone)

                      return (
                        <div
                          key={trip.trip_id}
                          className={`bg-white rounded-xl border-2 ${
                            isUrgentTrip ? 'border-red-300 bg-red-50' : 'border-gray-200'
                          } p-4 sm:p-5 shadow-md hover:shadow-lg transition`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <h4 className="text-base sm:text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                  {passenger?.visitor_name}
                                  {hasDeparted && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-600 text-white text-[10px] sm:text-xs font-bold">
                                      <CheckCircle2 className="w-3 h-3" />
                                      تم الحجز
                                    </span>
                                  )}
                                  {isUrgentTrip && !hasDeparted && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-bold">
                                      <AlertCircle className="w-3 h-3" />
                                      {daysUntil === 0 ? 'اليوم' : daysUntil === 1 ? 'غداً' : `بعد ${daysUntil} أيام`}
                                    </span>
                                  )}
                                </h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span>قدوم: {originalData?.arrival_date ? formatDate(originalData.arrival_date) : '-'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Plane className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                  <span className="font-bold">مغادرة متوقعة: {formatDate(trip.trip_date)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-700">
                                  <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <span>{totalPeople} {totalPeople === 1 ? 'شخص' : 'أشخاص'}</span>
                                </div>
                              </div>
                              {phone && (
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                                  <a
                                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                                    className="inline-flex items-center gap-1 text-blue-700 hover:underline font-bold"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    {phone}
                                  </a>
                                  {waPhone && (
                                    <a
                                      href={`https://wa.me/${waPhone}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-green-700 hover:underline font-bold"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      واتساب
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

