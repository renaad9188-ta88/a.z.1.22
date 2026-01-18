'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { ArrowLeft, User, Phone, MapPin, Calendar, Users, Navigation } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

type PassengerDetails = {
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
  companions_data?: any[]
}

export default function PassengerDetails() {
  const params = useParams()
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [passenger, setPassenger] = useState<PassengerDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadPassengerDetails(params.id as string)
    }
  }, [params.id])

  const loadPassengerDetails = async (requestId: string) => {
    try {
      setLoading(true)

      // التحقق من صلاحية السائق
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // الحصول على سجل السائق المربوط بهذا الحساب
      const { data: driverRow, error: driverErr } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (driverErr) throw driverErr
      if (!driverRow?.id) {
        toast.error('حسابك كسائق غير مربوط بسجل سائق. يرجى التواصل مع الإدارة.')
        router.push('/driver')
        return
      }

      const { data: rdRows, error: rdErr } = await supabase
        .from('route_drivers')
        .select('route_id')
        .eq('driver_id', driverRow.id)
        .eq('is_active', true)

      if (rdErr) throw rdErr
      const routeIds = (rdRows || []).map((r: any) => r.route_id).filter(Boolean)
      if (routeIds.length === 0) {
        toast.error('لا توجد خطوط مربوطة بك. يرجى التواصل مع الإدارة.')
        router.push('/driver')
        return
      }

      // التحقق من أن الطلب يخص خطوط هذا السائق
      const { data: requestData, error } = await supabase
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
          companions_data,
          profiles!inner(full_name, phone),
          request_dropoff_points(name, address, lat, lng)
        `)
        .eq('id', requestId)
        .eq('status', 'approved')
        .in('trip_status', ['pending_arrival', 'arrived'])
        .in('route_id', routeIds)
        .single()

      if (error || !requestData) {
        toast.error('لا يمكنك عرض تفاصيل هذا الراكب')
        router.push('/driver')
        return
      }

      // تنسيق البيانات
      const profileRow: any = Array.isArray((requestData as any).profiles)
        ? (requestData as any).profiles?.[0]
        : (requestData as any).profiles

      const formattedPassenger: PassengerDetails = {
        id: requestData.id,
        visitor_name: requestData.visitor_name,
        companions_count: requestData.companions_count,
        travel_date: requestData.travel_date,
        city: requestData.city,
        status: requestData.status,
        arrival_date: requestData.arrival_date,
        departure_date: requestData.departure_date,
        trip_status: requestData.trip_status,
        created_at: requestData.created_at,
        companions_data: requestData.companions_data,
        user_profile: {
          full_name: profileRow?.full_name || null,
          phone: profileRow?.phone || null,
        },
        dropoff_point: requestData.request_dropoff_points?.[0] ? {
          name: requestData.request_dropoff_points[0].name,
          address: requestData.request_dropoff_points[0].address,
          lat: requestData.request_dropoff_points[0].lat,
          lng: requestData.request_dropoff_points[0].lng,
        } : undefined,
      }

      setPassenger(formattedPassenger)
    } catch (error: any) {
      console.error('Error loading passenger details:', error)
      toast.error('حدث خطأ أثناء تحميل تفاصيل الراكب')
      router.push('/driver')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد'
    try {
      return new Date(dateString).toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })
    } catch {
      return dateString
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
      <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold border-2 ${statusInfo.color} ${statusInfo.bgColor} border-current`}>
        <Icon className="w-5 h-5" />
        {statusInfo.text}
      </span>
    )
  }

  const getCompanionsList = () => {
    if (!passenger?.companions_data || !Array.isArray(passenger.companions_data)) {
      return []
    }

    // في الطلبات القديمة، companions_data قد تحتوي على الزائر الرئيسي أيضاً
    // نحتاج لتصفية المرافقين فقط
    const primaryPassportUrl = passenger.companions_data.find((c: any) =>
      c.passport_image_url
    )?.passport_image_url

    return passenger.companions_data.filter((companion: any) => {
      // إذا كان الطلب الجديد، companions_data تحتوي على المرافقين فقط
      // إذا كان الطلب القديم، companions_data تحتوي على الجميع، نحتاج لتصفية
      return !primaryPassportUrl || companion.passport_image_url !== primaryPassportUrl
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">جاري تحميل تفاصيل الراكب...</p>
        </div>
      </div>
    )
  }

  if (!passenger) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">الراكب غير موجود</h2>
          <Link href="/driver" className="text-blue-600 hover:underline">
            العودة لقائمة الركاب
          </Link>
        </div>
      </div>
    )
  }

  const companions = getCompanionsList()
  const totalPeople = 1 + companions.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-md rounded-xl w-full">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/driver"
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">العودة</span>
            </Link>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
                تفاصيل الراكب: {passenger.visitor_name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                عرض معلومات الرحلة والركاب
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Passenger Info */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-700 rounded-full">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">{passenger.visitor_name}</h2>
                  <p className="text-sm text-gray-600">الزائر الرئيسي</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">المستخدم:</span>
                  <span className="font-medium">{passenger.user_profile?.full_name || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-medium">{passenger.user_profile?.phone || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">المدينة:</span>
                  <span className="font-medium">{passenger.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">عدد الأشخاص:</span>
                  <span className="font-medium">{totalPeople} أشخاص</span>
                </div>
              </div>
            </div>

            {/* Companions */}
            {companions.length > 0 && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  المرافقون ({companions.length})
                </h3>
                <div className="space-y-3">
                  {companions.map((companion: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{companion.name || 'غير محدد'}</p>
                        {companion.relationship && (
                          <p className="text-sm text-gray-600">العلاقة: {companion.relationship}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trip Details */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                تفاصيل الرحلة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">تاريخ الوصول:</span>
                  </div>
                  <p className="font-medium text-gray-800 ml-6">{formatDate(passenger.arrival_date)}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-green-600 rotate-180" />
                    <span className="text-sm text-gray-600">تاريخ المغادرة:</span>
                  </div>
                  <p className="font-medium text-gray-800 ml-6">{formatDate(passenger.departure_date)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">حالة الرحلة</h3>
              <div className="flex justify-center">
                {getTripStatusBadge(passenger.trip_status)}
              </div>
            </div>

            {/* Dropoff Point */}
            {passenger.dropoff_point && (
              <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  نقطة النزول
                </h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-800">{passenger.dropoff_point.name}</p>
                  {passenger.dropoff_point.address && (
                    <p className="text-sm text-gray-600">{passenger.dropoff_point.address}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    <p>خط العرض: {passenger.dropoff_point.lat.toFixed(6)}</p>
                    <p>خط الطول: {passenger.dropoff_point.lng.toFixed(6)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">الإجراءات</h3>
              <div className="space-y-3">
                <Link
                  href={`/driver/passenger/${passenger.id}/track`}
                  className="w-full block px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  تتبع الرحلة على الخريطة
                </Link>
                <button
                  onClick={() => router.push('/driver')}
                  className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  العودة لقائمة الركاب
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
