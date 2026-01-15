'use client'

import { DollarSign } from 'lucide-react'

interface PaymentImagesProps {
  paymentImages: string[]
  signedPaymentImages: { [key: string]: string }
  onOpenGallery: (images: string[], startIndex: number) => void
}

export default function PaymentImages({ paymentImages, signedPaymentImages, onOpenGallery }: PaymentImagesProps) {
  if (paymentImages.length === 0) return null

  return (
    <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>صور الدفعات ({paymentImages.length})</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {paymentImages.map((img: string, index: number) => {
          const displayUrl = signedPaymentImages[img] || img
          return (
            <div
              key={index}
              onClick={() => {
                const signedImages = paymentImages.map(url => signedPaymentImages[url] || url)
                onOpenGallery(signedImages, index)
              }}
              className="relative aspect-video cursor-pointer group rounded-lg overflow-hidden border border-gray-300"
            >
              <img
                src={displayUrl}
                alt={`صورة دفعة ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">فشل تحميل الصورة</div>'
                  }
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}




