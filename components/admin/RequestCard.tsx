'use client'

import { formatDate } from '@/lib/date-utils'
import { VisitRequest } from './types'
import { Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Users, DollarSign, Plane, Copy, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { parseAdminNotes } from '../request-details/utils'
import Link from 'next/link'

interface RequestCardProps {
  request: VisitRequest
  userProfile?: { full_name: string | null; phone: string | null }
  onClick: () => void
  onScheduleTrip?: () => void
  index?: number
}

export default function RequestCard({ request, userProfile, onClick, onScheduleTrip, index }: RequestCardProps) {
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
    }
    return types[type] || type
  }

  // التحقق من نوع الطلب (هل هو طلب أردن)
  const isJordanVisit = Boolean(request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر'))
  const adminInfo = parseAdminNotes((request.admin_notes || '') as string) || {}
  // سيتم حساب isCompleted لاحقاً ثم نستخدمه هنا (بعد تعريفه)

  // ملاحظة أداء: لا نعتمد على companions_data في بطاقة القائمة (قد تكون كبيرة وتبطّئ تحميل لوحة الأدمن).
  // العدد هنا تقديري ودقيق في أغلب الحالات: الزائر + عدد المرافقين.
  const totalPeople = (request.companions_count ?? 0) + 1

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'
  const isUnderReview = request.status === 'under_review' || request.status === 'pending'

  const needsPaymentVerifyAfterPostApproval =
    request.status === 'approved' &&
    !isCompleted &&
    !Boolean((request as any)?.payment_verified) &&
    (adminInfo?.postApprovalStatus || '') === 'مرسل'

  // تحديد لون الحدود حسب الحالة
  const getBorderColor = () => {
    if (isNewRequest) return 'border-l-4 border-l-blue-500 shadow-blue-100 bg-gradient-to-r from-blue-50/30 to-white'
    if (isApproved) return 'border-l-4 border-l-green-500 shadow-green-100 bg-gradient-to-r from-green-50/30 to-white'
    if (isUnderReview) return 'border-l-4 border-l-yellow-500 shadow-yellow-100 bg-gradient-to-r from-yellow-50/30 to-white'
    if (isCompleted) return 'border-l-4 border-l-gray-400 shadow-gray-100 bg-gradient-to-r from-gray-50/30 to-white'
    return 'border-l-4 border-l-purple-500 shadow-purple-100 bg-gradient-to-r from-purple-50/30 to-white'
  }

  // تحديد لون الخلفية حسب الحالة
  const getBackgroundGradient = () => {
    if (isNewRequest) return 'bg-gradient-to-br from-blue-50 via-white to-white'
    if (isApproved) return 'bg-gradient-to-br from-green-50 via-white to-white'
    if (isUnderReview) return 'bg-gradient-to-br from-yellow-50 via-white to-white'
    if (isCompleted) return 'bg-gradient-to-br from-gray-50 via-white to-white'
    return 'bg-gradient-to-br from-purple-50 via-white to-white'
  }

  return (
    <div className={`${getBackgroundGradient()} rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-4 sm:p-6 border-2 border-r-0 ${getBorderColor()} ${
      isNewRequest ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
    } transform hover:scale-[1.01]`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* المعلومات الأساسية */}
        <div className="flex-1 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
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
                <h3 className={`text-base sm:text-lg font-bold ${
                  isNewRequest ? 'text-blue-700' : 'text-gray-800'
                } break-words max-w-full leading-snug`}>
                  {request.visitor_name}
                </h3>
                {isNewRequest && (
                  <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                    جديد
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
              {getStatusBadge(request.status)}
            </div>
            <div
              className="text-left bg-gray-50 rounded-lg p-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition w-full sm:w-auto"
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-white/50 rounded-lg p-3 border border-gray-100">
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
            {request.trip_status === 'scheduled_pending_approval' && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 rounded-lg font-bold flex items-center gap-1 border-2 border-orange-300 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                حجز بانتظار الموافقة
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
        </div>

        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Link
            href={`/admin/request/${request.id}/follow`}
            onClick={(e) => e.stopPropagation()}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-blue-500"
            title="متابعة الطلب (مراحل)"
          >
            <Eye className="w-4 h-4" />
            متابعة الطلب
          </Link>
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


