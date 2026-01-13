'use client'

import { Clock, CheckCircle, XCircle } from 'lucide-react'

interface RequestHeaderProps {
  requestId: string
  status: string
}

export default function RequestHeader({ requestId, status }: RequestHeaderProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string; icon: any }> = {
      pending: { text: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      under_review: { text: 'بانتظار الموافقة', color: 'bg-blue-100 text-blue-800', icon: Clock },
      approved: { text: 'تم القبول', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { text: 'تم الرفض', color: 'bg-red-100 text-red-800', icon: XCircle },
    }

    const statusInfo = statusMap[status] || statusMap.pending
    const Icon = statusInfo.icon

    return (
      <span className={`inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full text-xs sm:text-sm font-medium ${statusInfo.color}`}>
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
        <span>{statusInfo.text}</span>
      </span>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8 pb-4 sm:pb-6 border-b border-gray-200">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">تفاصيل الطلب</h1>
        <p className="text-xs sm:text-sm text-gray-600">رقم الطلب: {requestId.slice(0, 8)}</p>
      </div>
      {getStatusBadge(status)}
    </div>
  )
}



