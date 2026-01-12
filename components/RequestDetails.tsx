'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, 
  Calendar, 
  MapPin, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Car,
  Hotel,
  DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VisitRequest {
  id: string
  visitor_name: string
  nationality: string
  passport_number: string
  passport_expiry: string
  passport_image_url: string | null
  visit_type: string
  travel_date: string
  days_count: number
  city: string
  destination: string | null
  companions_count: number
  companions_data: any
  driver_name: string | null
  driver_phone: string | null
  vehicle_type: string | null
  seats_count: number | null
  route_going: string | null
  route_return: string | null
  hotel_name: string | null
  hotel_location: string | null
  rooms_count: number | null
  nights_count: number | null
  status: string
  rejection_reason: string | null
  deposit_paid: boolean
  deposit_amount: number | null
  total_amount: number | null
  remaining_amount: number | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export default function RequestDetails({ requestId, userId }: { requestId: string; userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [request, setRequest] = useState<VisitRequest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequest()
  }, [requestId, userId])

  const loadRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', requestId)
        .eq('user_id', userId)
        .single()

      if (error) throw error
      if (!data) {
        toast.error('الطلب غير موجود')
        router.push('/dashboard')
        return
      }

      setRequest(data)
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل الطلب')
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; icon: any }> = {
      pending: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { text: 'بانتظار الموافقة', color: 'bg-blue-100 text-blue-800', icon: Clock },
      approved: { text: 'تم القبول', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: 'تم الرفض', color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-5 h-5" />
        {statusInfo.text}
      </span>
    )
  }

  const getVisitTypeText = (type: string) => {
    const types: Record<string, string> = {
      visit: 'زيارة',
      umrah: 'عمرة',
      tourism: 'سياحة',
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للوحة التحكم
        </Link>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">تفاصيل الطلب</h1>
              <p className="text-gray-600">رقم الطلب: {request.id.slice(0, 8)}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>

          {request.rejection_reason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-red-800 mb-2">سبب الرفض:</h3>
              <p className="text-red-700">{request.rejection_reason}</p>
            </div>
          )}

          {request.admin_notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">ملاحظات الإدارة:</h3>
              <p className="text-blue-700">{request.admin_notes}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* بيانات الزائر */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                بيانات الزائر
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">الاسم الكامل</p>
                  <p className="font-semibold">{request.visitor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الجنسية</p>
                  <p className="font-semibold">{request.nationality}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">رقم الجواز</p>
                  <p className="font-semibold">{request.passport_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تاريخ انتهاء الجواز</p>
                  <p className="font-semibold">{new Date(request.passport_expiry).toLocaleDateString('ar-SA')}</p>
                </div>
                {request.passport_image_url && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">صورة الجواز</p>
                    <img
                      src={request.passport_image_url}
                      alt="صورة الجواز"
                      className="max-w-full h-auto rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* بيانات الرحلة */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                بيانات الرحلة
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">نوع الزيارة</p>
                  <p className="font-semibold">{getVisitTypeText(request.visit_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">تاريخ السفر</p>
                  <p className="font-semibold">{new Date(request.travel_date).toLocaleDateString('ar-SA')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">عدد الأيام</p>
                  <p className="font-semibold">{request.days_count} يوم</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المدينة</p>
                  <p className="font-semibold">{request.city}</p>
                </div>
                {request.destination && (
                  <div>
                    <p className="text-sm text-gray-600">الوجهة</p>
                    <p className="font-semibold">{request.destination}</p>
                  </div>
                )}
              </div>
            </div>

            {/* المرافقين */}
            {request.companions_count > 0 && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">المرافقين ({request.companions_count})</h2>
                {request.companions_data && Array.isArray(request.companions_data) && (
                  <div className="space-y-3">
                    {request.companions_data.map((companion: any, index: number) => (
                      <div key={index} className="border-b border-gray-200 pb-3 last:border-0">
                        <p className="font-semibold">{companion.name || `مرافق ${index + 1}`}</p>
                        {companion.relationship && (
                          <p className="text-sm text-gray-600">العلاقة: {companion.relationship}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* السائق والنقل */}
            {request.driver_name && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  بيانات السائق والنقل
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">اسم السائق</p>
                    <p className="font-semibold">{request.driver_name}</p>
                  </div>
                  {request.driver_phone && (
                    <div>
                      <p className="text-sm text-gray-600">رقم السائق</p>
                      <p className="font-semibold">{request.driver_phone}</p>
                    </div>
                  )}
                  {request.vehicle_type && (
                    <div>
                      <p className="text-sm text-gray-600">نوع السيارة</p>
                      <p className="font-semibold">{request.vehicle_type}</p>
                    </div>
                  )}
                  {request.seats_count && (
                    <div>
                      <p className="text-sm text-gray-600">عدد المقاعد</p>
                      <p className="font-semibold">{request.seats_count}</p>
                    </div>
                  )}
                  {request.route_going && (
                    <div>
                      <p className="text-sm text-gray-600">خط السير (الذهاب)</p>
                      <p className="font-semibold">{request.route_going}</p>
                    </div>
                  )}
                  {request.route_return && (
                    <div>
                      <p className="text-sm text-gray-600">خط السير (الإياب)</p>
                      <p className="font-semibold">{request.route_return}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* السكن */}
            {request.hotel_name && (
              <div className="bg-gray-50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Hotel className="w-5 h-5" />
                  تفاصيل السكن
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">اسم الفندق</p>
                    <p className="font-semibold">{request.hotel_name}</p>
                  </div>
                  {request.hotel_location && (
                    <div>
                      <p className="text-sm text-gray-600">موقع الفندق</p>
                      <p className="font-semibold">{request.hotel_location}</p>
                    </div>
                  )}
                  {request.rooms_count && (
                    <div>
                      <p className="text-sm text-gray-600">عدد الغرف</p>
                      <p className="font-semibold">{request.rooms_count}</p>
                    </div>
                  )}
                  {request.nights_count && (
                    <div>
                      <p className="text-sm text-gray-600">عدد الليالي</p>
                      <p className="font-semibold">{request.nights_count}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* الدفع */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                معلومات الدفع
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">حالة العربون</p>
                  <p className={`font-semibold ${request.deposit_paid ? 'text-green-600' : 'text-red-600'}`}>
                    {request.deposit_paid ? '✓ مدفوع' : '✗ غير مدفوع'}
                  </p>
                </div>
                {request.deposit_amount && (
                  <div>
                    <p className="text-sm text-gray-600">مبلغ العربون</p>
                    <p className="font-semibold">{request.deposit_amount} $</p>
                  </div>
                )}
                {request.total_amount && (
                  <div>
                    <p className="text-sm text-gray-600">المبلغ الإجمالي</p>
                    <p className="font-semibold">{request.total_amount} $</p>
                  </div>
                )}
                {request.remaining_amount && (
                  <div>
                    <p className="text-sm text-gray-600">المبلغ المتبقي</p>
                    <p className="font-semibold">{request.remaining_amount} $</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <p>تاريخ الإنشاء: {new Date(request.created_at).toLocaleDateString('ar-SA')}</p>
              <p>آخر تحديث: {new Date(request.updated_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

