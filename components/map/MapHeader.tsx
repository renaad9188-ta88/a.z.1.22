'use client'

import { MapPin } from 'lucide-react'

export default function MapHeader() {
  return (
    <div className="mb-3 sm:mb-4">
      <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        خريطة تسلسل الرحلة والمسار
      </h3>
      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
        رحلة حالية إن وجدت — وإن لم توجد نعرض نموذج رحلة مع نقاط التوقف ورسم المسار
      </p>
    </div>
  )
}

