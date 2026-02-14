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
import InvitesManagement from './admin/InvitesManagement'
import CustomersManagement from './admin/CustomersManagement'
import BookingsManagement from './admin/BookingsManagement'
import { VisitRequest, UserProfile, AdminStats as StatsType } from './admin/types'
import { ChevronDown, Layers, Calendar, Building2, MessageCircle, Phone, Plane, Ticket, MapPin } from 'lucide-react'
import QRCodeShare from './QRCodeShare'
import { parseAdminNotes } from './request-details/utils'
import { formatDate } from '@/lib/date-utils'

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
  const [tripBookingsStats, setTripBookingsStats] = useState<Array<{
    trip_id: string
    trip_date: string
    trip_type: 'arrival' | 'departure' | null
    passengers_count: number
    requests_count: number
    bookings: Array<{
      id: string
      visitor_name: string
      user_id: string
      companions_count: number
      arrival_date: string | null
      days_count: number
      city: string
    }>
    expected_departure_date?: string | null
  }>>([])
  const [selectedTripForDetails, setSelectedTripForDetails] = useState<{
    trip_id: string
    trip_date: string
    trip_type: 'arrival' | 'departure' | null
    bookings: Array<{
      id: string
      visitor_name: string
      user_id: string
      companions_count: number
      arrival_date: string | null
      days_count: number
      city: string
    }>
  } | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  // جلب إحصائيات الرحلات
  useEffect(() => {
    if (!loading && currentRole === 'admin') {
      loadTripBookingsStats()
    }
  }, [loading, currentRole])

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
      
      // تحديد الإشعارات المرتبطة بهذا الطلب كمقروءة
      if (currentUserId) {
        ;(async () => {
          try {
            await supabase
              .from('notifications')
              .update({ 
                is_read: true,
                read_at: new Date().toISOString()
              })
              .eq('user_id', currentUserId)
              .eq('related_type', 'request')
              .eq('related_id', requestId)
              .eq('is_read', false)
          } catch (error) {
            console.error('Error marking request notifications as read:', error)
          }
        })()
      }
    } else if (tripId) {
      setSchedulingRequest(found)
      
      // تحديد الإشعارات المرتبطة بهذه الرحلة كمقروءة
      if (currentUserId) {
        ;(async () => {
          try {
            await supabase
              .from('notifications')
              .update({ 
                is_read: true,
                read_at: new Date().toISOString()
              })
              .eq('user_id', currentUserId)
              .eq('related_type', 'trip')
              .eq('related_id', tripId)
              .eq('is_read', false)
          } catch (error) {
            console.error('Error marking trip notifications as read:', error)
          }
        })()
      }
    }
    
    // نزيل الباراميتر من الرابط حتى ما يفتح كل مرة عند تحديث الصفحة
    router.replace('/admin')
  }, [loading, requests, userProfiles, router, searchParams, currentUserId, supabase])

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
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, trip_id, created_at, updated_at, admin_notes, companions_count, deposit_paid, deposit_amount, total_amount, remaining_amount, payment_verified, assigned_to, assigned_by, assigned_at')
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
    const isBooking = Boolean(request.trip_id)

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
      visa: 'الفيز والتأشيرات والرحلات',
    }
    return map[t] || t
  }

  const getFilterTitle = () => {
    const filterLabels: Record<string, string> = {
      all: 'جميع الطلبات',
      new: 'طلبات جديدة (24 ساعة)',
      received: 'الطلبات المستلمة',
      in_progress: 'الطلبات قيد الإجراء',
      approved: 'الطلبات الموافق عليها',
      rejected: 'الطلبات المرفوضة',
      bookings: 'حجوزات الطلبات',
      drafts: 'المسودات',
      under_review: 'قيد المراجعة',
    }
    return filterLabels[statusFilter] || 'الطلبات'
  }

  // دالة للرد السريع على طلبات السفارة
  const handleQuickResponse = async (request: VisitRequest, responseText: string) => {
    try {
      const stamp = new Date().toISOString()
      const section = `\n\n=== رد الإدارة ===\n${responseText}\nتاريخ الرد: ${stamp}`
      const updatedNotes = ((request.admin_notes || '') as string) + section
      
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          admin_notes: updatedNotes, 
          updated_at: new Date().toISOString() 
        } as any)
        .eq('id', request.id)
      
      if (error) throw error
      
      // إرسال إشعار للمستخدم
      try {
        const { notifyCustomMessage } = await import('@/lib/notifications')
        await notifyCustomMessage(request.user_id, request.id, responseText)
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr)
      }
      
      toast.success('تم إرسال الرد')
      loadRequests()
    } catch (e: any) {
      console.error('Quick response error:', e)
      toast.error(e?.message || 'تعذر إرسال الرد')
    }
  }

  const loadTripBookingsStats = async () => {
    try {
      // جلب جميع الطلبات التي لها trip_id مع معلومات إضافية
      const { data: bookedRequests, error: reqError } = await supabase
        .from('visit_requests')
        .select('id, trip_id, companions_count, visitor_name, user_id, arrival_date, days_count, city')
        .not('trip_id', 'is', null)
        .neq('status', 'rejected')

      if (reqError) throw reqError

      // تجميع حسب trip_id مع حفظ معلومات الطلبات
      const bookingsByTrip: Record<string, { 
        passengers: number
        requests: number
        bookings: Array<{
          id: string
          visitor_name: string
          user_id: string
          companions_count: number
          arrival_date: string | null
          days_count: number
          city: string
        }>
      }> = {}
      
      ;(bookedRequests || []).forEach((r: any) => {
        if (!r.trip_id) return
        if (!bookingsByTrip[r.trip_id]) {
          bookingsByTrip[r.trip_id] = { passengers: 0, requests: 0, bookings: [] }
        }
        bookingsByTrip[r.trip_id].passengers += 1 + (r.companions_count || 0)
        bookingsByTrip[r.trip_id].requests += 1
        bookingsByTrip[r.trip_id].bookings.push({
          id: r.id,
          visitor_name: r.visitor_name,
          user_id: r.user_id,
          companions_count: r.companions_count || 0,
          arrival_date: r.arrival_date,
          days_count: r.days_count,
          city: r.city,
        })
      })

      // جلب معلومات الرحلات
      const tripIds = Object.keys(bookingsByTrip)
      if (tripIds.length === 0) {
        setTripBookingsStats([])
        return
      }

      const { data: tripsData, error: tripsError } = await supabase
        .from('route_trips')
        .select('id, trip_date, trip_type')
        .in('id', tripIds)
        .eq('is_active', true)
        .order('trip_date', { ascending: true })

      if (tripsError) throw tripsError

      const stats = (tripsData || []).map((trip: any) => {
        const bookingData = bookingsByTrip[trip.id]
        
        // حساب موعد المغادرة المتوقع (arrival_date + days_count أو + شهر)
        let expectedDepartureDate: string | null = null
        if (trip.trip_type === 'arrival' && bookingData.bookings.length > 0) {
          // نأخذ أول طلب كمرجع (يمكن تحسينه لاحقاً)
          const firstBooking = bookingData.bookings[0]
          if (firstBooking.arrival_date) {
            const arrivalDate = new Date(firstBooking.arrival_date)
            // إضافة days_count أو شهر (30 يوم)
            const daysToAdd = firstBooking.days_count || 30
            arrivalDate.setDate(arrivalDate.getDate() + daysToAdd)
            expectedDepartureDate = arrivalDate.toISOString().split('T')[0]
          }
        }
        
        return {
          trip_id: trip.id,
          trip_date: trip.trip_date,
          trip_type: (trip.trip_type || 'arrival') as 'arrival' | 'departure' | null,
          passengers_count: bookingData.passengers,
          requests_count: bookingData.requests,
          bookings: bookingData.bookings,
          expected_departure_date: expectedDepartureDate,
        }
      })

      setTripBookingsStats(stats)
    } catch (error: any) {
      console.error('Error loading trip bookings stats:', error)
    }
  }

  const typeOrder = ['visit', 'goethe', 'embassy', 'visa', 'umrah', 'tourism']
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
    bookings: requests.filter(r => Boolean(r.trip_id)).length,
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
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-extrabold text-gray-900 leading-tight truncate">
                  {currentRole === 'supervisor' ? 'لوحة المشرف' : 'لوحة تحكم الإدارة'}
                </h1>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 truncate font-semibold">
                  إدارة الطلبات والخطوط
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto justify-end sm:justify-start">
              <QRCodeShare title="منصة خدمات السوريين - لوحة الإدارة" />
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowRouteManagement(!showRouteManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg text-gray-700 hover:text-blue-600 transition font-semibold"
                >
                  إدارة الخطوط
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowInvitesManagement(!showInvitesManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg text-gray-700 hover:text-blue-600 transition font-semibold"
                >
                  الدعوات
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => {
                    if (showBookingsManagement) {
                      setShowBookingsManagement(false)
                    } else {
                      setShowBookingsManagement(true)
                      setShowRouteManagement(false)
                      setShowInvitesManagement(false)
                      setShowCustomersManagement(false)
                      setShowSupervisorsManagement(false)
                    }
                  }}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 hover:text-blue-600 transition flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  الحجوزات
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowCustomersManagement(!showCustomersManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg text-gray-700 hover:text-blue-600 transition font-semibold"
                >
                  المنتسبين
                </button>
              )}
              {currentRole === 'admin' && (
                <button
                  onClick={() => setShowSupervisorsManagement(!showSupervisorsManagement)}
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-sm sm:text-base md:text-lg text-gray-700 hover:text-blue-600 transition font-semibold"
                >
                  المشرفين
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

      <div className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-6 max-w-7xl">
        {/* Route Management */}
        {showRouteManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-xl font-extrabold text-gray-900">إدارة الخطوط والسائقين</h2>
              <button
                onClick={() => setShowRouteManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <RouteManagement />
          </div>
        ) : showInvitesManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-xl font-extrabold text-gray-900">الدعوات</h2>
              <button
                onClick={() => setShowInvitesManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <InvitesManagement />
          </div>
        ) : showCustomersManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-xl font-extrabold text-gray-900">العملاء / المنتسبين</h2>
              <button
                onClick={() => setShowCustomersManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <CustomersManagement />
          </div>
        ) : showSupervisorsManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة المشرفين</h2>
              <button
                onClick={() => setShowSupervisorsManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <SupervisorsManagement />
          </div>
        ) : showBookingsManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الحجوزات والرحلات</h2>
              <button
                onClick={() => setShowBookingsManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <BookingsManagement />
          </div>
        ) : (
          <>
            {/* Stats */}
            <AdminStats 
              stats={stats} 
              selectedFilter={statusFilter}
              onStatClick={(filterType) => {
                setStatusFilter(filterType)
              }}
            />

            {/* قسم إحصائيات الرحلات */}
            {currentRole === 'admin' && tripBookingsStats.length > 0 && (
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 sm:p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Ticket className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                    إحصائيات الحجوزات حسب الرحلة
                  </h2>
                </div>
                
                {/* القادمون */}
                {tripBookingsStats.filter(s => s.trip_type === 'arrival').length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">القادمون</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {tripBookingsStats
                        .filter(s => s.trip_type === 'arrival')
                        .map((stat) => (
                          <div
                            key={stat.trip_id}
                            onClick={() => setSelectedTripForDetails({
                              trip_id: stat.trip_id,
                              trip_date: stat.trip_date,
                              trip_type: stat.trip_type,
                              bookings: stat.bookings,
                            })}
                            className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 sm:p-4 border-2 border-emerald-200 cursor-pointer hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600" />
                                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                  قادمون
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              {formatDate(stat.trip_date)}
                            </p>
                            {stat.expected_departure_date && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                                <p className="text-xs font-semibold text-amber-800">
                                  ⏰ موعد المغادرة المتوقع: {formatDate(stat.expected_departure_date)}
                                </p>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <div>
                                <p className="text-xs text-gray-600">عدد الأشخاص</p>
                                <p className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                                  {stat.passengers_count}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">عدد الطلبات</p>
                                <p className="text-lg sm:text-xl font-bold text-emerald-600">
                                  {stat.requests_count}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* المغادرون */}
                {tripBookingsStats.filter(s => s.trip_type === 'departure').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Plane className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">المغادرون</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {tripBookingsStats
                        .filter(s => s.trip_type === 'departure')
                        .map((stat) => (
                          <div
                            key={stat.trip_id}
                            onClick={() => setSelectedTripForDetails({
                              trip_id: stat.trip_id,
                              trip_date: stat.trip_date,
                              trip_type: stat.trip_type,
                              bookings: stat.bookings,
                            })}
                            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border-2 border-blue-200 cursor-pointer hover:shadow-lg transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Plane className="w-4 h-4 text-blue-600" />
                                <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                  مغادرون
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              {formatDate(stat.trip_date)}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <div>
                                <p className="text-xs text-gray-600">عدد الأشخاص</p>
                                <p className="text-xl sm:text-2xl font-extrabold text-blue-700">
                                  {stat.passengers_count}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">عدد الطلبات</p>
                                <p className="text-lg sm:text-xl font-bold text-blue-600">
                                  {stat.requests_count}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal لعرض قائمة الركاب */}
            {selectedTripForDetails && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
                <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                          {selectedTripForDetails.trip_type === 'arrival' ? 'قادمون' : 'مغادرون'} - {formatDate(selectedTripForDetails.trip_date)}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          عدد الركاب: {selectedTripForDetails.bookings.length}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTripForDetails(null)}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-2">
                      {selectedTripForDetails.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 mb-1">{booking.visitor_name}</h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                                <span>المدينة: {booking.city}</span>
                                <span>الأشخاص: {1 + booking.companions_count}</span>
                                {booking.arrival_date && (
                                  <span>تاريخ القدوم: {formatDate(booking.arrival_date)}</span>
                                )}
                                {booking.days_count && (
                                  <span>مدة الإقامة: {booking.days_count} يوم</span>
                                )}
                              </div>
                            </div>
                            <Link
                              href={`/admin/request/${booking.id}/follow`}
                              className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold whitespace-nowrap"
                              onClick={() => setSelectedTripForDetails(null)}
                            >
                              عرض التفاصيل
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Embassy Requests Section */}
        {(() => {
          const embassyRequests = requests.filter(r => r.visit_type === 'embassy')
          if (embassyRequests.length === 0) return null
          
          return (
            <div className="mb-8 bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <Building2 className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-800">طلبات مواعيد السفارة</h2>
                <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                  {embassyRequests.length}
                </span>
              </div>
              
              <div className="space-y-4">
                {embassyRequests.map((request) => {
                  const userProfile = userProfiles[request.user_id]
                  const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
                  
                  // استخراج رقم الهاتف من admin_notes أو userProfile
                  const phoneMatch = (request.admin_notes || '').match(/الهاتف:\s*([^\n]+)/)
                  const phone = phoneMatch?.[1]?.trim() || userProfile?.phone || adminInfo.syrianPhone || adminInfo.jordanPhone || ''
                  const waDigits = String(phone).replace(/[^\d]/g, '')
                  const callDigits = String(phone).replace(/[^\d+]/g, '')
                  
                  const quickResponse = '✅ تم استلام طلبك. سنتواصل معك قريباً لإكمال الإجراءات.'
                  
                  return (
                    <div key={request.id} className="bg-white rounded-lg p-4 border-2 border-green-200 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 mb-1">{request.visitor_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">#{request.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500 mb-2">{request.city}</p>
                          {request.admin_notes && (
                            <div className="text-xs text-gray-600 mt-2 whitespace-pre-line max-h-20 overflow-y-auto">
                              {request.admin_notes.split('\n').slice(0, 5).join('\n')}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              واتساب
                            </a>
                          )}
                          {callDigits && (
                            <a
                              href={`tel:${callDigits}`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <Phone className="w-4 h-4" />
                              اتصال
                            </a>
                          )}
                          <button
                            onClick={() => handleQuickResponse(request, quickResponse)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                          >
                            رد سريع
                          </button>
                          <button
                            onClick={() => handleRequestClick(request)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* Visa Services Requests Section */}
        {(() => {
          const visaRequests = requests.filter(r => r.visit_type === 'visa')
          if (visaRequests.length === 0) return null
          
          return (
            <div className="mb-8 bg-gradient-to-br from-red-50 to-white rounded-xl shadow-lg p-4 sm:p-6 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-4">
                <Plane className="w-6 h-6 text-red-600" />
                <h2 className="text-xl font-bold text-gray-800">طلبات الفيز والتأشيرات والرحلات</h2>
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                  {visaRequests.length}
                </span>
              </div>
              
              <div className="space-y-4">
                {visaRequests.map((request) => {
                  const userProfile = userProfiles[request.user_id]
                  const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
                  
                  // استخراج رقم الهاتف من admin_notes أو userProfile
                  const phoneMatch = (request.admin_notes || '').match(/الهاتف:\s*([^\n]+)/)
                  const phone = phoneMatch?.[1]?.trim() || userProfile?.phone || adminInfo.syrianPhone || adminInfo.jordanPhone || ''
                  const waDigits = String(phone).replace(/[^\d]/g, '')
                  const callDigits = String(phone).replace(/[^\d+]/g, '')
                  
                  const quickResponse = '✅ تم استلام طلبك. سنتواصل معك قريباً لإكمال الإجراءات.'
                  
                  return (
                    <div key={request.id} className="bg-white rounded-lg p-4 border-2 border-red-200 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 mb-1">{request.visitor_name}</h3>
                          <p className="text-sm text-gray-600 mb-2">#{request.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500 mb-2">{request.city}</p>
                          {request.admin_notes && (
                            <div className="text-xs text-gray-600 mt-2 whitespace-pre-line max-h-20 overflow-y-auto">
                              {request.admin_notes.split('\n').slice(0, 5).join('\n')}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {waDigits && (
                            <a
                              href={`https://wa.me/${waDigits}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" />
                              واتساب
                            </a>
                          )}
                          {callDigits && (
                            <a
                              href={`tel:${callDigits}`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
                            >
                              <Phone className="w-4 h-4" />
                              اتصال
                            </a>
                          )}
                          <button
                            onClick={() => handleQuickResponse(request, quickResponse)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
                          >
                            رد سريع
                          </button>
                          <button
                            onClick={() => handleRequestClick(request)}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-semibold"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

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
                  {getFilterTitle()} ({filteredRequests.length})
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
