'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/date-utils'
import { VisitRequest } from './types'
import { Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Users, DollarSign, Plane, Copy, ExternalLink, MessageCircle, Phone, Ticket, Bus, CheckCircle2, Trash2, RotateCcw, MoreVertical } from 'lucide-react'
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
  isAdmin?: boolean
  isDeleted?: boolean
  index?: number
}

export default function RequestCard({ request, userProfile, onClick, onScheduleTrip, onDelete, onRestore, isAdmin = false, isDeleted = false, index }: RequestCardProps) {
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

  // التحقق من نوع الطلب (هل هو طلب أردن)
  const isJordanVisit = Boolean(request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر'))
  const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
  // سيتم حساب isCompleted لاحقاً ثم نستخدمه هنا (بعد تعريفه)
  const isDraft = ((request.admin_notes || '') as string).startsWith('[DRAFT]')

  const waDigits = String(userProfile?.whatsapp_phone || adminInfo.syrianPhone || userProfile?.phone || adminInfo.jordanPhone || '')
    .replace(/[^\d]/g, '')
  const callDigits = String(userProfile?.phone || adminInfo.syrianPhone || adminInfo.jordanPhone || '').replace(/[^\d+]/g, '')
  const waHref = waDigits ? `https://wa.me/${waDigits}` : ''

  // ملاحظة أداء: لا نعتمد على companions_data في بطاقة القائمة (قد تكون كبيرة وتبطّئ تحميل لوحة الأدمن).
  // العدد هنا تقديري ودقيق في أغلب الحالات: الزائر + عدد المرافقين.
  const totalPeople = (request.companions_count ?? 0) + 1

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'
  const isUnderReview = request.status === 'under_review' || request.status === 'pending'

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

  return (
    <div className={`${isDeleted ? 'bg-gradient-to-br from-gray-100 via-white to-white border-l-4 border-l-gray-400' : getBackgroundGradient()} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border-2 border-r-0 ${isDeleted ? '' : getBorderColor()} ${
      isNewRequest ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
    } w-full max-w-full overflow-hidden ${isDeleted ? 'opacity-75' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* المعلومات الأساسية */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {index !== undefined && (
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                    isNewRequest 
                      ? 'bg-blue-500 text-white animate-bounce' 
                      : isApproved 
                      ? 'bg-green-500 text-white' 
                      : isUnderReview
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    #{index + 1}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {hasBooking && (
                    <Ticket className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                      isBookingConfirmed ? 'text-teal-600' : 'text-orange-600'
                    }`} />
                  )}
                  <h3 className={`text-base sm:text-lg font-bold ${
                    isNewRequest ? 'text-blue-700' : 'text-gray-800'
                  } break-words max-w-full leading-snug`}>
                    {request.visitor_name}
                  </h3>
                </div>
                {isNewRequest && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                    جديد
                  </span>
                )}
                {isDraft && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                    غير مكتمل
                  </span>
                )}
                {isDeleted && (
                  <span className="px-2 py-0.5 bg-gray-600 text-white text-xs font-bold rounded-full">
                    محذوف
                  </span>
                )}
              </div>
              {userProfile?.full_name && (
                <p className="text-xs sm:text-sm text-gray-600 mb-2 flex items-center gap-1">
                  <span className="font-medium">المستخدم:</span>
                  <span>{userProfile.full_name}</span>
                  {userProfile.phone && (
                    <span className="text-gray-400">• {userProfile.phone}</span>
                  )}
                </p>
              )}
              {isDraft && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-xs font-bold"
                      title="فتح واتساب للتواصل"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                  )}
                  {callDigits && (
                    <a
                      href={`tel:${callDigits}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-black transition text-xs font-bold"
                      title="اتصال"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      اتصال
                    </a>
                  )}
                  {!waHref && !callDigits && (
                    <span className="text-xs text-gray-500">لا يوجد رقم تواصل محفوظ</span>
                  )}
                </div>
              )}
              {getStatusBadge(request.status)}
            </div>
            <div
              className="text-left bg-gray-50 rounded-lg p-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition w-full md:w-auto flex-shrink-0"
              role="button"
              tabIndex={0}
              onClick={onClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick()
              }}
              title="اضغط لفتح تفاصيل الطلب"
            >
              <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
              <div className="flex items-start sm:items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-mono text-gray-700 font-bold">
                  {shortRef}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyText(shortRef.replace('#', ''), 'تم نسخ رقم الطلب')
                    }}
                    className="p-1 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition"
                    title="نسخ رقم الطلب المختصر"
                    aria-label="نسخ رقم الطلب المختصر"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyText(request.id, 'تم نسخ ID كامل')
                    }}
                    className="p-1 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition"
                    title="نسخ ID كامل"
                    aria-label="نسخ ID كامل"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-700" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onClick()
                    }}
                    className="p-1 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition"
                    title="فتح التفاصيل"
                    aria-label="فتح التفاصيل"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                </div>
              </div>
              {isNewRequest && (
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  منذ {requestAge.hours} ساعة
                </p>
              )}
              {!isNewRequest && requestAge.days > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  منذ {requestAge.days} يوم
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm bg-white/50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-gray-700 bg-blue-50 rounded-lg p-2">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">تاريخ السفر</p>
                <span className="text-xs sm:text-sm font-medium">
                  {formatDate(request.travel_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 bg-green-50 rounded-lg p-2">
              <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">المدينة</p>
                <span className="text-xs sm:text-sm font-medium truncate">{request.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-700 bg-purple-50 rounded-lg p-2">
              <Users className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">عدد الأشخاص</p>
                <span className="text-xs sm:text-sm font-medium">
                  {totalPeople} {totalPeople > 1 ? 'أشخاص' : 'شخص'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className={`px-3 py-1.5 rounded-lg font-bold border-2 ${
              isJordanVisit 
                ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300' 
                : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200'
            }`}>
              {isJordanVisit ? '🇯🇴 زيارة الأردن' : getVisitTypeText(request.visit_type)}
            </span>
            {request.deposit_paid && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-lg font-bold flex items-center gap-1 border-2 border-green-300">
                <DollarSign className="w-3.5 h-3.5" />
                مدفوع
              </span>
            )}
            {request.deposit_amount && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-lg font-bold border-2 border-gray-300">
                {request.deposit_amount} JOD
              </span>
            )}
            {hasBooking && (
              <span className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 border-2 ${
                isBookingConfirmed
                  ? 'bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border-teal-300'
                  : 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300 animate-pulse'
              }`}>
                {isBookingConfirmed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ✓ محجوز
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    حجز بانتظار الموافقة
                  </>
                )}
              </span>
            )}
            {needsPaymentVerifyAfterPostApproval && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold border-2 border-blue-500 animate-pulse">
                استكمال مرسل • بانتظار تأكيد الدفع
              </span>
            )}
            {hasArrivalDate && request.arrival_date && request.trip_status !== 'scheduled_pending_approval' && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-lg font-bold flex items-center gap-1 border-2 border-purple-300">
                <Plane className="w-3.5 h-3.5" />
                قدوم: {formatDate(request.arrival_date)}
              </span>
            )}
            {isCompleted && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-bold border-2 border-gray-600">
                منتهي
              </span>
            )}
          </div>

          {/* معلومات الحجز الإضافية */}
          {hasBooking && request.arrival_date && (
            <div className="mt-3 p-2 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-teal-800">
                <Bus className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">رحلة محجوزة</span>
                {request.arrival_date && (
                  <span>• قدوم: {formatDate(request.arrival_date)}</span>
                )}
                {request.departure_date && (
                  <span>• مغادرة: {formatDate(request.departure_date)}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* شريط التقدم */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <ProgressBar request={request} compact={true} />
        </div>

        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {!isDeleted && (
            <Link
              href={`/admin/request/${request.id}/follow`}
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-blue-500"
              title="متابعة الطلب (مراحل)"
            >
              <Eye className="w-4 h-4" />
              متابعة الطلب
            </Link>
          )}
          {/* قائمة منسدلة للأزرار الإضافية */}
          {(canDelete || canRestore) && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-gray-700 border border-gray-300"
                title="المزيد من الخيارات"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <>
                  {/* Overlay لإغلاق القائمة عند النقر خارجها */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                    }}
                  />
                  
                  {/* القائمة المنسدلة */}
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 min-w-[140px]">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowMenu(false)
                          onDelete()
                        }}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition rounded-t-lg"
                        title="حذف الطلب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
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
                        className={`w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2 transition ${canDelete ? 'rounded-b-lg' : 'rounded-lg'}`}
                        title="استرجاع الطلب"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        استرجاع
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* التاريخ */}
        <div className="text-left sm:text-right bg-white/70 rounded-lg p-2 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1 font-medium">تاريخ الإنشاء</p>
          <p className="text-xs sm:text-sm font-bold text-gray-700">
            {formatDate(request.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}


