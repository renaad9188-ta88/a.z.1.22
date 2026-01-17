'use client'

import Link from 'next/link'
import { Clock, CheckCircle, XCircle, MapPin, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface RequestHeaderProps {
  requestId: string
  status: string
  trackingHref?: string
}

export default function RequestHeader({ requestId, status, trackingHref }: RequestHeaderProps) {
  const shortCode = requestId.slice(0, 8).toUpperCase()

  const copyText = async (text: string) => {
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
      toast.success('تم نسخ الكود')
    } catch (e) {
      console.error('Copy failed:', e)
      toast.error('تعذر النسخ')
    }
  }

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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-5 pb-3 sm:pb-5 border-b border-gray-200">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">تفاصيل الطلب</h1>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
          <span>رقم الكود:</span>
          <span className="font-mono font-bold text-gray-800">{shortCode}</span>
          <button
            type="button"
            onClick={() => copyText(shortCode)}
            className="p-1 rounded hover:bg-gray-100"
            title="نسخ الكود"
            aria-label="نسخ الكود"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {trackingHref && (
          <Link
            href={trackingHref}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-800"
          >
            <MapPin className="w-4 h-4 text-blue-600" />
            تتبّع على الخريطة
          </Link>
        )}
        {getStatusBadge(status)}
      </div>
    </div>
  )
}




