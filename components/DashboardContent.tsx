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
  Mail
} from 'lucide-react'
import toast from 'react-hot-toast'

interface VisitRequest {
  id: string
  visitor_name: string
  visit_type: string
  travel_date: string
  status: string
  created_at: string
  city: string
  days_count: number
}

export default function DashboardContent({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    try {
      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      setUserProfile(profile)

      // Load visit requests
      const { data: visitRequests, error } = await supabase
        .from('visit_requests')
        .select('*')
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
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
                {/* شعار جميل - نفس الشعار من Header */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center">
                  {/* خلفية متدرجة بألوان علم سوريا مع تأثير ثلاثي الأبعاد */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
                  {/* طبقة بيضاء في الوسط */}
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
                  {/* طبقة خضراء في الأسفل */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-green-600 to-green-700 rounded-b-xl"></div>
                  {/* نجمة بيضاء تمثل الوحدة */}
                  <div className="relative z-10 flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 drop-shadow-lg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  </div>
                  {/* حلقة خارجية ذهبية */}
                  <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all">
                    منصة خدمات السوريين
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">لوحة التحكم</p>
                  <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="text-right">
                <p className="text-sm sm:text-base font-semibold break-words">{userProfile?.full_name || 'المستخدم'}</p>
                <p className="text-xs sm:text-sm text-gray-600 break-words">{userProfile?.phone || ''}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm sm:text-base"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
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
                  {requests.filter(r => r.status === 'approved').length}
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

        {/* Quick Actions */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">إجراءات سريعة</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:gap-4">
            <Link
              href="/request-visit"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-semibold"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>طلب زيارة جديد</span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm sm:text-base font-semibold"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>تواصل معنا</span>
            </Link>
            <Link
              href="/map"
              className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm sm:text-base font-semibold"
            >
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>الخريطة التفاعلية</span>
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
                        <div className="flex-shrink-0">{getStatusBadge(request.status)}</div>
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
                          <span className="break-words">تاريخ السفر: {new Date(request.travel_date).toLocaleDateString('ar-SA')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="break-words">عدد الأيام: {request.days_count}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:col-span-2 md:col-span-1">
                          <span className="break-words">تاريخ الطلب: {new Date(request.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/request/${request.id}`}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold text-center"
                    >
                      عرض التفاصيل
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

