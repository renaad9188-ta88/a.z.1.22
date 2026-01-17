'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  LogOut, 
  FileText, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Plus,
  MapPin,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  ArrowLeft,
  Trash2,
  Plane
} from 'lucide-react'
import TripSchedulingModal from './admin/TripSchedulingModal'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'

interface VisitRequest {
  id: string
  user_id: string
  visitor_name: string
  visit_type: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy'
  travel_date: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
  city: string
  days_count: number
  arrival_date: string | null
  departure_date: string | null
  trip_status: 'pending_arrival' | 'scheduled_pending_approval' | 'arrived' | 'completed' | null
  assigned_to?: string | null
}

export default function DashboardContent({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileError) {
        console.error('Error loading profile:', profileError)
      }
      setUserProfile(profile || null)

      // Load visit requests (فقط الحقول المطلوبة لتحسين الأداء)
      const { data: visitRequests, error } = await supabase
        .from('visit_requests')
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, created_at, updated_at, deposit_paid, deposit_amount, payment_verified, assigned_to')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRequests(visitRequests || [])
    } catch (error: any) {
      toast.error('حدث خطأ أثناء تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('visit_requests')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      toast.success('تم حذف الطلب بنجاح')
      loadData()
    } catch (error: any) {
      toast.error('حدث خطأ أثناء حذف الطلب')
    }
  }

  const getStatusBadge = (status: string, tripStatus: string | null) => {
    // إذا كان الطلب منتهياً، اعرض "منتهي"
    if (status === 'completed' || tripStatus === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-800 text-white">
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>منتهي</span>
        </span>
      )
    }

    const statusMap: Record<string, { text: string; color: string; icon: any }> = {
      pending: { text: 'تم الاستلام', color: 'bg-amber-100 text-amber-900', icon: Clock },
      under_review: { text: 'قيد المراجعة', color: 'bg-purple-100 text-purple-900', icon: Clock },
      approved: { text: 'مقبول', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>{statusInfo.text}</span>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full overflow-x-hidden">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">إجمالي الطلبات</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{requests.length}</p>
              </div>
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">مكتملة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">
                  {requests.filter(r => r.status === 'approved' || r.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">قيد المراجعة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">
                  {requests.filter(r => r.status === 'pending' || r.status === 'under_review').length}
                </p>
              </div>
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-yellow-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">مرفوضة</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-red-600 opacity-20 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-5">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-2">
              خدماتنا
            </h2>
            <div className="w-20 sm:w-24 h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mx-auto mb-2"></div>
            <p className="text-xs sm:text-sm text-gray-600">
              اختر الخدمة التي تحتاجها
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* خدمة الزيارات السورية للأردن */}
            <Link
              href="/services/jordan-visit"
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 border border-gray-100 hover:border-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                    🇯🇴
                  </span>
                  <div className="bg-blue-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                  خدمات الزيارات السورية للأردن
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                  زيارة الأردن لمدة شهر - تنظيم جميع الإجراءات
                </p>
                <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                  <span>ابدأ الآن</span>
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>

            {/* خدمة مقابلة السفارة */}
            <Link
              href="/services/embassy-appointment"
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 border border-gray-100 hover:border-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                    🏛️
                  </span>
                  <div className="bg-green-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-green-600 transition-colors leading-tight">
                  خدمات مقابلة السفارة
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                  حجز مواعيد السفارة وتنظيم جميع المستندات المطلوبة
                </p>
                <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-green-600 transition-colors">
                  <span>ابدأ الآن</span>
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-green-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>

            {/* خدمة امتحان جوته */}
            <Link
              href="/services/goethe-exam"
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 border border-gray-100 hover:border-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                    🎓
                  </span>
                  <div className="bg-purple-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-purple-600 transition-colors leading-tight">
                  خدمة تقديم لامتحان جوته
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                  التسجيل في امتحان جوته وتنظيم جميع الإجراءات
                </p>
                <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-purple-600 transition-colors">
                  <span>ابدأ الآن</span>
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>

            {/* خدمات أخرى */}
            <Link
              href="/services/other"
              className="group relative bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1 border border-gray-100 hover:border-gray-200"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-2xl sm:text-3xl transform group-hover:scale-110 transition-transform duration-300">
                    ✨
                  </span>
                  <div className="bg-orange-50 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                </div>
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-1.5 sm:mb-2 group-hover:text-orange-600 transition-colors leading-tight">
                  خدمات أخرى
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                  اطلب خدمة مخصصة أو تواصل معنا مباشرة
                </p>
                <div className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-orange-600 transition-colors">
                  <span>ابدأ الآن</span>
                  <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </Link>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">طلباتي</h2>
          </div>
          {requests.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">لا توجد طلبات حتى الآن</p>
              <Link
                href="/request-visit"
                className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-semibold"
              >
                إنشاء طلب جديد
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {requests.map((request) => (
                <div key={request.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-2">
                        <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 break-words">{request.visitor_name}</h3>
                        <div className="flex-shrink-0">{getStatusBadge(request.status, request.trip_status)}</div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="break-words">نوع الزيارة: {getVisitTypeText(request.visit_type)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="break-words">المدينة: {request.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="break-words">تاريخ السفر: {formatDate(request.travel_date)}</span>
                        </div>
                        {request.arrival_date && (
                          <div className="flex items-center gap-2">
                            <Plane className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-blue-600" />
                            <span className="break-words text-blue-700 font-medium">تاريخ القدوم: {formatDate(request.arrival_date)}</span>
                          </div>
                        )}
                        {request.departure_date && (
                          <div className="flex items-center gap-2">
                            <Plane className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 text-green-600 rotate-180" />
                            <span className="break-words text-green-700 font-medium">تاريخ المغادرة: {formatDate(request.departure_date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="break-words">عدد الأيام: {request.days_count}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 md:col-span-1">
                          <span className="break-words">تاريخ الطلب: {formatDate(request.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Link
                        href={`/dashboard/request/${request.id}`}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold text-center"
                      >
                        عرض التفاصيل
                      </Link>
                      {/* زر حجز الرحلة - فعال للمقبولة، غير فعال للقيد الإجراء */}
                      {request.visit_type === 'visit' && (
                        <button
                          onClick={() => setSchedulingRequest(request)}
                          disabled={
                            request.status !== 'approved' || 
                            !(request as any).payment_verified ||
                            request.trip_status === 'completed' ||
                            request.trip_status === 'arrived'
                          }
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg transition text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 ${
                            request.status === 'approved' && 
                            (request as any).payment_verified &&
                            request.trip_status !== 'completed' && 
                            request.trip_status !== 'arrived'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          title={
                            request.status !== 'approved'
                              ? 'يجب الموافقة على الطلب أولاً'
                              : !(request as any).payment_verified
                              ? 'بانتظار تأكيد الدفعة لفتح الحجز'
                              : request.trip_status === 'completed' || request.trip_status === 'arrived'
                              ? 'الرحلة منتهية أو بدأت'
                              : 'حجز موعد الرحلة'
                          }
                        >
                          <Plane className="w-3 h-3 sm:w-4 sm:h-4" />
                          {request.trip_status === 'scheduled_pending_approval'
                            ? 'الحجز بانتظار الموافقة'
                            : request.arrival_date
                            ? 'تعديل موعد الرحلة'
                            : 'حجز موعد الرحلة'}
                        </button>
                      )}
                      {(request.status === 'completed' || request.trip_status === 'completed') && (
                        <button
                          onClick={() => handleDeleteRequest(request.id)}
                          className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trip Scheduling Modal */}
      {schedulingRequest && (
        <TripSchedulingModal
          request={schedulingRequest}
          onClose={() => setSchedulingRequest(null)}
          onUpdate={loadData}
          isAdmin={false}
        />
      )}
    </div>
  )
}

