'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminStats from './admin/AdminStats'
import RequestFilters from './admin/RequestFilters'
import RequestCard from './admin/RequestCard'
import RequestDetailsModal from './admin/RequestDetailsModal'
import TripSchedulingModal from './admin/TripSchedulingModal'
import { VisitRequest, UserProfile, AdminStats as StatsType } from './admin/types'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [userProfiles, setUserProfiles] = useState<{ [key: string]: UserProfile }>({})
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null)
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      
      // التحقق من تسجيل الدخول أولاً
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('يجب تسجيل الدخول أولاً')
        router.push('/auth/login')
        return
      }

      // التحقق من أن المستخدم إداري
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle() // استخدام maybeSingle بدلاً من single لتجنب الخطأ إذا لم يكن موجود

      if (profileError) {
        console.error('Error checking admin role:', profileError)
        // إذا كان الخطأ بسبب عدم وجود profile، أنشئه
        if (profileError.code === 'PGRST116') {
          // Profile غير موجود، أنشئه كإداري
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.email?.split('@')[0] || 'Admin',
              role: 'admin'
            })
          
          if (insertError) {
            console.error('Error creating profile:', insertError)
            toast.error('خطأ في إنشاء الملف الشخصي')
            return
          }
        } else {
          toast.error('خطأ في التحقق من الصلاحيات')
          return
        }
      }

      // التحقق مرة أخرى بعد الإنشاء
      const { data: finalProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!finalProfile || finalProfile.role !== 'admin') {
        toast.error('ليس لديك صلاحية للوصول إلى لوحة الإدارة')
        console.error('User is not admin:', { 
          userId: user.id, 
          email: user.email,
          profile: finalProfile 
        })
        router.push('/dashboard')
        return
      }
      
      // تحميل جميع الطلبات
      const { data: requestsData, error: requestsError } = await supabase
        .from('visit_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (requestsError) {
        console.error('Error loading requests:', requestsError)
        console.error('Error details:', {
          message: requestsError.message,
          details: requestsError.details,
          hint: requestsError.hint,
          code: requestsError.code
        })
        toast.error(`خطأ في تحميل الطلبات: ${requestsError.message || 'خطأ غير معروف'}`)
        // لا نرمي الخطأ هنا، نترك requests فارغ
        setRequests([])
        return
      }

      // تحميل ملفات المستخدمين
      const userIds = Array.from(new Set((requestsData || []).map(r => r.user_id)))
      let profilesMap: { [key: string]: UserProfile } = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds)

        if (profilesError) {
          console.error('Error loading profiles:', profilesError)
          // لا نرمي خطأ هنا، فقط نسجل الخطأ
        } else if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap[profile.user_id] = profile
          })
        }
      }

      setRequests(requestsData || [])
      setUserProfiles(profilesMap)
    } catch (error: any) {
      console.error('Error in loadRequests:', error)
      toast.error(error.message || 'حدث خطأ أثناء تحميل الطلبات')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    toast.success('تم تسجيل الخروج بنجاح')
  }

  const handleRequestClick = (request: VisitRequest) => {
    setSelectedRequest(request)
    setSelectedUserProfile(userProfiles[request.user_id] || null)
  }

  const handleCloseModal = () => {
    setSelectedRequest(null)
    setSelectedUserProfile(null)
  }

  const handleScheduleTrip = (request: VisitRequest) => {
    setSchedulingRequest(request)
  }

  const handleCloseSchedulingModal = () => {
    setSchedulingRequest(null)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  // تصفية الطلبات
  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      !searchQuery ||
      request.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.city.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesType = typeFilter === 'all' || request.visit_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  // حساب الإحصائيات
  const stats: StatsType = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    underReview: requests.filter(r => r.status === 'under_review').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-green-600 to-green-700 rounded-b-xl"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600 drop-shadow-lg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  </div>
                  <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all">
                    منصة خدمات السوريين
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">لوحة تحكم الإدارة</p>
                  <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/dashboard"
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-700 hover:text-blue-600 transition"
              >
                لوحة المستخدم
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Stats */}
        <AdminStats stats={stats} />

        {/* Filters */}
        <RequestFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onTypeFilterChange={setTypeFilter}
          onClearFilters={handleClearFilters}
        />

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'لا توجد طلبات تطابق معايير البحث'
                    : 'لا توجد طلبات حالياً'}
                </h3>
                <p className="text-sm text-gray-600">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'جرب تغيير معايير البحث أو التصفية'
                    : 'سيتم عرض الطلبات هنا عند إنشائها من قبل المستخدمين'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                  جميع الطلبات ({filteredRequests.length})
                </h2>
                <p className="text-sm text-gray-600">
                  انقر على أي طلب لعرض التفاصيل والرد
                </p>
              </div>
              {filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  userProfile={userProfiles[request.user_id]}
                  onClick={() => handleRequestClick(request)}
                  onScheduleTrip={() => handleScheduleTrip(request)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Request Details Modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={selectedRequest}
          userProfile={selectedUserProfile}
          onClose={handleCloseModal}
          onUpdate={loadRequests}
        />
      )}

      {/* Trip Scheduling Modal */}
      {schedulingRequest && (
        <TripSchedulingModal
          request={schedulingRequest}
          onClose={handleCloseSchedulingModal}
          onUpdate={loadRequests}
          isAdmin={true}
        />
      )}
    </div>
  )
}
