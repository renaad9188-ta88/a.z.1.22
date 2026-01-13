'use client'

import { useState, useEffect } from 'react'
import { X, Save, User, Phone, Calendar, MapPin, FileText, Image as ImageIcon, MessageSquare } from 'lucide-react'
import { VisitRequest, UserProfile } from './types'
import { parseAdminNotes } from '../request-details/utils'
import { getSignedImageUrl } from '../request-details/utils'
import { formatDate } from '@/lib/date-utils'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface RequestDetailsModalProps {
  request: VisitRequest | null
  userProfile: UserProfile | null
  onClose: () => void
  onUpdate: () => void
}

export default function RequestDetailsModal({
  request,
  userProfile,
  onClose,
  onUpdate,
}: RequestDetailsModalProps) {
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('pending')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [adminResponse, setAdminResponse] = useState('')
  const [passportImages, setPassportImages] = useState<string[]>([])
  const [paymentImages, setPaymentImages] = useState<string[]>([])

  useEffect(() => {
    if (request) {
      setStatus(request.status)
      setRejectionReason(request.rejection_reason || '')
      setAdminNotes(request.admin_notes || '')
      
      // استخراج الرد السابق من admin_notes
      if (request.admin_notes) {
        const lines = request.admin_notes.split('\n')
        const responseIndex = lines.findIndex(line => line.includes('=== رد الإدارة ==='))
        if (responseIndex !== -1) {
          setAdminResponse(lines.slice(responseIndex + 1).join('\n'))
        }
      }

      // تحميل الصور
      loadImages()
    }
  }, [request])

  const loadImages = async () => {
    if (!request) return

    const images: string[] = []
    const payments: string[] = []

    // صورة الجواز الرئيسية
    if (request.passport_image_url) {
      const signedUrl = await getSignedImageUrl(request.passport_image_url, supabase)
      images.push(signedUrl)
    }

    // صور المرافقين
    if (request.companions_data && Array.isArray(request.companions_data)) {
      for (const companion of request.companions_data) {
        if (companion.passportImages && Array.isArray(companion.passportImages)) {
          for (const imgUrl of companion.passportImages) {
            const signedUrl = await getSignedImageUrl(imgUrl, supabase)
            images.push(signedUrl)
          }
        }
      }
    }

    // صور الدفعات
    const adminInfo = parseAdminNotes(request.admin_notes || '')
    if (adminInfo?.paymentImages) {
      for (const imgUrl of adminInfo.paymentImages) {
        const signedUrl = await getSignedImageUrl(imgUrl, supabase)
        payments.push(signedUrl)
      }
    }

    setPassportImages(images)
    setPaymentImages(payments)
  }

  const handleSave = async () => {
    if (!request) return

    setLoading(true)
    try {
      let updatedNotes = adminNotes

      // إضافة الرد الجديد
      if (adminResponse.trim()) {
        const responseSection = `\n\n=== رد الإدارة ===\n${adminResponse}\nتاريخ الرد: ${formatDate(new Date())}`
        updatedNotes = adminNotes ? adminNotes + responseSection : responseSection
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
        admin_notes: updatedNotes,
      }

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      } else if (status !== 'rejected') {
        updateData.rejection_reason = null
      }

      const { error } = await supabase
        .from('visit_requests')
        .update(updateData)
        .eq('id', request.id)

      if (error) throw error

      toast.success('تم تحديث الطلب بنجاح')
      onUpdate()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التحديث')
    } finally {
      setLoading(false)
    }
  }

  if (!request) return null

  const adminInfo = parseAdminNotes(request.admin_notes || '')
  const isJordanVisit = request.admin_notes?.includes('خدمة: زيارة الأردن لمدة شهر')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">تفاصيل الطلب</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6">
          {/* معلومات المستخدم */}
          {userProfile && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                معلومات المستخدم
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">الاسم:</span>
                  <span className="font-medium text-gray-800 mr-2">{userProfile.full_name || 'غير متوفر'}</span>
                </div>
                {userProfile.phone && (
                  <div>
                    <span className="text-gray-600">الهاتف:</span>
                    <span className="font-medium text-gray-800 mr-2">{userProfile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* معلومات الطلب */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              معلومات الطلب
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">اسم الزائر:</span>
                <span className="font-medium text-gray-800 mr-2">{request.visitor_name}</span>
              </div>
              <div>
                <span className="text-gray-600">المدينة:</span>
                <span className="font-medium text-gray-800 mr-2">{request.city}</span>
              </div>
              <div>
                <span className="text-gray-600">تاريخ السفر:</span>
                <span className="font-medium text-gray-800 mr-2">{formatDate(request.travel_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">عدد الأيام:</span>
                <span className="font-medium text-gray-800 mr-2">{request.days_count}</span>
              </div>
            </div>

            {/* معلومات طلب الأردن */}
            {isJordanVisit && adminInfo && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <h4 className="text-sm font-bold text-gray-700 mb-2">معلومات خاصة بطلب الأردن:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {adminInfo.jordanPhone && (
                    <div>
                      <span className="text-gray-600">الهاتف الأردني:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.jordanPhone}</span>
                    </div>
                  )}
                  {adminInfo.syrianPhone && (
                    <div>
                      <span className="text-gray-600">الهاتف السوري/واتساب:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.syrianPhone}</span>
                    </div>
                  )}
                  {adminInfo.purpose && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-600">الغرض:</span>
                      <span className="font-medium text-gray-800 mr-2">{adminInfo.purpose}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* صور الجوازات */}
          {passportImages.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-600" />
                صور الجوازات ({passportImages.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {passportImages.map((img, index) => (
                  <div key={index} className="relative aspect-[3/4] rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={img}
                      alt={`جواز ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* صور الدفعات */}
          {paymentImages.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-600" />
                صور الدفعات ({paymentImages.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {paymentImages.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={img}
                      alt={`دفعة ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* تحديث الحالة */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">تحديث حالة الطلب</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  <option value="pending">قيد المراجعة</option>
                  <option value="under_review">بانتظار الموافقة</option>
                  <option value="approved">تم القبول</option>
                  <option value="rejected">تم الرفض</option>
                </select>
              </div>

              {status === 'rejected' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">سبب الرفض</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    placeholder="أدخل سبب الرفض..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات الإدارة</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="أدخل ملاحظات إضافية..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  رد الإدارة (سيظهر للمستخدم)
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="اكتب ردك للمستخدم هنا... سيظهر هذا الرد في لوحة المستخدم"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm sm:text-base font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}


