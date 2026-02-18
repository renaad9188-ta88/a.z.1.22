'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogOut, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import AdminStats from './admin/AdminStats'
import ServiceTabs, { ServiceType } from './admin/ServiceTabs'
import RequestFilters from './admin/RequestFilters'
import RequestCard from './admin/RequestCard'
import RequestDetailsModal from './admin/RequestDetailsModal'
import TripSchedulingModal from './admin/TripSchedulingModal'
import SupervisorSelectorModal from './admin/SupervisorSelectorModal'
import RouteManagement from './admin/RouteManagement'
import SupervisorsManagement from './admin/SupervisorsManagement'
import InvitesManagement from './admin/InvitesManagement'
import CustomersManagement from './admin/CustomersManagement'
import BookingsManagement from './admin/BookingsManagement'
import ContactMessagesManagement from './admin/ContactMessagesManagement'
import SupervisorCustomersPanel from './supervisor/SupervisorCustomersPanel'
import SupervisorInvitesPanel from './supervisor/SupervisorInvitesPanel'
import { VisitRequest, UserProfile, AdminStats as StatsType } from './admin/types'
import { Calendar, MessageCircle, Archive } from 'lucide-react'
import AdminDashboardHeader from './admin/dashboard/AdminDashboardHeader'
import AdminDashboardEmbassySection from './admin/dashboard/AdminDashboardEmbassySection'
import AdminDashboardVisaSection from './admin/dashboard/AdminDashboardVisaSection'
import AdminDashboardDeletedRequests from './admin/dashboard/AdminDashboardDeletedRequests'
import AdminDashboardTripBookingsStats from './admin/dashboard/AdminDashboardTripBookingsStats'
import AdminDashboardTripDetailsModal from './admin/dashboard/AdminDashboardTripDetailsModal'
import AdminDashboardRequestsList from './admin/dashboard/AdminDashboardRequestsList'
import { typeLabel, getFilterTitle, groupedByType, typeOrder } from './admin/dashboard/AdminDashboardUtils'

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
  const [assigningRequest, setAssigningRequest] = useState<VisitRequest | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedService, setSelectedService] = useState<ServiceType>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentRole, setCurrentRole] = useState<'admin' | 'supervisor' | 'other'>('other')
  const [supervisorPermissions, setSupervisorPermissions] = useState<{
    can_manage_routes: boolean
    can_create_trips: boolean
    can_assign_requests: boolean
    can_verify_payments: boolean
    can_view_all_requests: boolean
  } | null>(null)
  const [showRouteManagement, setShowRouteManagement] = useState(false)
  const [showSupervisorsManagement, setShowSupervisorsManagement] = useState(false)
  const [showInvitesManagement, setShowInvitesManagement] = useState(false)
  const [showCustomersManagement, setShowCustomersManagement] = useState(false)
  const [showBookingsManagement, setShowBookingsManagement] = useState(false)
  const [showContactMessages, setShowContactMessages] = useState(false)
  const [showDeletedRequests, setShowDeletedRequests] = useState(false)
  const [showSupervisorCustomers, setShowSupervisorCustomers] = useState(false)
  const [showSupervisorInvites, setShowSupervisorInvites] = useState(false)

  // دالة موحدة للتنقل بين الأقسام
  const handleSectionToggle = (section: 'routes' | 'invites' | 'bookings' | 'customers' | 'supervisors' | 'deleted' | 'supervisor-customers' | 'supervisor-invites' | 'contact-messages') => {
    // التحقق من حالة القسم الحالي
    let isCurrentlyOpen = false
    switch (section) {
      case 'routes':
        isCurrentlyOpen = showRouteManagement
        break
      case 'invites':
        isCurrentlyOpen = showInvitesManagement
        break
      case 'bookings':
        isCurrentlyOpen = showBookingsManagement
        break
      case 'customers':
        isCurrentlyOpen = showCustomersManagement
        break
      case 'supervisors':
        isCurrentlyOpen = showSupervisorsManagement
        break
      case 'deleted':
        isCurrentlyOpen = showDeletedRequests
        break
      case 'supervisor-customers':
        isCurrentlyOpen = showSupervisorCustomers
        break
      case 'supervisor-invites':
        isCurrentlyOpen = showSupervisorInvites
        break
    }

    // إذا كان القسم مفتوحاً، أغلق جميع الأقسام
    if (isCurrentlyOpen) {
      setShowRouteManagement(false)
      setShowInvitesManagement(false)
      setShowBookingsManagement(false)
      setShowCustomersManagement(false)
      setShowSupervisorsManagement(false)
      setShowDeletedRequests(false)
      setShowSupervisorCustomers(false)
      setShowSupervisorInvites(false)
      return
    }

    // إغلاق جميع الأقسام أولاً
    setShowRouteManagement(false)
    setShowInvitesManagement(false)
    setShowBookingsManagement(false)
    setShowCustomersManagement(false)
    setShowSupervisorsManagement(false)
    setShowContactMessages(false)
    setShowDeletedRequests(false)
    setShowSupervisorCustomers(false)
    setShowSupervisorInvites(false)

    // فتح القسم المطلوب
    switch (section) {
      case 'routes':
        setShowRouteManagement(true)
        break
      case 'invites':
        setShowInvitesManagement(true)
        break
      case 'bookings':
        setShowBookingsManagement(true)
        break
      case 'customers':
        setShowCustomersManagement(true)
        break
      case 'supervisors':
        setShowSupervisorsManagement(true)
        break
      case 'deleted':
        setShowDeletedRequests(true)
        break
      case 'supervisor-customers':
        setShowSupervisorCustomers(true)
        break
      case 'supervisor-invites':
        setShowSupervisorInvites(true)
        break
      case 'contact-messages':
        setShowContactMessages(true)
        break
    }
  }
  const [deletedRequests, setDeletedRequests] = useState<VisitRequest[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [deletedCount, setDeletedCount] = useState(0)
  const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({})
  const [tripBookingsStats, setTripBookingsStats] = useState<import('./admin/dashboard/AdminDashboardTripBookingsStats').TripBookingStat[]>([])
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
    // تحميل عدد الطلبات المحذوفة عند التحميل الأولي (للإدمن فقط)
    if (currentRole === 'admin') {
      loadDeletedCount()
    }
  }, [currentRole])

  // تحميل عدد الطلبات المحذوفة فقط (بدون تحميل التفاصيل)
  const loadDeletedCount = async () => {
    if (currentRole !== 'admin') return
    
    try {
      const { count, error } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null)

      if (error) throw error
      setDeletedCount(count || 0)
    } catch (error: any) {
      console.error('Error loading deleted count:', error)
    }
  }

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

      // تحميل صلاحيات المشرف إذا كان مشرف
      if (isSupervisor) {
        try {
          const { data: permData, error: permError } = await supabase
            .from('supervisor_permissions')
            .select('*')
            .eq('supervisor_id', user.id)
            .maybeSingle()

          if (permError && permError.code !== 'PGRST116') {
            console.error('Error loading supervisor permissions:', permError)
          }

          if (permData) {
            setSupervisorPermissions({
              can_manage_routes: permData.can_manage_routes || false,
              can_create_trips: permData.can_create_trips || false,
              can_assign_requests: permData.can_assign_requests || false,
              can_verify_payments: permData.can_verify_payments !== false,
              can_view_all_requests: permData.can_view_all_requests || false,
            })
          } else {
            // صلاحيات افتراضية للمشرف الجديد
            setSupervisorPermissions({
              can_manage_routes: false,
              can_create_trips: false,
              can_assign_requests: false,
              can_verify_payments: true,
              can_view_all_requests: false,
            })
          }
        } catch (e) {
          console.error('Error loading permissions:', e)
          setSupervisorPermissions({
            can_manage_routes: false,
            can_create_trips: false,
            can_assign_requests: false,
            can_verify_payments: true,
            can_view_all_requests: false,
          })
        }
      } else {
        setSupervisorPermissions(null)
      }
      
      // تحميل جميع الطلبات (قائمة خفيفة لتحسين الأداء) - إخفاء المحذوفة
      const { data: requestsData, error: requestsError } = await supabase
        .from('visit_requests')
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, trip_id, created_at, updated_at, admin_notes, companions_count, deposit_paid, deposit_amount, total_amount, remaining_amount, payment_verified, assigned_to, assigned_by, assigned_at')
        .is('deleted_at', null)  // إخفاء الطلبات المحذوفة
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

      // فلترة الطلبات للمشرف بناءً على الصلاحيات
      let scoped = visibleRequests || []
      if (isSupervisor && supervisorPermissions) {
        if (!supervisorPermissions.can_view_all_requests) {
          // جلب قائمة منتسبي المشرف
          const { data: customersData } = await supabase
            .from('supervisor_customers')
            .select('customer_id')
            .eq('supervisor_id', user.id)
          
          const customerIds = (customersData || []).map((c: any) => c.customer_id)
          
          // جلب قائمة الخدمات المخصصة للمشرف
          const { data: servicesData } = await supabase
            .from('supervisor_service_permissions')
            .select('service_type')
            .eq('supervisor_id', user.id)
          
          const allowedServiceTypes = new Set((servicesData || []).map((s: any) => s.service_type))
          
          // فلترة: الطلبات المعينة له أو طلبات منتسبيه أو طلبات الخدمات المخصصة له
          scoped = (visibleRequests || []).filter((r: any) => {
            const isAssigned = (r?.assigned_to || null) === user.id
            const isCustomer = customerIds.includes(r.user_id)
            const isAllowedService = allowedServiceTypes.size > 0 && allowedServiceTypes.has(r.visit_type)
            const isDraft = String((r?.admin_notes || '') as string).startsWith('[DRAFT]')
            return (isAssigned || isCustomer || isAllowedService) && !isDraft
          })
        } else {
          // يمكنه رؤية جميع الطلبات، لكن نستثني المسودات
          scoped = (visibleRequests || []).filter((r: any) => 
            !String((r?.admin_notes || '') as string).startsWith('[DRAFT]')
          )
        }
      }

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

  const handleDeleteRequest = async (requestId: string) => {
    // التحقق من أن المستخدم إدمن
    if (currentRole !== 'admin') {
      toast.error('ليس لديك صلاحية لحذف الطلبات')
      return
    }

    // البحث عن الطلب
    const request = requests.find(r => r.id === requestId) || deletedRequests.find(r => r.id === requestId)
    if (!request) {
      toast.error('لم يتم العثور على الطلب')
      return
    }

    const confirmMessage = `⚠️ تحذير: هل أنت متأكد من حذف الطلب؟\n\n` +
      `الزائر: ${request.visitor_name}\n` +
      `الحالة: ${request.status}\n\n` +
      `سيتم إخفاء الطلب من القائمة (يمكن استرجاعه لاحقاً من قسم "الطلبات المحذوفة").`

    if (!confirm(confirmMessage)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('يجب تسجيل الدخول')
        return
      }

      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.id
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('تم حذف الطلب (يمكن استرجاعه من قسم "الطلبات المحذوفة")')
      loadRequests() // إعادة تحميل القائمة
      loadDeletedCount() // تحديث العدد
      if (showDeletedRequests) {
        loadDeletedRequests() // إعادة تحميل المحذوفة
      }
    } catch (error: any) {
      console.error('Delete request error:', error)
      toast.error(error?.message || 'تعذر حذف الطلب')
    }
  }

  const loadDeletedRequests = async () => {
    if (currentRole !== 'admin') return
    
    try {
      setLoadingDeleted(true)
      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, trip_id, created_at, updated_at, admin_notes, companions_count, deposit_paid, deposit_amount, total_amount, remaining_amount, payment_verified, assigned_to, assigned_by, assigned_at, deleted_at, deleted_by')
        .not('deleted_at', 'is', null)  // فقط المحذوفة
        .order('deleted_at', { ascending: false })
        .limit(500)

      if (error) throw error

      const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id)))
      let profilesMap: { [key: string]: UserProfile } = {}
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone, jordan_phone, whatsapp_phone')
          .in('user_id', userIds)
        
        if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap[profile.user_id] = profile
          })
        }
      }

      setDeletedRequests((data || []) as any)
      setDeletedCount((data || []).length)
      // تحديث userProfiles لتشمل ملفات المستخدمين للطلبات المحذوفة
      setUserProfiles(prev => ({ ...prev, ...profilesMap }))
    } catch (error: any) {
      console.error('Error loading deleted requests:', error)
      toast.error('تعذر تحميل الطلبات المحذوفة')
    } finally {
      setLoadingDeleted(false)
    }
  }

  const handleRestoreRequest = async (requestId: string) => {
    if (currentRole !== 'admin') {
      toast.error('ليس لديك صلاحية لاسترجاع الطلبات')
      return
    }

    if (!confirm('هل أنت متأكد من استرجاع هذا الطلب؟')) return

    try {
      const { error } = await supabase
        .from('visit_requests')
        .update({ 
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success('تم استرجاع الطلب بنجاح')
      loadDeletedRequests() // إعادة تحميل المحذوفة
      loadRequests() // إعادة تحميل القائمة الرئيسية
      loadDeletedCount() // تحديث العدد
    } catch (error: any) {
      console.error('Restore request error:', error)
      toast.error(error?.message || 'تعذر استرجاع الطلب')
    }
  }

  const handleAssignSupervisor = async (requestId: string, supervisorId: string) => {
    if (currentRole !== 'admin') {
      toast.error('ليس لديك صلاحية لتعيين المشرفين')
      return
    }

    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('visit_requests')
        .update({
          assigned_to: supervisorId,
          assigned_at: new Date().toISOString(),
          assigned_by: adminUser?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) throw error

      // جلب اسم المشرف للإشعار
      const { data: supervisorProfile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', supervisorId)
        .maybeSingle()

      const supervisorName = supervisorProfile?.full_name || supervisorProfile?.phone || 'مشرف'

      // إرسال إشعار للمشرف
      try {
        const { notifyCustomMessage } = await import('@/lib/notifications')
        const request = requests.find(r => r.id === requestId)
        if (request) {
          await notifyCustomMessage(
            supervisorId,
            requestId,
            `تم تعيين طلب جديد لك: ${request.visitor_name}`
          )
        }
      } catch (notifyErr) {
        console.error('Error sending notification:', notifyErr)
        // لا نوقف العملية إذا فشل الإشعار
      }

      toast.success(`تم نقل الطلب إلى المشرف: ${supervisorName}`)
      loadRequests()
    } catch (e: any) {
      console.error('Assign supervisor error:', e)
      toast.error(e?.message || 'تعذر تعيين المشرف')
      throw e
    }
  }

  // تحميل المحذوفة عند فتح القسم
  useEffect(() => {
    if (showDeletedRequests && currentRole === 'admin' && !loading) {
      loadDeletedRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeletedRequests, currentRole, loading])

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  // تصفية الطلبات
  const filteredRequests = requests.filter(request => {
    const userProfile = userProfiles[request.user_id]
    const userFullName = userProfile?.full_name || ''
    
    const matchesSearch = 
      !searchQuery ||
      request.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userFullName.toLowerCase().includes(searchQuery.toLowerCase())

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

    // فلترة حسب الخدمة المحددة
    const matchesService = selectedService === 'all' 
      ? true
      : (() => {
          const visitType = (request.visit_type || 'visit') as string
          if (selectedService === 'other') {
            return visitType !== 'visit' && visitType !== 'goethe' && visitType !== 'embassy' && 
                   visitType !== 'visa' && visitType !== 'umrah' && visitType !== 'tourism'
          }
          return visitType === selectedService
        })()

    return matchesSearch && matchesStatus && matchesType && matchesService
  })

  // typeLabel and getFilterTitle are now imported from AdminDashboardUtils

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

  // typeOrder and groupedByType are now imported from AdminDashboardUtils


  // حساب عدد الطلبات لكل خدمة
  const serviceCounts: Record<ServiceType, number> = {
    all: requests.length,
    visit: requests.filter(r => (r.visit_type || 'visit') === 'visit').length,
    goethe: requests.filter(r => r.visit_type === 'goethe').length,
    embassy: requests.filter(r => r.visit_type === 'embassy').length,
    visa: requests.filter(r => r.visit_type === 'visa').length,
    umrah: requests.filter(r => r.visit_type === 'umrah').length,
    tourism: requests.filter(r => r.visit_type === 'tourism').length,
    other: requests.filter(r => {
      const visitType = (r.visit_type || 'visit') as string
      return visitType !== 'visit' && visitType !== 'goethe' && visitType !== 'embassy' && 
             visitType !== 'visa' && visitType !== 'umrah' && visitType !== 'tourism'
    }).length,
  }

  // حساب الإحصائيات للطلبات المفلترة
  const stats: StatsType = {
    total: filteredRequests.length,
    // ملاحظة: نعتبر المسودات "غير مكتملة" وهي ظاهرة فقط للإدمن (ليس المشرف)
    newRequests: filteredRequests.filter(r => r.status === 'pending' && (Date.now() - new Date(r.created_at).getTime()) < 24 * 60 * 60 * 1000).length,
    received: filteredRequests.filter(r => r.status === 'pending').length,
    underReview: filteredRequests.filter(r => r.status === 'under_review').length,
    inProgress: filteredRequests.filter(r => r.status === 'approved' && (r.trip_status === 'pending_arrival' || r.trip_status === 'arrived')).length,
    bookings: filteredRequests.filter(r => Boolean(r.trip_id)).length,
    approved: filteredRequests.filter(r => r.status === 'approved').length,
    rejected: filteredRequests.filter(r => r.status === 'rejected').length,
    completed: filteredRequests.filter(r => r.status === 'completed' || r.trip_status === 'completed').length,
    deleted: deletedCount,
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
      <AdminDashboardHeader
        currentRole={currentRole}
        supervisorPermissions={supervisorPermissions}
        showRouteManagement={showRouteManagement}
        showInvitesManagement={showInvitesManagement}
        showBookingsManagement={showBookingsManagement}
        showCustomersManagement={showCustomersManagement}
        showSupervisorsManagement={showSupervisorsManagement}
        showContactMessages={showContactMessages}
        showDeletedRequests={showDeletedRequests}
        showSupervisorCustomers={showSupervisorCustomers}
        showSupervisorInvites={showSupervisorInvites}
        onSectionToggle={handleSectionToggle}
      />

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
        ) : showSupervisorCustomers && currentUserId ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة منتسبي</h2>
              <button
                onClick={() => setShowSupervisorCustomers(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <SupervisorCustomersPanel supervisorId={currentUserId} />
          </div>
        ) : showSupervisorInvites && currentUserId ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الدعوات</h2>
              <button
                onClick={() => setShowSupervisorInvites(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold"
              >
                العودة للطلبات
              </button>
            </div>
            <SupervisorInvitesPanel supervisorId={currentUserId} />
          </div>
        ) : showDeletedRequests ? (
          <AdminDashboardDeletedRequests
            deletedRequests={deletedRequests}
            loadingDeleted={loadingDeleted}
            userProfiles={userProfiles}
            currentRole={currentRole}
            onRequestClick={handleRequestClick}
            onScheduleTrip={handleScheduleTrip}
            onDeleteRequest={handleDeleteRequest}
            onRestoreRequest={handleRestoreRequest}
            onClose={() => setShowDeletedRequests(false)}
          />
        ) : showBookingsManagement ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">إدارة الحجوزات والرحلات</h2>
              </div>
              <button
                onClick={() => setShowBookingsManagement(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold transition"
              >
                العودة للطلبات
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <BookingsManagement />
            </div>
          </div>
        ) : showContactMessages ? (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-600" />
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900">التواصل المباشر</h2>
              </div>
              <button
                onClick={() => setShowContactMessages(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-bold transition"
              >
                العودة للطلبات
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <ContactMessagesManagement />
            </div>
          </div>
        ) : (
          <>
            {/* Service Tabs */}
            <ServiceTabs 
              selectedService={selectedService}
              onServiceChange={(service) => {
                setSelectedService(service)
                setStatusFilter('all')
                setShowDeletedRequests(false)
                setShowRouteManagement(false)
                setShowInvitesManagement(false)
                setShowCustomersManagement(false)
                setShowSupervisorsManagement(false)
                setShowBookingsManagement(false)
              }}
              serviceCounts={serviceCounts}
            />
            
            {/* Stats */}
            <AdminStats 
              stats={stats} 
              selectedFilter={showDeletedRequests ? 'deleted' : statusFilter}
              onStatClick={(filterType) => {
                if (filterType === 'deleted') {
                  setShowDeletedRequests(true)
                  setShowRouteManagement(false)
                  setShowInvitesManagement(false)
                  setShowCustomersManagement(false)
                  setShowSupervisorsManagement(false)
                  setShowBookingsManagement(false)
                } else if (filterType === 'bookings') {
                  setStatusFilter('bookings')
                  setShowBookingsManagement(true)
                  setShowRouteManagement(false)
                  setShowInvitesManagement(false)
                  setShowCustomersManagement(false)
                  setShowSupervisorsManagement(false)
                  setShowDeletedRequests(false)
                } else {
                  setStatusFilter(filterType)
                  setShowRouteManagement(false)
                  setShowInvitesManagement(false)
                  setShowCustomersManagement(false)
                  setShowSupervisorsManagement(false)
                  setShowBookingsManagement(false)
                  setShowDeletedRequests(false)
                }
              }}
            />

            {/* قسم إحصائيات الرحلات - يظهر فقط عند الضغط على "الحجوزات المؤكدة" */}
            {currentRole === 'admin' && (statusFilter === 'bookings' || showBookingsManagement) && tripBookingsStats.length > 0 && (
              <AdminDashboardTripBookingsStats
                tripBookingsStats={tripBookingsStats}
                onTripClick={(trip) => setSelectedTripForDetails(trip)}
              />
            )}

            {/* Modal لعرض قائمة الركاب */}
            <AdminDashboardTripDetailsModal
              trip={selectedTripForDetails}
              onClose={() => setSelectedTripForDetails(null)}
            />

        {/* Embassy Requests Section */}
        <AdminDashboardEmbassySection
          requests={requests}
          userProfiles={userProfiles}
          onRequestClick={handleRequestClick}
          onQuickResponse={handleQuickResponse}
        />

        {/* Visa Services Requests Section */}
        <AdminDashboardVisaSection
          requests={requests}
          userProfiles={userProfiles}
          onRequestClick={handleRequestClick}
          onQuickResponse={handleQuickResponse}
        />

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
                  {getFilterTitle(statusFilter)} ({filteredRequests.length})
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  انقر على أي طلب لعرض التفاصيل والرد
                </p>
              </div>

              {/* Requests List */}
              <AdminDashboardRequestsList
                filteredRequests={filteredRequests}
                userProfiles={userProfiles}
                typeFilter={typeFilter}
                collapsedTypes={collapsedTypes}
                currentRole={currentRole}
                onRequestClick={handleRequestClick}
                onScheduleTrip={handleScheduleTrip}
                onDeleteRequest={handleDeleteRequest}
                onAssignSupervisor={(request) => setAssigningRequest(request)}
                onToggleCollapse={(type) => setCollapsedTypes(prev => ({ ...prev, [type]: !prev[type] }))}
              />
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

      {/* Supervisor Selector Modal */}
      {assigningRequest && (
        <SupervisorSelectorModal
          requestId={assigningRequest.id}
          currentAssigned={(assigningRequest as any)?.assigned_to}
          onAssign={async (supervisorId: string) => {
            await handleAssignSupervisor(assigningRequest.id, supervisorId)
          }}
          onClose={() => setAssigningRequest(null)}
        />
      )}
    </div>
  )
}
