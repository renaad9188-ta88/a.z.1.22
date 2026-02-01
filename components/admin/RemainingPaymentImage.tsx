'use client'

import { DollarSign } from 'lucide-react'

interface RemainingPaymentImageProps {
  imageUrl: string | null
  loading: boolean
  remaining: number
  paymentVerified: boolean | null
  saving: boolean
  onVerify: () => void
  onUnverify: () => void
}

export default function RemainingPaymentImage({
  imageUrl,
  loading,
  remaining,
  paymentVerified,
  saving,
  onVerify,
  onUnverify,
}: RemainingPaymentImageProps) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800 mb-2 font-semibold">صورة الدفع المتبقي المرفوعة:</p>
        <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-300 flex items-center justify-center">
          <p className="text-gray-500 text-sm">جاري تحميل الصورة...</p>
        </div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          بانتظار رفع المستخدم لصورة الدفع المتبقي ({remaining} دينار). بعد الرفع، سيتم إشعارك.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800 mb-2 font-semibold">صورة الدفع المتبقي المرفوعة:</p>
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={imageUrl}
            alt="صورة الدفع المتبقي"
            className="w-full h-48 object-cover rounded-lg border border-gray-300"
            onError={(e) => {
              console.error('Error loading payment image:', e)
            }}
          />
        </a>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <p className="text-xs text-gray-700 mb-2">
          المبلغ المتبقي: <span className="font-bold text-blue-700">{remaining} دينار</span>
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          يشمل: الحجز + الموافقة + الإجراءات + توقيع الكفالة + تصوير الكفالة + رفعها على الموقع
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onVerify}
          disabled={saving || Boolean(paymentVerified)}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
        >
          تأكيد الدفع (فتح الحجز)
        </button>
        <button
          type="button"
          onClick={onUnverify}
          disabled={saving || !Boolean(paymentVerified)}
          className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-sm font-semibold disabled:opacity-50"
        >
          إلغاء تأكيد الدفع
        </button>
      </div>
    </div>
  )
}



