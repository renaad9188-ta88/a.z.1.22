'use client'

import { User, Maximize2 } from 'lucide-react'

interface CompanionsListProps {
  companions: any[]
  signedPassportImages: { [key: string]: string }
  onOpenGallery: (images: string[], startIndex: number) => void
}

export default function CompanionsList({ companions, signedPassportImages, onOpenGallery }: CompanionsListProps) {
  if (companions.length === 0) return null

  return (
    <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
        <User className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>الأشخاص المسجلين ({companions.length})</span>
      </h2>
      <div className="space-y-3 sm:space-y-4">
        {companions.map((companion: any, index: number) => {
          const images = companion.passportImages || []
          return (
            <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm sm:text-base">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm sm:text-base text-gray-800">{companion.name || `شخص ${index + 1}`}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{images.length} صورة جواز</p>
                  </div>
                </div>
                {images.length > 0 && (
                  <button
                    onClick={() => {
                      const signedImages = images.map(url => signedPassportImages[url] || url)
                      onOpenGallery(signedImages, 0)
                    }}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm"
                  >
                    <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>عرض الصور</span>
                  </button>
                )}
              </div>
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-3">
                  {images.slice(0, 4).map((img: string, imgIndex: number) => {
                    const displayUrl = signedPassportImages[img] || img
                    return (
                      <div
                        key={imgIndex}
                        onClick={() => {
                          const signedImages = images.map(url => signedPassportImages[url] || url)
                          onOpenGallery(signedImages, imgIndex)
                        }}
                        className="relative aspect-video cursor-pointer group rounded-lg overflow-hidden border border-gray-300"
                      >
                        <img
                          src={displayUrl}
                          alt={`صورة جواز ${companion.name}`}
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
                        {images.length > 4 && imgIndex === 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">+{images.length - 4}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}



