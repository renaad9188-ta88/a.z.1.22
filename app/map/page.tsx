'use client'

import HomeTransportMap from '@/components/HomeTransportMap'
import { MapPin } from 'lucide-react'

export default function MapPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md mb-4">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            تتبع رحلتي
          </h1>
          <p className="text-gray-600 mt-2">
            عرض الخريطة والتتبع لحظة بلحظة
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-8">
        <HomeTransportMap />
      </div>
    </div>
  )
}

