'use client'

import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export default function ImageGallery({ images, currentIndex, onClose, onNext, onPrev }: ImageGalleryProps) {
  if (images.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 text-white hover:text-gray-300 z-10"
      >
        <X className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
      
      {currentIndex > 0 && (
        <button
          onClick={onPrev}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}
      
      {currentIndex < images.length - 1 && (
        <button
          onClick={onNext}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      )}

      <div className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`صورة ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ maxHeight: '90vh' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              parent.innerHTML = '<div class="text-white text-center"><p class="text-lg mb-2">فشل تحميل الصورة</p><p class="text-sm text-gray-400">يرجى المحاولة مرة أخرى</p></div>'
            }
          }}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm sm:text-base">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  )
}



