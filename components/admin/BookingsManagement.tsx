'use client'

import { useEffect, useState, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Calendar, Users, Phone, MessageCircle, Copy, Clock, MapPin, Bus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Plane } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

type TripBooking = {
  request_id: string
  visitor_name: string
  companions_count: number
  arrival_date: string | null
  departure_date: string | null
  trip_id: string | null
  trip_date: string | null
  trip_type: 'arrival' | 'departure' | null
  phone: string | null
  whatsapp_phone: string | null
  jordan_phone: string | null
  user_id: string
  status: string
}

type ExpectedDeparture = {
  request_id: string
  visitor_name: string
  companions_count: number
  arrival_date: string
  expected_departure_date: string
  actual_departure_date: string | null
  has_departure_trip: boolean
  phone: string | null
  whatsapp_phone: string | null
  jordan_phone: string | null
  user_id: string
}

function normalizePhoneForWhatsApp(phone: string | null) {
  if (!phone) return ''
  let clean = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '')
  clean = clean.replace(/^\+?0+/, '')
  if (clean.startsWith('00')) clean = clean.substring(2)
  return clean
}

function waHrefFor(phone: string | null, text?: string) {
  const digits = normalizePhoneForWhatsApp(phone)
  if (!digits) return ''
  const base = `https://wa.me/${digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export default function BookingsManagement() {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [arrivalTrips, setArrivalTrips] = useState<TripBooking[]>([])
  const [departureTrips, setDepartureTrips] = useState<TripBooking[]>([])
  const [expectedDepartures, setExpectedDepartures] = useState<Array<ExpectedDeparture>>([])
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

      // جلب جميع الطلبات المقبولة التي لها رحلة محجوزة
      const { data: requestsData, error: requestsErr } = await supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          companions_count,
          arrival_date,
          departure_date,
          trip_id,
          status,
          user_id
        `)
        .eq('status', 'approved')
        .not('trip_id', 'is', null)

      if (requestsErr) throw requestsErr

      // جلب معلومات الرحلات
      const tripIds = Array.from(new Set((requestsData || []).map((r: any) => r.trip_id).filter(Boolean)))
      let tripsMap: Record<string, { trip_date: string; trip_type: 'arrival' | 'departure' | null }> = {}

      if (tripIds.length > 0) {
        const { data: tripsData, error: tripsErr } = await supabase
          .from('route_trips')
          .select('id, trip_date, trip_type')
          .in('id', tripIds)

        if (!tripsErr && tripsData) {
          tripsData.forEach((t: any) => {
            tripsMap[t.id] = {
              trip_date: t.trip_date,
              trip_type: t.trip_type || null,
            }
          })
        }
      }

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

      // فصل القادمون والمغادرون
      const arrivals: TripBooking[] = []
      const departures: TripBooking[] = []

      ;(requestsData || []).forEach((req: any) => {
        const tripInfo = tripsMap[req.trip_id] || { trip_date: null, trip_type: null }
        const profile = profilesMap[req.user_id] || {}

        const booking: TripBooking = {
          request_id: req.id,
          visitor_name: req.visitor_name,
          companions_count: req.companions_count || 0,
          arrival_date: req.arrival_date,
          departure_date: req.departure_date,
          trip_id: req.trip_id,
          trip_date: tripInfo.trip_date,
          trip_type: tripInfo.trip_type,
          phone: profile.phone || null,
          whatsapp_phone: profile.whatsapp_phone || null,
          jordan_phone: profile.jordan_phone || null,
          user_id: req.user_id,
          status: req.status,
        }

        if (tripInfo.trip_type === 'arrival') {
          arrivals.push(booking)
        } else if (tripInfo.trip_type === 'departure') {
          departures.push(booking)
        }
      })

      // ترتيب حسب تاريخ الرحلة
      arrivals.sort((a, b) => {
        const dateA = a.trip_date || a.arrival_date || ''
        const dateB = b.trip_date || b.arrival_date || ''
        return dateA.localeCompare(dateB)
      })

      departures.sort((a, b) => {
        const dateA = a.trip_date || a.departure_date || ''
        const dateB = b.trip_date || b.departure_date || ''
        return dateA.localeCompare(dateB)
      })

      setArrivalTrips(arrivals)
      setDepartureTrips(departures)

      // تحميل المغادرين المتوقعين
      await loadExpectedDepartures()
    } catch (e: any) {
      console.error('Load bookings error:', e)
      toast.error(e?.message || 'تعذر تحميل الحجوزات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`تم نسخ ${label}`)
  }

  const groupedByDate = (trips: TripBooking[]) => {
    const groups: Record<string, TripBooking[]> = {}
    trips.forEach((trip) => {
      const date = trip.trip_date || trip.arrival_date || trip.departure_date || 'بدون تاريخ'
      if (!groups[date]) groups[date] = []
      groups[date].push(trip)
    })
    return groups
  }

  const renderTripCard = (trip: TripBooking, isDeparture: boolean = false) => {
    const date = trip.trip_date || trip.arrival_date || trip.departure_date || 'بدون تاريخ'
    const isExpanded = expandedTrips.has(trip.request_id)
    const isNearDeparture = isDeparture && trip.departure_date
      ? (() => {
          const depDate = new Date(trip.departure_date)
          const today = new Date()
          const diffTime = depDate.getTime() - today.getTime()
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays >= 0 && diffDays <= 3
        })()
      : false

    return (
      <div
        key={trip.request_id}
        className={`border rounded-lg p-3 sm:p-4 ${isNearDeparture ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isDeparture ? (
                <Plane className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              ) : (
                <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              )}
              <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">{trip.visitor_name}</h3>
              {isNearDeparture && (
                <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-semibold">
                  قريب
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{formatDate(date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>{1 + trip.companions_count} شخص</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              const newSet = new Set(expandedTrips)
              if (isExpanded) {
                newSet.delete(trip.request_id)
              } else {
                newSet.add(trip.request_id)
              }
              setExpandedTrips(newSet)
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <div className="flex flex-wrap gap-2">
              {trip.phone && (
                <button
                  onClick={() => copyToClipboard(trip.phone!, 'رقم الهاتف')}
                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition"
                >
                  <Phone className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{trip.phone}</span>
                  <Copy className="w-3 h-3" />
                </button>
              )}
              {trip.whatsapp_phone && (
                <a
                  href={waHrefFor(trip.whatsapp_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">واتساب</span>
                </a>
              )}
              {trip.jordan_phone && (
                <button
                  onClick={() => copyToClipboard(trip.jordan_phone!, 'رقم الأردن')}
                  className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition"
                >
                  <Phone className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{trip.jordan_phone}</span>
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => copyToClipboard(trip.visitor_name, 'الاسم')}
              className="w-full text-left text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              نسخ الاسم
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const arrivalsGrouped = groupedByDate(arrivalTrips)
  const departuresGrouped = groupedByDate(departureTrips)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الحجوزات والرحلات</h2>
        <button
          onClick={() => loadBookings()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
        >
          تحديث
        </button>
      </div>

      {/* توضيح الفرق بين القادمون والمغادرون */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4">
        <div className="flex items-start gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-sm sm:text-base text-blue-900 mb-1">توضيح:</h3>
            <div className="space-y-1 text-xs sm:text-sm text-blue-800">
              <p><strong>القادمون:</strong> طلبات زيارة جديدة - يريدون القدوم وحجز موعد القدوم</p>
              <p><strong>المغادرون:</strong> أشخاص قدموا بالفعل - يريدون المغادرة وحجز موعد المغادرة</p>
              <p><strong>المتوقعون:</strong> قائمة بالأشخاص الذين يجب تذكيرهم بالمغادرة (قبل 3 أيام)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
            activeTab === 'arrivals'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          القادمون ({arrivalTrips.length})
        </button>
        <button
          onClick={() => setActiveTab('departures')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
            activeTab === 'departures'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          المغادرون ({departureTrips.length})
        </button>
        <button
          onClick={() => setActiveTab('expected')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition ${
            activeTab === 'expected'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          المتوقعون ({expectedDepartures.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'arrivals' ? (
        <div className="space-y-6">
          {Object.keys(arrivalsGrouped).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد حجوزات قادمين</p>
            </div>
          ) : (
            Object.entries(arrivalsGrouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, trips]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{formatDate(date)}</h3>
                    <span className="text-xs sm:text-sm text-gray-500">({trips.length} حجز)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trips.map((trip) => renderTripCard(trip, false))}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : activeTab === 'departures' ? (
        <div className="space-y-6">
          {Object.keys(departuresGrouped).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Plane className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد حجوزات مغادرين</p>
            </div>
          ) : (
            Object.entries(departuresGrouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, trips]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-base sm:text-lg text-gray-900">{formatDate(date)}</h3>
                    <span className="text-xs sm:text-sm text-gray-500">({trips.length} حجز)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trips.map((trip) => renderTripCard(trip, true))}
                  </div>
                </div>
              ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {expectedDepartures.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>لا توجد مغادرين متوقعين</p>
            </div>
          ) : (
            expectedDepartures.map((expected) => {
              const expectedDate = new Date(expected.expected_departure_date)
              const today = new Date()
              const diffTime = expectedDate.getTime() - today.getTime()
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
              const isNear = diffDays >= 0 && diffDays <= 3

              return (
                <div
                  key={expected.request_id}
                  className={`border rounded-lg p-3 sm:p-4 ${
                    isNear ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-sm sm:text-base text-gray-900">{expected.visitor_name}</h3>
                        {isNear && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-semibold">
                            تذكير: {diffDays === 0 ? 'اليوم' : diffDays === 1 ? 'غداً' : `خلال ${diffDays} أيام`}
                          </span>
                        )}
                        {expected.has_departure_trip && (
                          <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full font-semibold">
                            محجوز
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>تاريخ القدوم: {formatDate(expected.arrival_date)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>المغادرة المتوقعة: {formatDate(expected.expected_departure_date)}</span>
                        </div>
                        {expected.actual_departure_date && (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-green-600" />
                            <span>المغادرة الفعلية: {formatDate(expected.actual_departure_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{1 + expected.companions_count} شخص</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                    {expected.phone && (
                      <button
                        onClick={() => copyToClipboard(expected.phone!, 'رقم الهاتف')}
                        className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{expected.phone}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {expected.whatsapp_phone && (
                      <a
                        href={waHrefFor(expected.whatsapp_phone, `مرحباً ${expected.visitor_name}، تذكير: موعد مغادرتك المتوقع ${formatDate(expected.expected_departure_date)}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>واتساب</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

