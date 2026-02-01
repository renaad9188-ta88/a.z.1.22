'use client'

import { DollarSign, CheckCircle, Upload, X } from 'lucide-react'

interface RemainingPaymentSectionProps {
  remaining: number
  uploadedImageUrl: string | null
  preview: string | null
  uploading: boolean
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePreview: () => void
  onUpload: () => void
}

export default function RemainingPaymentSection({
  remaining,
  uploadedImageUrl,
  preview,
  uploading,
  onFileSelect,
  onRemovePreview,
  onUpload,
}: RemainingPaymentSectionProps) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="w-5 h-5 text-blue-600" />
        <h4 className="font-bold text-blue-800">دفع المبلغ المتبقي</h4>
      </div>
      <div className="bg-white rounded-lg p-3 mb-3">
        <p className="text-sm font-semibold text-gray-800 mb-2">
          المبلغ المتبقي: <span className="text-blue-700 text-lg">{remaining} دينار</span>
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          يشمل: الحجز + الموافقة + الإجراءات + توقيع الكفالة + تصوير الكفالة + رفعها على الموقع
        </p>
      </div>

      {/* عرض الصورة المرفوعة إذا كانت موجودة */}
      {uploadedImageUrl ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-bold text-green-800 text-sm">تم رفع صورة الدفع المتبقي</p>
          </div>
          <a
            href={uploadedImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={uploadedImageUrl}
              alt="صورة الدفع المتبقي المرفوعة"
              className="w-full h-48 object-cover rounded-lg border border-gray-300 hover:opacity-90 transition"
            />
          </a>
          <p className="text-xs text-green-800">
            تم رفع صورة الدفع. بانتظار مراجعة الإدارة وتأكيد الدفع لفتح الحجز.
          </p>
        </div>
      ) : (
        /* رفع صورة الدفع */
        <>
          {!preview ? (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={onFileSelect}
                className="hidden"
                id="remaining-payment-upload"
              />
              <label
                htmlFor="remaining-payment-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-blue-400 mb-2" />
                <span className="text-sm text-gray-700 mb-1">اضغط لرفع صورة الدفع</span>
                <span className="text-xs text-gray-500">الحجم الأقصى: 5 ميجابايت</span>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="صورة الدفع المتبقي"
                className="w-full h-48 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={onRemovePreview}
                className="absolute top-2 left-2 bg-red-600 text-white rounded-full p-1.5 hover:bg-red-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading}
                className="mt-3 w-full px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
              >
                {uploading ? 'جاري الرفع...' : 'رفع صورة الدفع'}
              </button>
            </div>
          )}
        </>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          بعد رفع صورة الدفع، سيتم مراجعتها من الإدارة. بعد التأكيد سيتم فتح الحجز.
        </p>
      </div>
    </div>
  )
}



