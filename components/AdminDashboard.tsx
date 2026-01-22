'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText, Users, X, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminStats from './admin/AdminStats'
import RequestFilters from './admin/RequestFilters'
import RequestCard from './admin/RequestCard'
import RequestDetailsModal from './admin/RequestDetailsModal'
import TripSchedulingModal from './admin/TripSchedulingModal'
import RouteManagement from './admin/RouteManagement'
import SupervisorsManagement from './admin/SupervisorsManagement'
import InvitesManagement from './admin/InvitesManagement'
import CustomersManagement from './admin/CustomersManagement'
import BookingsManagement from './admin/BookingsManagement'
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
  const [showInvitesManagement, setShowInvitesManagement] = useState(false)
  const [showCustomersManagement, setShowCustomersManagement] = useState(false)
  const [showBookingsManagement, setShowBookingsManagement] = useState(false)
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({})
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkAssignSupervisor, setBulkAssignSupervisor] = useState('')
  const [bulkAssignType, setBulkAssignType] = useState<'all' | 'visit' | 'goethe' | 'embassy' | 'umrah' | 'tourism'>('all')
  const [bulkAssignStatus, setBulkAssignStatus] = useState<'all' | 'pending' | 'under_review' | 'approved'>('all')
  const [supervisors, setSupervisors] = useState<Array<{ user_id: string; full_name: string | null; phone: string | null }>>([])
  const [bulkAssigning, setBulkAssigning] = useState(false)

  // تحميل قائمة المشرفين
  const loadSupervisors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .eq('role', 'supervisor')
        .order('full_name', { ascending: true })

      if (error) {
        console.error('Error loading supervisors:', error)
        return
      }

      setSupervisors((data || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
      })))
    } catch (e: any) {
      console.error('Error in loadSupervisors:', e)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  useEffect(() => {
    if (currentRole === 'admin') {
      loadSupervisors()
    }
  }, [currentRole])

  // دالة للتنقل بين الأقسام مع إغلاق الأقسام الأخرى والتمرير إلى الأعلى
  const navigateToSection = (section: 'routes' | 'invites' | 'customers' | 'supervisors' | 'requests' | 'bookings') => {
    // إغلاق جميع الأقسام أولاً
    setShowRouteManagement(false)
    setShowSupervisorsManagement(false)
    setShowInvitesManagement(false)
    setShowCustomersManagement(false)
    setShowBookingsManagement(false)

        // فتح القسم المطلوب
        if (section === 'routes') {
          setShowRouteManagement(true)
        } else if (section === 'invites') {
          setShowInvitesManagement(true)
        } else if (section === 'customers') {
          setShowCustomersManagement(true)
        } else if (section === 'supervisors') {
          setShowSupervisorsManagement(true)
        } else if (section === 'bookings') {
          setShowBookingsManagement(true)
        }

    // التمرير إلى أعلى الصفحة بعد تحديث الـ DOM
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // على الموبايل، قد نحتاج إلى تمرير إضافي
      const header = document.querySelector('header')
      if (header) {
        header.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  // التمرير إلى الأعلى عند تغيير أي قسم
  useEffect(() => {
    if (showRouteManagement || showInvitesManagement || showCustomersManagement || showSupervisorsManagement || showBookingsManagement) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        const header = document.querySelector('header')
        if (header) {
          header.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }, [showRouteManagement, showInvitesManagement, showCustomersManagement, showSupervisorsManagement, showBookingsManagement])

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

      // تحميل ملفات المستخدمين
      const visibleRequests = (requestsData || []) as any[]

      // تحميل ملفات المستخدمين (لكل الطلبات، بما فيها المسودات)
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

      // ملاحظة: المشرف يرى فقط الطلبات المعيّنة له (المسودات عادة لا تكون معيّنة)
      const scoped = isSupervisor
        ? (visibleRequests || []).filter((r: any) => (r?.assigned_to || null) === user.id && !String((r?.admin_notes || '') as string).startsWith('[DRAFT]'))
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

  // التعيين الجماعي للطلبات
  const handleBulkAssign = async () => {
    if (!bulkAssignSupervisor) {
      toast.error('اختر مشرفاً')
      return
    }

    try {
      setBulkAssigning(true)

      const { data: { user: adminUser } } = await supabase.auth.getUser()
      if (!adminUser) {
        toast.error('يجب تسجيل الدخول')
        return
      }

      // بناء query للطلبات المطلوبة
      let query = supabase
        .from('visit_requests')
        .select('id, visitor_name')
        .is('assigned_to', null) // فقط الطلبات غير المعيّنة

      if (bulkAssignType !== 'all') {
        query = query.eq('visit_type', bulkAssignType)
      }

      if (bulkAssignStatus !== 'all') {
        query = query.eq('status', bulkAssignStatus)
      }

      const { data: requests, error } = await query

      if (error) throw error

      if (!requests || requests.length === 0) {
        toast('لا توجد طلبات تطابق المعايير المحددة')
        return
      }

      // تعيين جميع الطلبات
      const { error: updateError } = await supabase
        .from('visit_requests')
        .update({
          assigned_to: bulkAssignSupervisor,
          assigned_by: adminUser.id,
          assigned_at: new Date().toISOString(),
        })
        .in('id', requests.map((r) => r.id))

      if (updateError) throw updateError

      toast.success(`تم تعيين ${requests.length} طلب للمشرف بنجاح`)

      // إرسال إشعارات للمشرف
      const { notifySupervisorAssigned } = await import('@/lib/notifications')
      for (const req of requests) {
        await notifySupervisorAssigned(bulkAssignSupervisor, req.id, req.visitor_name || 'زائر')
      }

      setShowBulkAssign(false)
      setBulkAssignSupervisor('')
      setBulkAssignType('all')
      setBulkAssignStatus('all')
      await loadRequests()
    } catch (e: any) {
      console.error('Bulk assign error:', e)
      toast.error(e?.message || 'تعذر التعيين الجماعي')
    } finally {
      setBulkAssigning(false)
    }
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

    const notes = (request.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isNew = request.status === 'pending' && !isDraft && (Date.now() - new Date(request.created_at).getTime()) < 24 * 60 * 60 * 1000
    const isReceived = request.status === 'pending'
    const isInProgress = request.status === 'approved' && (request.trip_status === 'pending_arrival' || request.trip_status === 'arrived')
    const isBooking = Boolean(request.trip_status) || Boolean(request.arrival_date) || Boolean(request.departure_date)

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'drafts'
          ? isDraft
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
    // ملاحظة: نعتبر المسودات "غير مكتملة" وهي ظاهرة فقط للإدمن (ليس المشرف)
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
              <div className="flex flex-col min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-extrabold text-gray-900 leading-tight truncate">
                  {currentRole === 'supervisor' ? 'لوحة المشرف' : 'لوحة تحكم الإدارة'}
                </h1>
                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 truncate">
                  إدارة الطلبات والخطوط
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto justify-end sm:justify-start">
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showRouteManagement) {
                      navigateToSection('requests')
                    } else {
                      navigateToSection('routes')
                    }
                  }}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition ${
                    showRouteManagement ? 'text-blue-600 font-bold' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  إدارة الخطوط
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showInvitesManagement) {
                      navigateToSection('requests')
                    } else {
                      navigateToSection('invites')
                    }
                  }}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition ${
                    showInvitesManagement ? 'text-blue-600 font-bold' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  الدعوات
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showCustomersManagement) {
                      navigateToSection('requests')
                    } else {
                      navigateToSection('customers')
                    }
                  }}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition ${
                    showCustomersManagement ? 'text-blue-600 font-bold' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  المنتسبين
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showSupervisorsManagement) {
                      navigateToSection('requests')
                    } else {
                      navigateToSection('supervisors')
                    }
                  }}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition ${
                    showSupervisorsManagement ? 'text-blue-600 font-bold' : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  المشرفين
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowBulkAssign(true)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-bold flex items-center gap-1.5 sm:gap-2"
                  title="تعيين طلبات متعددة لمشرف"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">تعيين جماعي</span>
                  <span className="sm:hidden">جماعي</span>
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showBookingsManagement) {
                      navigateToSection('requests')
                    } else {
                      navigateToSection('bookings')
                    }
                  }}
                  className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base transition font-bold flex items-center gap-1.5 sm:gap-2 ${
                    showBookingsManagement
                      ? 'bg-amber-600 text-white rounded-lg'
                      : 'bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 border border-amber-200'
                  }`}
                  title="إدارة الحجوزات والرحلات"
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">الحجوزات</span>
                  <span className="sm:hidden">حجوزات</span>
                </button>
              )}
              <Link
                href="/admin/profile"
                className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition"
              >
                {currentRole === 'supervisor' ? 'إعدادات المشرف' : 'إعدادات الإدمن'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-6 max-w-full">
        {/* Route Management */}
        {showRouteManagement ? (
          <div className="mb-6" key="route-management">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الخطوط والسائقين</h2>
              <button
                onClick={() => navigateToSection('requests')}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs sm:text-sm md:text-base inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">العودة للطلبات</span>
                <span className="sm:hidden">الطلبات</span>
              </button>
            </div>
            <RouteManagement />
          </div>
        ) : showInvitesManagement ? (
          <div className="mb-6" key="invites-management">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">الدعوات</h2>
              <button
                onClick={() => navigateToSection('requests')}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs sm:text-sm md:text-base inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">العودة للطلبات</span>
                <span className="sm:hidden">الطلبات</span>
              </button>
            </div>
            <InvitesManagement />
          </div>
        ) : showCustomersManagement ? (
          <div className="mb-6" key="customers-management">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">العملاء / المنتسبين</h2>
              <button
                onClick={() => navigateToSection('requests')}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs sm:text-sm md:text-base inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">العودة للطلبات</span>
                <span className="sm:hidden">الطلبات</span>
              </button>
            </div>
            <CustomersManagement />
          </div>
        ) : showSupervisorsManagement ? (
          <div className="mb-6" key="supervisors-management">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة المشرفين</h2>
              <button
                onClick={() => navigateToSection('requests')}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs sm:text-sm md:text-base inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">العودة للطلبات</span>
                <span className="sm:hidden">الطلبات</span>
              </button>
            </div>
            <SupervisorsManagement />
          </div>
        ) : showBookingsManagement ? (
          <div className="mb-6" key="bookings-management">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الحجوزات والرحلات</h2>
              <button
                onClick={() => navigateToSection('requests')}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-xs sm:text-sm md:text-base inline-flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">العودة للطلبات</span>
                <span className="sm:hidden">الطلبات</span>
              </button>
            </div>
            <BookingsManagement />
          </div>
        ) : (
          <div key="requests-section">
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
        <div className="space-y-3 sm:space-y-4 md:space-y-5">
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
                            <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
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
          </div>
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

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                تعيين طلبات متعددة لمشرف
              </h3>
              <button
                onClick={() => {
                  setShowBulkAssign(false)
                  setBulkAssignSupervisor('')
                  setBulkAssignType('all')
                  setBulkAssignStatus('all')
                }}
                className="text-gray-400 hover:text-gray-600 transition"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  المشرف
                </label>
                <select
                  value={bulkAssignSupervisor}
                  onChange={(e) => setBulkAssignSupervisor(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white"
                >
                  <option value="">اختر مشرفاً</option>
                  {supervisors.length === 0 ? (
                    <option disabled>لا يوجد مشرفين متاحين</option>
                  ) : (
                    supervisors.map((s) => (
                      <option key={s.user_id} value={s.user_id}>
                        {s.full_name || 'مشرف'} — {s.phone || 'لا يوجد رقم'}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  نوع الطلب
                </label>
                <select
                  value={bulkAssignType}
                  onChange={(e) => setBulkAssignType(e.target.value as any)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white"
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="visit">الزيارات فقط</option>
                  <option value="goethe">جوته</option>
                  <option value="embassy">السفارة</option>
                  <option value="umrah">عمرة</option>
                  <option value="tourism">سياحة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                  حالة الطلب
                </label>
                <select
                  value={bulkAssignStatus}
                  onChange={(e) => setBulkAssignStatus(e.target.value as any)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm sm:text-base bg-white"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="pending">مستلم</option>
                  <option value="under_review">قيد المراجعة</option>
                  <option value="approved">مقبول</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs sm:text-sm text-gray-700">
                <p className="font-bold mb-1">ملاحظة:</p>
                <p>سيتم تعيين جميع الطلبات غير المعيّنة التي تطابق المعايير المحددة للمشرف المختار.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkAssignSupervisor || bulkAssigning}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  {bulkAssigning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>جاري التعيين...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>تعيين</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowBulkAssign(false)
                    setBulkAssignSupervisor('')
                    setBulkAssignType('all')
                    setBulkAssignStatus('all')
                  }}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-bold text-sm sm:text-base"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
