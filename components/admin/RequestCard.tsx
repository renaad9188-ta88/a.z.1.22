'use client'

import { formatDate } from '@/lib/date-utils'
import { VisitRequest } from './types'
import { Clock, CheckCircle, XCircle, Eye, Calendar, MapPin, Users, DollarSign, Plane } from 'lucide-react'

interface RequestCardProps {
  request: VisitRequest
  userProfile?: { full_name: string | null; phone: string | null }
  onClick: () => void
  onScheduleTrip?: () => void
}

export default function RequestCard({ request, userProfile, onClick, onScheduleTrip }: RequestCardProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; bgColor: string; icon: any }> = {
      pending: { 
        text: 'قيد المراجعة', 
        color: 'text-yellow-800', 
        bgColor: 'bg-yellow-100',
        icon: Clock
      },
      under_review: { 
        text: 'بانتظار الموافقة', 
        color: 'text-purple-800', 
        bgColor: 'bg-purple-100',
        icon: Eye
      },
      approved: { 
        text: 'تم القبول', 
        color: 'text-green-800', 
        bgColor: 'bg-green-100',
        icon: CheckCircle
      },
      rejected: { 
        text: 'تم الرفض', 
        color: 'text-red-800', 
        bgColor: 'bg-red-100',
        icon: XCircle
      },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
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

  const isApproved = request.status === 'approved'
  const hasArrivalDate = request.arrival_date !== null
  const isCompleted = request.status === 'completed' || request.trip_status === 'completed'

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-4 sm:p-6 border border-gray-200 hover:border-blue-300">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* المعلومات الأساسية */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                {request.visitor_name}
              </h3>
              {userProfile?.full_name && (
                <p className="text-xs sm:text-sm text-gray-600 mb-2">
                  المستخدم: {userProfile.full_name}
                </p>
              )}
              {getStatusBadge(request.status)}
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
              <p className="text-xs sm:text-sm font-mono text-gray-700">
                #{request.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                {formatDate(request.travel_date)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm truncate">{request.city}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-xs sm:text-sm">
                {companionsCount + 1} {companionsCount > 0 ? 'أشخاص' : 'شخص'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">
              {isJordanVisit ? '🇯🇴 زيارة الأردن' : getVisitTypeText(request.visit_type)}
            </span>
            {request.deposit_paid && (
              <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-lg font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                مدفوع
              </span>
            )}
            {request.deposit_amount && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                {request.deposit_amount} JOD
              </span>
            )}
            {request.trip_status === 'scheduled_pending_approval' && (
              <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                حجز بانتظار الموافقة
              </span>
            )}
            {hasArrivalDate && request.arrival_date && request.trip_status !== 'scheduled_pending_approval' && (
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg font-medium flex items-center gap-1">
                <Plane className="w-3 h-3" />
                قدوم: {formatDate(request.arrival_date)}
              </span>
            )}
            {isCompleted && (
              <span className="px-2.5 py-1 bg-gray-800 text-white rounded-lg font-medium">
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
              className={`px-4 py-2 rounded-lg font-medium text-sm sm:text-base transition flex items-center justify-center gap-2 ${
                request.trip_status === 'scheduled_pending_approval'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : hasArrivalDate
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
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
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            التفاصيل
          </button>
        </div>

        {/* التاريخ */}
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500 mb-1">تاريخ الإنشاء</p>
          <p className="text-xs sm:text-sm font-medium text-gray-700">
            {formatDate(request.created_at)}
          </p>
        </div>
      </div>
    </div>
  )
}


