'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { Users, MapPin, Phone, Calendar, User, Navigation } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

type PassengerRequest = {
  id: string
  visitor_name: string
  companions_count: number | null
  travel_date: string
  city: string
  status: string
  arrival_date: string | null
  departure_date: string | null
  trip_status: string | null
  created_at: string
  user_id: string
  assigned_driver_id?: string | null
  user_profile?: {
    full_name: string | null
    phone: string | null
  }
  dropoff_point?: {
    name: string
    address: string | null
    lat: number
    lng: number
  }
}

export default function DriverPassengers() {
  const supabase = createSupabaseBrowserClient()
  const [passengers, setPassengers] = useState<PassengerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'all' | 'active' | 'upcoming'>('today')

  const getTodayISO = () => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  useEffect(() => {
    loadPassengers()
  }, [filter])

  const loadPassengers = async () => {
    try {
      setLoading(true)

      // الحصول على معرف المستخدم الحالي
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // الحصول على سجل السائق المربوط بهذا الحساب
      const { data: driverRow, error: driverErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (driverErr) throw driverErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق. يرجى التواصل مع الإدارة.')
        setPassengers([])
        return
      }

      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)

      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map(r => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        setPassengers([])
        return
      }

      // الحصول على طلبات الركاب في خطوط السائق
      let query = supabase
        .from('visit_requests')
        .select(`
          id,
          visitor_name,
          companions_count,
          travel_date,
          city,
          status,
          arrival_date,
          departure_date,
          trip_status,
          created_at,
          user_id,
          assigned_driver_id,
          request_dropoff_points(name, address, lat, lng)
        `)
        .eq('status', 'approved') // فقط الطلبات المقبولة
        .in('trip_status', ['pending_arrival', 'arrived']) // الرحلات النشطة
        .in('route_id', routeIds)
        // إذا تم تعيين سائق للطلب: لا يظهر إلا لهذا السائق (أو إذا لم يتم تعيين سائق)
        .or(`assigned_driver_id.is.null,assigned_driver_id.eq.${driverRow.id}`)

      // تطبيق الفلتر
      if (filter === 'today') {
        query = query.eq('arrival_date', getTodayISO())
      } else if (filter === 'active') {
        query = query.eq('trip_status', 'arrived')
      } else if (filter === 'upcoming') {
        query = query.eq('trip_status', 'pending_arrival')
      }

      const { data: passengersData, error } = await query
        .order('arrival_date', { ascending: true })

      if (error) throw error

      const userIds = Array.from(new Set((passengersData || []).map((p: any) => p.user_id).filter(Boolean)))
      let profilesMap: Record<string, { full_name: string | null; phone: string | null }> = {}
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds)
        if (profErr) throw profErr
        ;(profs || []).forEach((p: any) => {
          profilesMap[p.user_id] = { full_name: p.full_name || null, phone: p.phone || null }
        })
      }

      // تنسيق البيانات
      const formattedPassengers: PassengerRequest[] = (passengersData || []).map((passenger: any) => ({
        id: passenger.id,
        visitor_name: passenger.visitor_name,
        companions_count: passenger.companions_count,
        travel_date: passenger.travel_date,
        city: passenger.city,
        status: passenger.status,
        arrival_date: passenger.arrival_date,
        departure_date: passenger.departure_date,
        trip_status: passenger.trip_status,
        created_at: passenger.created_at,
        user_id: passenger.user_id,
        assigned_driver_id: passenger.assigned_driver_id || null,
        user_profile: {
          full_name: profilesMap[passenger.user_id]?.full_name || null,
          phone: profilesMap[passenger.user_id]?.phone || null,
        },
        dropoff_point: passenger.request_dropoff_points?.[0] ? {
          name: passenger.request_dropoff_points[0].name,
          address: passenger.request_dropoff_points[0].address,
          lat: passenger.request_dropoff_points[0].lat,
          lng: passenger.request_dropoff_points[0].lng,
        } : undefined,
      }))

      setPassengers(formattedPassengers)
    } catch (error: any) {
      console.error('Error loading passengers:', error)
      toast.error('حدث خطأ أثناء تحميل قائمة الركاب')
    } finally {
      setLoading(false)
    }
  }

  const getTripStatusBadge = (tripStatus: string | null) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string; icon: any }> = {
      pending_arrival: {
        text: 'في الطريق',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        icon: Navigation
      },
      arrived: {
        text: 'وصل',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        icon: MapPin
      },
    }

    const statusInfo = statusMap[tripStatus || ''] || statusMap.pending_arrival
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold border-2 ${statusInfo.color} ${statusInfo.bgColor} border-current`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
        {statusInfo.text}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد'
    try {
      return new Date(dateString).toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getPeopleCount = (request: PassengerRequest) => {
    // الزائر الرئيسي + المرافقين
    return 1 + (request.companions_count || 0)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">جاري تحميل قائمة الركاب...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
          <h3 className="text-base sm:text-lg font-bold text-gray-800">فلترة الركاب</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              رحلات اليوم
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              الركاب الحاليين
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'upcoming'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              الرحلات القادمة
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>إجمالي الركاب: <span className="font-bold text-gray-800">{passengers.length}</span></p>
        </div>
      </div>

      {/* Passengers List */}
      {passengers.length === 0 ? (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              {filter === 'today' ? 'لا توجد رحلات اليوم' :
               filter === 'active' ? 'لا يوجد ركاب حالياً' :
               filter === 'upcoming' ? 'لا توجد رحلات قادمة' :
               'لا توجد ركاب'}
            </h3>
            <p className="text-sm text-gray-600">
              {filter === 'today' ? 'لا توجد طلبات مجدولة اليوم ضمن خطوطك' :
               filter === 'active' ? 'جميع الركاب وصلوا إلى وجهاتهم' :
               filter === 'upcoming' ? 'لا توجد رحلات مجدولة قادمة' :
               'لم يتم العثور على أي ركاب في خطوطك'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {passengers.map((passenger) => (
            <div key={passenger.id} className="bg-white rounded-lg shadow-md p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row justify-between items-start gap-3 sm:gap-4">
                {/* Passenger Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                        {passenger.visitor_name}
                      </h3>
                      {passenger.user_profile?.full_name && (
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          المستخدم: {passenger.user_profile.full_name}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{getPeopleCount(passenger)} أشخاص</span>
                        </div>
                        {passenger.user_profile?.phone && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span>{passenger.user_profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600">تاريخ الوصول</p>
                        <p className="font-medium text-gray-800">{formatDate(passenger.arrival_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600">تاريخ المغادرة</p>
                        <p className="font-medium text-gray-800">{formatDate(passenger.departure_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-gray-600">نقطة النزول</p>
                        <p className="font-medium text-gray-800 truncate">
                          {passenger.dropoff_point?.name || 'غير محدد'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                  {getTripStatusBadge(passenger.trip_status)}

                  <Link
                    href={`/driver/passenger/${passenger.id}`}
                    className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium text-center"
                  >
                    عرض التفاصيل
                  </Link>
                </div>
              </div>

              {/* Additional Info */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-600">
                  <span>المدينة: {passenger.city}</span>
                  <span>تاريخ الطلب: {formatDate(passenger.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
