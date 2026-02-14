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
  Plane,
  Copy,
  MessageCircle
} from 'lucide-react'
import TripSchedulingModal from './admin/TripSchedulingModal'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/date-utils'
import { getSignedImageUrl, parseAdminNotes } from './request-details/utils'
import ProgressBar from './ProgressBar'

interface VisitRequest {
  id: string
  user_id: string
  visitor_name: string
  visit_type: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa'
  travel_date: string
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'
  created_at: string
  updated_at: string
  city: string
  days_count: number
  arrival_date: string | null
  departure_date: string | null
  trip_status: 'pending_arrival' | 'scheduled_pending_approval' | 'arrived' | 'completed' | null
  trip_id?: string | null
  assigned_to?: string | null
  admin_notes?: string | null
  deposit_paid?: boolean
}

export default function DashboardContent({ userId }: { userId: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [requests, setRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [schedulingRequest, setSchedulingRequest] = useState<VisitRequest | null>(null)
  const [sharingRequestId, setSharingRequestId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [userId])

  // إشعار لطيف للمستخدم عند وصول الموافقة (Fallback حتى لو نظام notifications في Supabase غير مفعّل)
  useEffect(() => {
    try {
      const key = `seen-approved-${userId}`
      const raw = localStorage.getItem(key) || '[]'
      const seen: string[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : []
      const newlyApproved = requests.filter((r) => r.status === 'approved' && !seen.includes(r.id))
      if (newlyApproved.length === 0) return

      newlyApproved.slice(0, 3).forEach((r) => {
        toast.success(`تم قبول طلبك لـ ${r.visitor_name}. يرجى استكمال الإجراءات من تفاصيل الطلب.`)
      })

      const nextSeen = Array.from(new Set([...seen, ...newlyApproved.map((r) => r.id)]))
      localStorage.setItem(key, JSON.stringify(nextSeen))
    } catch {
      // ignore
    }
  }, [requests, userId])

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
        .select('id, user_id, visitor_name, visit_type, travel_date, status, city, days_count, arrival_date, departure_date, trip_status, trip_id, created_at, updated_at, deposit_paid, deposit_amount, payment_verified, assigned_to, admin_notes')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      // ضبط بعض الحقول لتكون متوافقة مع الأنواع المستخدمة في TripSchedulingModal
      setRequests(
        (visitRequests || []).map((r: any) => ({
          ...r,
          deposit_paid: Boolean(r?.deposit_paid),
        })) as any
      )
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

  const copyText = async (text: string, successMsg: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast.success(successMsg)
    } catch (e) {
      console.error('Copy failed:', e)
      toast.error('تعذر النسخ')
    }
  }

  const handleShareWhatsApp = async (requestId: string) => {
    try {
      setSharingRequestId(requestId)
      const { data, error } = await supabase
        .from('visit_requests')
        .select('id, visitor_name, city, created_at, admin_notes, passport_image_url, companions_data, companions_count')
        .eq('id', requestId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        toast.error('تعذر تحميل تفاصيل الطلب للمشاركة')
        return
      }

      const shortCode = String(data.id).slice(0, 8).toUpperCase()
      const adminInfo = parseAdminNotes((data.admin_notes || '') as string) || {}
      const tourismCompany = adminInfo.tourismCompany || 'غير محدد'
      const transportCompany = adminInfo.transportCompany || 'شركة الرويال للنقل'

      // جمع صور الجوازات (الزائر + المرافقين)
      const passportUrls: string[] = []
      if (data.passport_image_url) passportUrls.push(data.passport_image_url)
      if (data.companions_data && Array.isArray(data.companions_data)) {
        for (const c of data.companions_data) {
          if (c?.passportImages && Array.isArray(c.passportImages)) {
            passportUrls.push(...c.passportImages)
          }
        }
      }

      // Signed URLs لمدة أطول للمشاركة (7 أيام)
      const signedUrls: string[] = []
      for (const u of passportUrls.filter(Boolean)) {
        signedUrls.push(await getSignedImageUrl(u, supabase, 60 * 60 * 24 * 7))
      }

      const platformWhatsapp = '962798905595' // 0798905595

      const msgLines: string[] = [
        'ملخص طلب الزيارة (الأردن)',
        `رقم الطلب: #${shortCode}`,
        `الكود: ${shortCode}`,
        `الاسم: ${data.visitor_name || '-'}`,
        `المدينة: ${data.city || '-'}`,
        `الشركة المقدّم لها الطلب: ${tourismCompany}`,
        `شركة النقل: ${transportCompany}`,
        '',
        'ملاحظة:',
        'تم استلام طلبك وسيتم الرد عليك خلال فترة من 3 إلى 10 أيام لإجراءات الموافقة والقبول وتحديد موعد الزيارة والمتابعة.',
        'سيتم تفعيل ميزة تتبع الرحلة عند الحجز.',
        'جميع الحقوق محفوظة.',
      ]

      if (signedUrls.length > 0) {
        msgLines.push('', 'روابط صور الجوازات:')
        signedUrls.forEach((u, i) => msgLines.push(`${i + 1}) ${u}`))
      }

      msgLines.push('', `للمتابعة عبر واتساب المنصة: ${platformWhatsapp}`)

      const text = encodeURIComponent(msgLines.join('\n'))
      window.open(`https://wa.me/${platformWhatsapp}?text=${text}`, '_blank')
      toast.success('تم تجهيز رسالة واتساب')
    } catch (e: any) {
      console.error('Share WhatsApp error:', e)
      toast.error(e?.message || 'تعذر تجهيز المشاركة')
    } finally {
      setSharingRequestId(null)
    }
  }

  const getStatusBadge = (status: string, tripStatus: string | null, isDraft: boolean, depositPaid?: boolean) => {
    // تم إزالة منطق Draft
    // إذا كان الطلب منتهياً، اعرض "منتهي"
    if (status === 'completed' || tripStatus === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-gray-800 text-white">
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>منتهي</span>
        </span>
      )
    }

    // إذا كان pending لكن لم يدفع الرسوم بعد
    if (status === 'pending' && !depositPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-amber-100 text-amber-900 border border-amber-200">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>معلق - بحاجة لدفع الرسوم</span>
        </span>
      )
    }

    // إذا كان pending ودفع الرسوم لكن الإدمن لم يستلم بعد
    if (status === 'pending' && depositPaid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium bg-blue-100 text-blue-900 border border-blue-200">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>تم الإرسال - في انتظار الاستلام</span>
        </span>
      )
    }

    const statusMap: Record<string, { text: string; color: string; icon: any }> = {
      // pending لا يجب أن يظهر هنا بعد الآن (تم التعامل معه أعلاه)
      under_review: { text: 'تم الاستلام - قيد المراجعة', color: 'bg-purple-100 text-purple-900', icon: Clock },
      approved: { text: 'مقبول', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const statusInfo = statusMap[status] || { text: 'في الانتظار', color: 'bg-gray-100 text-gray-900', icon: Clock }
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

  const getLatestAdminResponseSnippet = (adminNotes?: string | null) => {
    const notes = (adminNotes || '').trim()
    if (!notes) return null
    const marker = '=== رد الإدارة ==='
    const idx = notes.lastIndexOf(marker)
    if (idx === -1) return null
    const after = notes.slice(idx + marker.length).trim()
    if (!after) return null

    // Stop at "تاريخ الرد:" if present
    const stopIdx = after.indexOf('تاريخ الرد:')
    const body = (stopIdx !== -1 ? after.slice(0, stopIdx) : after).trim()
    if (!body) return null

    const oneLine = body.replace(/\s+/g, ' ').trim()
    return oneLine.length > 80 ? `${oneLine.slice(0, 80)}…` : oneLine
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
                  {requests.filter(r => {
                    return r.status === 'pending' || r.status === 'under_review'
                  }).length}
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
              {requests.map((request) => {
                const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
                const shortCode = String(request.id).slice(0, 8).toUpperCase()
                const lastAdminResponse = getLatestAdminResponseSnippet(request.admin_notes)
                const createdAtMs = new Date(request.created_at).getTime()
                const isNewUserRequest =
                  request.status === 'pending' && Date.now() - createdAtMs < 1000 * 60 * 60 * 12 // 12 hours
                const needsPostApproval =
                  request.visit_type === 'visit' &&
                  request.status === 'approved' &&
                  (!Boolean((request as any).payment_verified) ||
                    !((request.admin_notes || '') as string).includes('=== استكمال بعد الموافقة ==='))

                return (
                <div
                  key={request.id}
                  className={`p-4 sm:p-6 hover:bg-gray-50 transition ${
                    needsPostApproval ? 'bg-gradient-to-r from-blue-50/60 to-white' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-2">
                        <div className="min-w-0 flex items-center flex-wrap gap-2">
                          {needsPostApproval && (
                            <span className="relative inline-flex items-center">
                              <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 opacity-75 animate-ping"></span>
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                            </span>
                          )}
                          {isNewUserRequest && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              جديد
                            </span>
                          )}
                          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 break-words">
                            {request.visitor_name}
                          </h3>
                          <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
                            <span className="text-xs text-gray-600 font-mono">#{shortCode}</span>
                            <button
                              type="button"
                              onClick={() => copyText(shortCode, 'تم نسخ الكود')}
                              className="p-1 rounded hover:bg-white"
                              title="نسخ الكود"
                              aria-label="نسخ الكود"
                            >
                              <Copy className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(
                            request.status,
                            request.trip_status,
                            ((request.admin_notes || '') as string).startsWith('[DRAFT]'),
                            Boolean(request.deposit_paid)
                          )}
                        </div>
                      </div>
                      {/* NOTE: CTA moved to the action buttons area to avoid duplication */}
                      {lastAdminResponse && (
                        <div className="mb-2 bg-gray-50 border border-gray-200 rounded-lg p-2 sm:p-3">
                          <p className="text-[11px] sm:text-xs text-gray-500 mb-1">آخر رد من الإدارة</p>
                          <p className="text-xs sm:text-sm text-gray-800 font-semibold leading-relaxed break-words">
                            {lastAdminResponse}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="break-words">نوع الزيارة: {getVisitTypeText(request.visit_type)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="break-words">المدينة: {request.city}</span>
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
                        <div className="flex items-center gap-2 sm:col-span-2 md:col-span-1">
                          <span className="break-words">تاريخ الطلب: {formatDate(request.created_at)}</span>
                        </div>
                      </div>
                      
                      {/* شريط التقدم */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <ProgressBar request={request} showLabels={true} />
                        {Boolean((request as any)?.trip_id) && request.trip_status === 'scheduled_pending_approval' && (
                          <div className="mt-2 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                            تم تسجيل حجزك • بانتظار موافقة الإدارة
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Link
                        href={`/dashboard/request/${request.id}/follow`}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm font-semibold text-center"
                      >
                        متابعة الطلب
                      </Link>
                    </div>
                  </div>
                </div>
                )
              })}
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

