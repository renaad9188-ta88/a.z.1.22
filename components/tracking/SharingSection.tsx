'use client'

import { Share2, Smartphone, Copy } from 'lucide-react'

interface SharingSectionProps {
  sharingLocation: boolean
  geoError: string | null
  onShareLocation: () => void
  onCopyLink: () => void
}

export default function SharingSection({
  sharingLocation,
  geoError,
  onShareLocation,
  onCopyLink,
}: SharingSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 font-bold text-gray-800">
        <Share2 className="w-5 h-5 text-purple-600" />
        مشاركة
      </div>
      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={onShareLocation}
          disabled={sharingLocation}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
        >
          <Smartphone className="w-4 h-4" />
          {sharingLocation ? 'جاري تحديد الموقع...' : 'مشاركة موقعي الحالي عبر واتساب'}
        </button>

        <button
          type="button"
          onClick={onCopyLink}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-sm font-semibold text-gray-800"
        >
          <Copy className="w-4 h-4 text-gray-600" />
          نسخ رابط التتبع
        </button>
      </div>
      <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
        ملاحظة: قد يطلب المتصفح صلاحية الموقع. إذا رفضت، سنرسل رابط التتبع عبر واتساب بدل الموقع.
      </p>
      {geoError && (
        <div className="mt-2 text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 leading-relaxed">
          {geoError}
        </div>
      )}
    </div>
  )
}



