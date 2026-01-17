'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminStats from './admin/AdminStats'
import RequestFilters from './admin/RequestFilters'
import RequestCard from './admin/RequestCard'
import RequestDetailsModal from './admin/RequestDetailsModal'
import TripSchedulingModal from './admin/TripSchedulingModal'
import RouteManagement from './admin/RouteManagement'
import SupervisorsManagement from './admin/SupervisorsManagement'
import NotificationsDropdown from './NotificationsDropdown'
import { VisitRequest, UserProfile, AdminStats as StatsType } from './admin/types'
import { ChevronDown, Layers } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<'admin' | 'supervisor' | 'other'>('other')
  const [showRouteManagement, setShowRouteManagement] = useState(false)
  const [showSupervisorsManagement, setShowSupervisorsManagement] = useState(false)
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadRequests()
  }, [])

  // فتح الطلب تلقائياً إذا جاء من إشعار داخل لوحة الإدارة
  useEffect(() => {
    if (loading) return

    const requestId = searchParams.get('request')
    const tripId = searchParams.get('trip')
    const targetId = requestId || tripId
    if (!targetId) return

    const found = requests.find(r => r.id === targetId)
    if (!found) return

    if (requestId) {
      setSelectedRequest(found)
      setSelectedUserProfile(userProfiles[found.user_id] || null)
    } else if (tripId) {
      setSchedulingRequest(found)
    }
    // نزيل الباراميتر من الرابط حتى ما يفتح كل مرة عند تحديث الصفحة
    router.replace('/admin')
  }, [loading, requests, userProfiles, router, searchParams])

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

      setCurrentUserId(user.id)

      // التحقق من أن المستخدم إداري
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle() // استخدام maybeSingle بدلاً من single لتجنب الخطأ إذا لم يكن موجود

      if (profileError) {
        console.error('Error checking admin role:', profileError)
        toast.error('خطأ في التحقق من الصلاحيات')
        return
      }

      const role = ((profile?.role || '') as string).toLowerCase()
      const isAdmin = role === 'admin'
      const isSupervisor = role === 'supervisor'
      setCurrentRole(isAdmin ? 'admin' : isSupervisor ? 'supervisor' : 'other')

      if (!profile || (!isAdmin && !isSupervisor)) {
        toast.error('ليس لديك صلاحية للوصول إلى لوحة الإدارة')
        console.error('User is not admin/supervisor:', { 
          userId: user.id, 
          email: user.email,
          profile: profile 
        })
        router.push('/dashboard')
        return
      }
      
      // تحميل جميع الطلبات (قائمة خفيفة لتحسين الأداء)
      const { data: requestsData, error: requestsError } = await supabase
        .from('visit_requests')
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, created_at, updated_at, admin_notes, companions_count, deposit_paid, deposit_amount, total_amount, remaining_amount, payment_verified, assigned_to, assigned_by, assigned_at')
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

      // إخفاء الطلبات غير المرسلة (Draft) من لوحة الإدارة
      const visibleRequests = (requestsData || []).filter((r: any) => {
        const notes = (r?.admin_notes || '') as string
        return !notes.startsWith('[DRAFT]')
      })

      // تحميل ملفات المستخدمين
      const userIds = Array.from(new Set((visibleRequests || []).map((r: any) => r.user_id)))
      let profilesMap: { [key: string]: UserProfile } = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, jordan_phone, whatsapp_phone')
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

      const scoped = isSupervisor
        ? (visibleRequests || []).filter((r: any) => (r?.assigned_to || null) === user.id)
        : (visibleRequests || [])

      setRequests(scoped || [])
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

  const handleRequestClick = async (request: VisitRequest) => {
    try {
      // Fetch full request row for the modal (images/companions/etc) only when needed
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', request.id)
        .single()
      if (error) throw error
      setSelectedRequest((data as any) || request)
      setSelectedUserProfile(userProfiles[request.user_id] || null)
    } catch (e: any) {
      console.error('Error loading request details:', e)
      toast.error(e?.message || 'تعذر فتح تفاصيل الطلب')
    }
  }

  const handleCloseModal = () => {
    setSelectedRequest(null)
    setSelectedUserProfile(null)
  }

  const handleScheduleTrip = async (request: VisitRequest) => {
    try {
      const { data, error } = await supabase
        .from('visit_requests')
        .select('*')
        .eq('id', request.id)
        .single()
      if (error) throw error
      setSchedulingRequest((data as any) || request)
    } catch (e: any) {
      console.error('Error loading request for scheduling:', e)
      toast.error(e?.message || 'تعذر فتح نافذة الحجز')
    }
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

    const isNew = request.status === 'pending' && (Date.now() - new Date(request.created_at).getTime()) < 24 * 60 * 60 * 1000
    const isReceived = request.status === 'pending'
    const isInProgress = request.status === 'approved' && (request.trip_status === 'pending_arrival' || request.trip_status === 'arrived')
    const isBooking = Boolean(request.trip_status) || Boolean(request.arrival_date) || Boolean(request.departure_date)

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'new'
          ? isNew
          : statusFilter === 'received'
            ? isReceived
            : statusFilter === 'in_progress'
              ? isInProgress
              : statusFilter === 'bookings'
                ? isBooking
                : request.status === statusFilter
    const matchesType = typeFilter === 'all' || request.visit_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      visit: 'الزيارات',
      umrah: 'العمرة',
      tourism: 'السياحة',
      goethe: 'امتحان جوته',
      embassy: 'موعد سفارة',
    }
    return map[t] || t
  }

  const typeOrder = ['visit', 'goethe', 'embassy', 'umrah', 'tourism']
  const groupedByType = (list: VisitRequest[]) => {
    const groups: Record<string, VisitRequest[]> = {}
    for (const r of list) {
      const t = (r.visit_type || 'visit') as any
      if (!groups[t]) groups[t] = []
      groups[t].push(r)
    }
    return groups
  }

  // حساب الإحصائيات
  const stats: StatsType = {
    total: requests.length,
    newRequests: requests.filter(r => r.status === 'pending' && (Date.now() - new Date(r.created_at).getTime()) < 24 * 60 * 60 * 1000).length,
    received: requests.filter(r => r.status === 'pending').length,
    underReview: requests.filter(r => r.status === 'under_review').length,
    inProgress: requests.filter(r => r.status === 'approved' && (r.trip_status === 'pending_arrival' || r.trip_status === 'arrived')).length,
    bookings: requests.filter(r => Boolean(r.trip_status) || Boolean(r.arrival_date) || Boolean(r.departure_date)).length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    completed: requests.filter(r => r.status === 'completed' || r.trip_status === 'completed').length,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-md rounded-xl w-full">
        <div className="container mx-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 max-w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 flex-1">
              <Link href="/" className="flex items-center gap-1 sm:gap-1.5 md:gap-2 group min-w-0">
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-red-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105"></div>
                  <div className="absolute inset-[2px] bg-gradient-to-br from-white to-gray-50 rounded-lg"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-green-600 to-green-700 rounded-b-xl"></div>
                  <div className="relative z-10 flex items-center justify-center">
                    <svg 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-red-600 drop-shadow-lg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                  </div>
                  <div className="absolute -inset-0.5 border-2 border-yellow-400/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold bg-gradient-to-r from-red-600 via-gray-800 to-green-600 bg-clip-text text-transparent leading-tight group-hover:from-red-500 group-hover:to-green-500 transition-all truncate">
                    منصة خدمات السوريين
                  </h1>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate">
                    {currentRole === 'supervisor' ? 'لوحة المشرف' : 'لوحة تحكم الإدارة'}
                  </p>
                  <div className="h-0.5 bg-gradient-to-r from-red-500 via-yellow-400 to-green-600 rounded-full mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Link>
            </div>
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto justify-end sm:justify-start">
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowRouteManagement(!showRouteManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition whitespace-nowrap"
                >
                  إدارة الخطوط
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowSupervisorsManagement(!showSupervisorsManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition whitespace-nowrap"
                >
                  المشرفين
                </button>
              )}
              <Link
                href="/admin/profile"
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition whitespace-nowrap"
              >
                {currentRole === 'supervisor' ? 'إعدادات المشرف' : 'إعدادات الإدمن'}
              </Link>
              {currentUserId && (
                <NotificationsDropdown userId={currentUserId} />
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-red-600 hover:bg-red-50 rounded-lg transition whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        {/* Route Management */}
        {showRouteManagement ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">إدارة الخطوط والسائقين</h2>
              <button
                onClick={() => setShowRouteManagement(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                العودة للطلبات
              </button>
            </div>
            <RouteManagement />
          </div>
        ) : showSupervisorsManagement ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">إدارة المشرفين</h2>
              <button
                onClick={() => setShowSupervisorsManagement(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                العودة للطلبات
              </button>
            </div>
            <SupervisorsManagement />
          </div>
        ) : (
          <>
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
        <div className="space-y-3 sm:space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8 lg:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-2">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'لا توجد طلبات تطابق معايير البحث'
                    : 'لا توجد طلبات حالياً'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 px-2">
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'جرب تغيير معايير البحث أو التصفية'
                    : 'سيتم عرض الطلبات هنا عند إنشائها من قبل المستخدمين'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                  جميع الطلبات ({filteredRequests.length})
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  انقر على أي طلب لعرض التفاصيل والرد
                </p>
              </div>

              {/* Grouped view when typeFilter == all (easier when there are many requests) */}
              {typeFilter === 'all' ? (
                <div className="space-y-4">
                  {(() => {
                    const groups = groupedByType(filteredRequests)
                    const types = [
                      ...typeOrder.filter(t => (groups[t] || []).length > 0),
                      ...Object.keys(groups).filter(t => !typeOrder.includes(t)).sort(),
                    ]
                    return types.map((t) => {
                      const list = groups[t] || []
                      const isCollapsed = Boolean(collapsedTypes[t])
                      return (
                        <div key={t} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setCollapsedTypes(prev => ({ ...prev, [t]: !prev[t] }))}
                            className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Layers className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <span className="font-extrabold text-gray-800 truncate">
                                {typeLabel(t)}
                              </span>
                              <span className="text-xs font-bold tabular-nums px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 flex-shrink-0">
                                {list.length}
                              </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
                          </button>

                          {!isCollapsed && (
                            <div className="p-3 sm:p-4 space-y-3">
                              {list.map((request, idx) => (
                                <RequestCard
                                  key={request.id}
                                  request={request}
                                  userProfile={userProfiles[request.user_id]}
                                  onClick={() => handleRequestClick(request)}
                                  onScheduleTrip={() => handleScheduleTrip(request)}
                                  index={idx}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              ) : (
                filteredRequests.map((request, index) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    userProfile={userProfiles[request.user_id]}
                    onClick={() => handleRequestClick(request)}
                    onScheduleTrip={() => handleScheduleTrip(request)}
                    index={index}
                  />
                ))
              )}
            </>
          )}
        </div>
          </>
        )}
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
