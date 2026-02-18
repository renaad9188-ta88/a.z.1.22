'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/date-utils'
import { VisitRequest } from './types'
import { Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Users, DollarSign, Plane, Copy, ExternalLink, MessageCircle, Phone, Ticket, Bus, CheckCircle2, Trash2, RotateCcw, MoreVertical, GraduationCap, Building2, FileText, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseAdminNotes } from '../request-details/utils'
import Link from 'next/link'
import ProgressBar from '../ProgressBar'

interface RequestCardProps {
  request: VisitRequest
  userProfile?: { full_name: string | null; phone: string | null; whatsapp_phone?: string | null; jordan_phone?: string | null }
  onClick: () => void
  onScheduleTrip?: () => void
  onDelete?: () => void
  onRestore?: () => void
  onAssignSupervisor?: () => void
  isAdmin?: boolean
  isDeleted?: boolean
  index?: number
}

export default function RequestCard({ request, userProfile, onClick, onScheduleTrip, onDelete, onRestore, onAssignSupervisor, isAdmin = false, isDeleted = false, index }: RequestCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  // حساب عمر الطلب (بالساعات)
  const getRequestAge = () => {
    const created = new Date(request.created_at)
    const now = new Date()
    const diffTime = now.getTime() - created.getTime()
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return { hours: diffHours, days: diffDays }
  }

  // تحديد إذا كان الطلب جديد (أقل من 24 ساعة)
  const requestAge = getRequestAge()
  const isNewRequest = request.status === 'pending' && requestAge.hours < 24

  const shortRef = `#${request.id.slice(0, 8).toUpperCase()}`

  const copyText = async (text: string, successMsg: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
      pending: { 
        text: 'مستلم', 
        color: 'text-amber-800', 
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        icon: Clock
      },
      under_review: { 
        text: 'قيد المراجعة', 
        color: 'text-purple-800', 
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        icon: Eye
      },
      approved: { 
        text: 'مقبول', 
        color: 'text-green-800', 
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: CheckCircle
      },
      rejected: { 
        text: 'مرفوض', 
        color: 'text-red-800', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        icon: XCircle
      },
      completed: {
        text: 'مكتمل',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        icon: CheckCircle,
      },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold border-2 ${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        {statusInfo.text}
      </span>
    )
  }

  const getVisitTypeText = (type: string) => {
    const types: Record<string, string> = {
      visit: 'زيارة',
      umrah: 'عمرة',
      tourism: 'سياحة',
      goethe: 'امتحان جوته',
      embassy: 'موعد سفارة',
      visa: 'الفيز والتأشيرات والرحلات',
    }
    return types[type] || type
  }

  // الحصول على معلومات نوع الخدمة (أيقونة، نص، ألوان)
  const getServiceTypeInfo = (type: string) => {
    const serviceTypes: Record<string, { 
      icon: any, 
      text: string, 
      bgColor: string, 
      textColor: string, 
      borderColor: string 
    }> = {
      visit: {
        icon: Plane,
        text: 'زيارة',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-300'
      },
      umrah: {
        icon: Calendar,
        text: 'عمرة',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-300'
      },
      tourism: {
        icon: MapPin,
        text: 'سياحة',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-300'
      },
      goethe: {
        icon: GraduationCap,
        text: 'امتحان جوته',
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        borderColor: 'border-indigo-300'
      },
      embassy: {
        icon: Building2,
        text: 'موعد سفارة',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-300'
      },
      visa: {
        icon: Ticket,
        text: 'الفيز والتأشيرات',
        bgColor: 'bg-cyan-50',
        textColor: 'text-cyan-700',
        borderColor: 'border-cyan-300'
      },
      other: {
        icon: FileText,
        text: 'خدمات أخرى',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-300'
      }
    }
    
    return serviceTypes[type] || serviceTypes.other
  }

  // التحقق من نوع الطلب (هل هو طلب أردن)
  const isJordanVisit = Boolean(request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر'))
  const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
  // سيتم حساب isCompleted لاحقاً ثم نستخدمه هنا (بعد تعريفه)
  const isDraft = ((request.admin_notes || '') as string).startsWith('[DRAFT]')

  // البحث عن رقم المشرف المخصص (إذا كان المنتسب له مشرف)
  const [supervisorContact, setSupervisorContact] = useState<{ 
    contact_phone: string | null
    whatsapp_phone: string | null
    supervisor_name: string
    office_name: string | null
    display_type: 'office' | 'supervisor'
    display_name: string
  } | null>(null)
  const [loadingSupervisorContact, setLoadingSupervisorContact] = useState(false)

  useEffect(() => {
    // فقط للزيارات (visit) نبحث عن المشرف
    if (request.user_id && !isAdmin && request.visit_type === 'visit') {
      setLoadingSupervisorContact(true)
      import('@/lib/supervisor-utils').then(({ getSupervisorContactForCustomer, getSupervisorWhatsAppNumber, getSupervisorCallNumber, getSupervisorWithFullPermissions }) => {
        getSupervisorContactForCustomer(request.user_id).then((contact) => {
          if (contact) {
            // تحديد الاسم للعرض: مكتب إذا كان display_type === 'office' و office_name موجود، وإلا اسم المشرف
            const displayName = contact.display_type === 'office' && contact.office_name
              ? contact.office_name
              : contact.supervisor_name
            
            setSupervisorContact({
              contact_phone: getSupervisorCallNumber(contact),
              whatsapp_phone: getSupervisorWhatsAppNumber(contact),
              supervisor_name: contact.supervisor_name,
              office_name: contact.office_name,
              display_type: contact.display_type,
              display_name: displayName,
            })
            setLoadingSupervisorContact(false)
          } else {
            // إذا لم يكن له مشرف مخصص، ابحث عن مشرف له صلاحيات كاملة
            getSupervisorWithFullPermissions().then((fullPermsContact) => {
              if (fullPermsContact) {
                const displayName = fullPermsContact.display_type === 'office' && fullPermsContact.office_name
                  ? fullPermsContact.office_name
                  : fullPermsContact.supervisor_name
                
                setSupervisorContact({
                  contact_phone: getSupervisorCallNumber(fullPermsContact),
                  whatsapp_phone: getSupervisorWhatsAppNumber(fullPermsContact),
                  supervisor_name: fullPermsContact.supervisor_name,
                  office_name: fullPermsContact.office_name,
                  display_type: fullPermsContact.display_type,
                  display_name: displayName,
                })
              }
              setLoadingSupervisorContact(false)
            }).catch(() => {
              setLoadingSupervisorContact(false)
            })
          }
        }).catch(() => {
          setLoadingSupervisorContact(false)
        })
      })
    } else {
      setLoadingSupervisorContact(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.user_id, request.visit_type, isAdmin])

  // تحديد الأرقام للعرض: المشرف للزيارات فقط، الإدمن للباقي
  const waDigits = (request.visit_type === 'visit' && supervisorContact?.whatsapp_phone)
    ? supervisorContact.whatsapp_phone
    : String(userProfile?.whatsapp_phone || adminInfo.syrianPhone || userProfile?.phone || adminInfo.jordanPhone || '')
      .replace(/[^\d]/g, '')
  const callDigits = (request.visit_type === 'visit' && supervisorContact?.contact_phone)
    ? supervisorContact.contact_phone
    : String(userProfile?.phone || adminInfo.syrianPhone || adminInfo.jordanPhone || '').replace(/[^\d+]/g, '')
  const waHref = waDigits ? `https://wa.me/${waDigits}` : ''

  // ملاحظة أداء: لا نعتمد على companions_data في بطاقة القائمة (قد تكون كبيرة وتبطّئ تحميل لوحة الأدمن).
  // العدد هنا تقديري ودقيق في أغلب الحالات: الزائر + عدد المرافقين.
  const totalPeople = (request.companions_count ?? 0) + 1

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'
  const isUnderReview = request.status === 'under_review' || request.status === 'pending'
  const isRejected = request.status === 'rejected'

  // التحقق من إمكانية الحذف (للإدمن فقط - أي طلب)
  const canDelete = isAdmin && onDelete && !isDeleted
  
  // التحقق من إمكانية الاسترجاع (للإدمن فقط - الطلبات المحذوفة)
  const canRestore = isAdmin && onRestore && isDeleted

  const needsPaymentVerifyAfterPostApproval =
    request.status === 'approved' &&
    !isCompleted &&
    !Boolean((request as any)?.payment_verified) &&
    (adminInfo?.postApprovalStatus || '') === 'مرسل'

  // التحقق من حالة الحجز
  const hasBooking = Boolean((request as any).trip_id)
  const isBookingConfirmed = hasBooking && request.trip_status !== 'scheduled_pending_approval'
  const isBookingPending = request.trip_status === 'scheduled_pending_approval'

  // تحديد لون الحدود حسب الحالة (أولوية للحجوزات)
  const getBorderColor = () => {
    if (isBookingConfirmed) return 'border-l-4 border-l-teal-500 shadow-teal-100 bg-gradient-to-r from-teal-50/30 to-white'
    if (isBookingPending) return 'border-l-4 border-l-orange-500 shadow-orange-100 bg-gradient-to-r from-orange-50/30 to-white'
    if (isNewRequest) return 'border-l-4 border-l-blue-500 shadow-blue-100 bg-gradient-to-r from-blue-50/30 to-white'
    if (isApproved) return 'border-l-4 border-l-green-500 shadow-green-100 bg-gradient-to-r from-green-50/30 to-white'
    if (isUnderReview) return 'border-l-4 border-l-yellow-500 shadow-yellow-100 bg-gradient-to-r from-yellow-50/30 to-white'
    if (isCompleted) return 'border-l-4 border-l-gray-400 shadow-gray-100 bg-gradient-to-r from-gray-50/30 to-white'
    return 'border-l-4 border-l-purple-500 shadow-purple-100 bg-gradient-to-r from-purple-50/30 to-white'
  }

  // تحديد لون الخلفية حسب الحالة (أولوية للحجوزات)
  const getBackgroundGradient = () => {
    if (isBookingConfirmed) return 'bg-gradient-to-br from-teal-50 via-white to-white'
    if (isBookingPending) return 'bg-gradient-to-br from-orange-50 via-white to-white'
    if (isNewRequest) return 'bg-gradient-to-br from-blue-50 via-white to-white'
    if (isApproved) return 'bg-gradient-to-br from-green-50 via-white to-white'
    if (isUnderReview) return 'bg-gradient-to-br from-yellow-50 via-white to-white'
    if (isCompleted) return 'bg-gradient-to-br from-gray-50 via-white to-white'
    return 'bg-gradient-to-br from-purple-50 via-white to-white'
  }

  // حساب وقت الانتظار في المرحلة الحالية
  const getWaitingTime = () => {
    const updated = request.updated_at ? new Date(request.updated_at) : new Date(request.created_at)
    const now = new Date()
    const diffTime = now.getTime() - updated.getTime()
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) return `${diffDays} يوم`
    if (diffHours > 0) return `${diffHours} ساعة`
    return 'أقل من ساعة'
  }

  // تحديد المرحلة الحالية
  const getCurrentStage = () => {
    if (isCompleted) return { text: 'مكتمل', color: 'text-gray-600' }
    if (hasBooking && isBookingConfirmed) return { text: 'محجوز', color: 'text-teal-600' }
    if (hasBooking && isBookingPending) return { text: 'حجز بانتظار الموافقة', color: 'text-orange-600' }
    if (isApproved) return { text: 'موافق عليه', color: 'text-green-600' }
    if (isUnderReview) return { text: 'قيد المراجعة', color: 'text-yellow-600' }
    return { text: 'مستلم', color: 'text-blue-600' }
  }

  const currentStage = getCurrentStage()

  return (
    <div 
      onClick={onClick}
      className={`${isDeleted ? 'bg-gradient-to-br from-gray-100 via-white to-white border-l-4 border-l-gray-400' : getBackgroundGradient()} rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-3 sm:p-4 border-2 border-r-0 ${isDeleted ? '' : getBorderColor()} ${
        isNewRequest ? 'ring-1 ring-blue-300 ring-opacity-50' : ''
      } w-full max-w-full overflow-hidden ${isDeleted ? 'opacity-75' : ''} cursor-pointer`}>
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {/* الصف الأول: الرقم، الاسم، الحالة */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {index !== undefined && (
              <div className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs sm:text-sm flex-shrink-0 ${
                isNewRequest 
                  ? 'bg-blue-500 text-white animate-pulse' 
                  : isApproved 
                  ? 'bg-green-500 text-white' 
                  : isUnderReview
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}>
                #{index + 1}
              </div>
            )}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              {hasBooking && (
                <Ticket className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${
                  isBookingConfirmed ? 'text-teal-600' : 'text-orange-600'
                }`} />
              )}
              <h3 className={`text-sm sm:text-base font-bold truncate ${
                isNewRequest ? 'text-blue-700' : 'text-gray-800'
              }`}>
                {request.visitor_name}
              </h3>
            </div>
            {isNewRequest && (
              <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] sm:text-xs font-bold rounded-full animate-pulse flex-shrink-0">
                جديد
              </span>
            )}
            {isDraft && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex-shrink-0">
                غير مكتمل
              </span>
            )}
          </div>
          
          {/* رقم الطلب - مبسط */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] sm:text-xs font-mono text-gray-600 font-bold">
              {shortRef}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClick()
              }}
              className="p-1 rounded hover:bg-white/50 transition"
              title="فتح التفاصيل"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* الصف الثاني: نوع الخدمة، الحالة، معلومات سريعة */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(() => {
            const serviceInfo = getServiceTypeInfo(request.visit_type)
            const ServiceIcon = serviceInfo.icon
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold border text-[10px] sm:text-xs ${serviceInfo.bgColor} ${serviceInfo.textColor} ${serviceInfo.borderColor}`}>
                <ServiceIcon className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-none">{isJordanVisit ? '🇯🇴 زيارة الأردن' : serviceInfo.text}</span>
              </span>
            )
          })()}
          
          {getStatusBadge(request.status)}
          
          {hasBooking && (
            <span className={`px-2 py-1 rounded-md font-semibold text-[10px] sm:text-xs flex items-center gap-1 border ${
              isBookingConfirmed
                ? 'bg-teal-50 text-teal-700 border-teal-300'
                : 'bg-orange-50 text-orange-700 border-orange-300'
            }`}>
              {isBookingConfirmed ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  محجوز
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  بانتظار
                </>
              )}
            </span>
          )}
        </div>

        {/* الصف الثالث: معلومات سريعة - صف واحد مضغوط */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
          <div className="flex items-center gap-1 bg-blue-50/50 rounded px-1.5 py-1">
            <Calendar className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-700 truncate">{formatDate(request.travel_date)}</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50/50 rounded px-1.5 py-1">
            <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-700 truncate">{request.city}</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-50/50 rounded px-1.5 py-1">
            <Users className="w-3 h-3 text-purple-600 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-700">{totalPeople}</span>
          </div>
        </div>

        {/* Progress Stepper - مضغوط */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-1">
                {[1, 2, 3].map((stage) => {
                  const stageCompleted = (stage === 1) || (stage === 2 && (isApproved || isRejected)) || (stage === 3 && (hasBooking || isCompleted))
                  const isCurrent = !stageCompleted && (
                    (stage === 1 && !isUnderReview && !isApproved) ||
                    (stage === 2 && isUnderReview) ||
                    (stage === 3 && isApproved && !hasBooking)
                  )
                  return (
                    <div key={stage} className="flex items-center gap-1 flex-1">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                        stageCompleted 
                          ? 'bg-green-500 text-white' 
                          : isCurrent 
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {stageCompleted ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : stage}
                      </div>
                      {stage < 3 && (
                        <div className={`flex-1 h-0.5 ${
                          stageCompleted ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="text-left flex-shrink-0">
              <p className="text-[9px] sm:text-[10px] text-gray-500">المرحلة الحالية</p>
              <p className={`text-[10px] sm:text-xs font-bold ${currentStage.color}`}>
                {currentStage.text}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
            <div className="text-[9px] sm:text-[10px] text-gray-500">
              آخر تحديث: {getWaitingTime()}
            </div>
            {userProfile?.full_name && (
              <div className="text-[9px] sm:text-[10px] text-gray-500 truncate max-w-[120px] sm:max-w-none">
                {userProfile.full_name}
              </div>
            )}
          </div>
        </div>

        {/* معلومات إضافية للطلبات غير المكتملة فقط */}
        {isDraft && (
          <div className="pt-2 border-t border-gray-200">
            {supervisorContact && (
              <div className="text-[10px] sm:text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded mb-2">
                {supervisorContact.display_type === 'office' ? 'المكتب المخصص' : 'المشرف المخصص'}: {supervisorContact.display_name}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700 transition text-[10px] sm:text-xs font-bold"
                  title={supervisorContact ? `واتساب ${supervisorContact.display_type === 'office' ? 'المكتب' : 'المشرف'}: ${supervisorContact.display_name}` : "فتح واتساب للتواصل"}
                >
                  <MessageCircle className="w-3 h-3" />
                  واتساب
                </a>
              )}
              {callDigits && (
                <a
                  href={`tel:${callDigits}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800 text-white hover:bg-black transition text-[10px] sm:text-xs font-bold"
                  title={supervisorContact ? `اتصال ${supervisorContact.display_type === 'office' ? 'بالمكتب' : 'بالمشرف'}: ${supervisorContact.display_name}` : "اتصال"}
                >
                  <Phone className="w-3 h-3" />
                  اتصال
                </a>
              )}
            </div>
          </div>
        )}

        {/* الأزرار */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            {!isDeleted && (
              <Link
                href={`/admin/request/${request.id}/follow`}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                title="متابعة الطلب (مراحل)"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">متابعة</span>
              </Link>
            )}
            {(canDelete || canRestore) && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(!showMenu)
                  }}
                  className="p-1.5 sm:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-700 border border-gray-300"
                  title="المزيد من الخيارات"
                >
                  <MoreVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[100]"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowMenu(false)
                      }}
                    />
                    <div className="absolute right-0 bottom-full mb-1 md:bottom-auto md:top-full md:mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-[101] min-w-[140px] md:min-w-[160px] whitespace-nowrap">
                      {isAdmin && !isDeleted && onAssignSupervisor && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMenu(false)
                            onAssignSupervisor()
                          }}
                          className="w-full px-3 py-2 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition rounded-t-lg"
                          title="نقل الطلب إلى مشرف"
                        >
                          <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>نقل إلى مشرف</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMenu(false)
                            onDelete()
                          }}
                          className={`w-full px-3 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition ${
                            isAdmin && !isDeleted && onAssignSupervisor ? '' : 'rounded-t-lg'
                          }`}
                          title="حذف الطلب"
                        >
                          <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>حذف</span>
                        </button>
                      )}
                      {canRestore && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMenu(false)
                            onRestore()
                          }}
                          className={`w-full px-3 py-2 text-xs sm:text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition ${
                            canDelete ? 'rounded-b-lg' : 'rounded-lg'
                          }`}
                          title="استرجاع الطلب"
                        >
                          <RotateCcw className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>استرجاع</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-500">
            {formatDate(request.created_at)}
          </div>
        </div>
      </div>
    </div>
  )
}


