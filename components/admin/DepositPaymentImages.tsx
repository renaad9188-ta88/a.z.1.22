'use client'

import { DollarSign } from 'lucide-react'

interface DepositPaymentImagesProps {
  imageUrls: string[]
  originalUrls?: string[]
}

export default function DepositPaymentImages({
  imageUrls,
  originalUrls = [],
}: DepositPaymentImagesProps) {
  if (imageUrls.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <p className="font-bold text-blue-900 text-sm">صور الدفعة الأولية ({imageUrls.length})</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {imageUrls.map((url, index) => (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={url}
              alt={`صورة الدفعة ${index + 1}`}
              className="w-full h-48 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition"
              onError={(e) => {
                console.error('Error loading payment image:', e)
                // في حالة فشل تحميل الصورة، حاول استخدام الرابط الأصلي
                const originalUrl = originalUrls[index]
                if (originalUrl && originalUrl !== url) {
                  (e.target as HTMLImageElement).src = originalUrl
                }
              }}
            />
          </a>
        ))}
      </div>
      <p className="text-xs text-blue-800">
        يرجى التحقق من صحة الدفعة قبل الضغط على &quot;تم استلام الطلب&quot;
      </p>
    </div>
  )
}



