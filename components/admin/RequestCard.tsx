'use client'

import { formatDate } from '@/lib/date-utils'
import { VisitRequest } from './types'
import { Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Users, DollarSign, Plane } from 'lucide-react'

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
  const isNewRequest = requestAge.hours < 24

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
      pending: { 
        text: 'قيد المراجعة', 
        color: 'text-yellow-800', 
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        icon: Clock
      },
      under_review: { 
        text: 'بانتظار الموافقة', 
        color: 'text-blue-800', 
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        icon: Eye
      },
      approved: { 
        text: 'تم القبول', 
        color: 'text-green-800', 
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        icon: CheckCircle
      },
      rejected: { 
        text: 'تم الرفض', 
        color: 'text-red-800', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        icon: XCircle
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
    }
    return types[type] || type
  }

  // التحقق من نوع الطلب (هل هو طلب أردن)
  const isJordanVisit = request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر')
  const companionsCount = request.companions_data && Array.isArray(request.companions_data) 
    ? request.companions_data.length 
    : request.companions_count || 0

  // حساب عدد الأشخاص بشكل صحيح
  // - الافتراضي: (الزائر الرئيسي = 1) + عدد المرافقين
  // - طلبات الأردن القديمة كانت تخزّن "كل الأشخاص" داخل companions_data (بما فيهم الرئيسي)
  //   نكتشف ذلك إذا كان أي عنصر في companions_data يحتوي passport_image_url الخاص بالرئيسي
  const companionsData: any[] = request.companions_data && Array.isArray(request.companions_data)
    ? (request.companions_data as any[])
    : []
  const primaryPassportUrl = request.passport_image_url
  const companionsContainPrimaryPassport =
    Boolean(isJordanVisit && primaryPassportUrl) &&
    companionsData.some((c: any) =>
      Array.isArray(c?.passportImages) && c.passportImages.includes(primaryPassportUrl)
    )

  const totalPeople = companionsContainPrimaryPassport
    ? companionsData.length // بيانات قديمة: companions_data يحتوي الرئيسي بالفعل
    : companionsCount + 1   // بيانات صحيحة: companions_count/companions_data = مرافقين فقط

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'
  const isUnderReview = request.status === 'under_review' || request.status === 'pending'

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
          <div className="flex items-start justify-between gap-3">
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
            <div className="text-left bg-gray-50 rounded-lg p-2 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
              <p className="text-xs sm:text-sm font-mono text-gray-700 font-bold">
                #{request.id.slice(0, 8).toUpperCase()}
              </p>
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
          {isApproved && !isCompleted && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onScheduleTrip?.()
              }}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 ${
                request.trip_status === 'scheduled_pending_approval'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                  : hasArrivalDate
                  ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 hover:from-purple-200 hover:to-purple-300 border-2 border-purple-300'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <Plane className="w-4 h-4" />
              {request.trip_status === 'scheduled_pending_approval'
                ? 'الموافقة على الحجز'
                : hasArrivalDate
                ? 'تعديل الموعد'
                : 'حجز موعد الرحلة'}
            </button>
          )}
          <button
            onClick={onClick}
            className="px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 border-2 border-gray-300"
          >
            <Eye className="w-4 h-4" />
            التفاصيل
          </button>
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


