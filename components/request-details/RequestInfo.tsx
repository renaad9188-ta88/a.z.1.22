'use client'

import { User, Calendar, Phone, MessageCircle, DollarSign, Building2, StickyNote } from 'lucide-react'
import { VisitRequest, AdminInfo } from './types'
import { getVisitTypeText } from './utils'

interface RequestInfoProps {
  request: VisitRequest
  adminInfo: AdminInfo | null
}

export default function RequestInfo({ request, adminInfo }: RequestInfoProps) {
  const defaultPurpose = 'زيارات الاقارب ( سياحة )'

  return (
    <>
      {/* سبب الرفض */}
      {request.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-semibold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">سبب الرفض:</h3>
          <p className="text-red-700 text-xs sm:text-sm">{request.rejection_reason}</p>
        </div>
      )}

      {/* ملخص اختيارات الطلب */}
      {adminInfo && (adminInfo.tourismCompany || adminInfo.note || adminInfo.purpose) && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <h3 className="font-bold text-gray-800 mb-2 text-sm sm:text-base">ملخص اختياراتك</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
            {adminInfo.tourismCompany && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-gray-600">الشركة المقدّم لها</p>
                  <p className="font-semibold text-gray-800 break-words">{adminInfo.tourismCompany}</p>
                </div>
              </div>
            )}
            {adminInfo.note && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2 sm:col-span-2">
                <StickyNote className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-gray-600">ملاحظة</p>
                  <p className="font-semibold text-gray-800 break-words">{adminInfo.note}</p>
                </div>
              </div>
            )}
            {adminInfo.purpose && (
              <div className="sm:col-span-2 text-gray-700">
                <span className="text-gray-600">الغرض من الزيارة:</span>
                <span className="font-semibold text-gray-800 mr-2 break-words">
                  {adminInfo.purpose === 'غير محدد' ? defaultPurpose : adminInfo.purpose}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* معلومات التواصل (بيانات المستخدم فقط) */}
      {adminInfo && (adminInfo.jordanPhone || adminInfo.syrianPhone) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base flex items-center gap-2">
            <Phone className="w-4 h-4" />
            معلومات التواصل
          </h3>
          <div className="space-y-2 text-xs sm:text-sm">
            {adminInfo.jordanPhone && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600">هاتفك الأردني:</span>
                <a href={`tel:${adminInfo.jordanPhone}`} className="text-blue-700 hover:underline font-semibold">
                  {adminInfo.jordanPhone}
                </a>
              </div>
            )}
            {adminInfo.syrianPhone && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-600">واتساب/هاتف سوري:</span>
                <a
                  href={`https://wa.me/${adminInfo.syrianPhone.replace(/[^\d]/g, '').replace(/^00/, '')}`}
                  target="_blank"
                  className="text-green-700 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  {adminInfo.syrianPhone}
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* البيانات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {/* بيانات الزائر */}
        <div className="bg-gray-50 p-3 sm:p-4 md:p-5 rounded-lg">
          <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>بيانات الزائر</span>
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">الاسم الكامل</p>
              <p className="font-semibold text-sm sm:text-base">{request.visitor_name}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">الجنسية</p>
              <p className="font-semibold text-sm sm:text-base">{request.nationality}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">المدينة</p>
              <p className="font-semibold text-sm sm:text-base">{request.city}</p>
            </div>
          </div>
        </div>

        {/* بيانات الرحلة */}
        <div className="bg-gray-50 p-3 sm:p-4 md:p-5 rounded-lg">
          <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>بيانات الرحلة</span>
          </h2>
          <div className="space-y-2 sm:space-y-3">
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">نوع الزيارة</p>
              <p className="font-semibold text-sm sm:text-base">{getVisitTypeText(request.visit_type)}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">عدد الأيام</p>
              <p className="font-semibold text-sm sm:text-base">{request.days_count} يوم</p>
            </div>
          </div>
        </div>
      </div>

      {/* معلومات الدفع */}
      <div className="bg-gray-50 p-3 sm:p-4 md:p-5 rounded-lg mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>معلومات الدفع</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-xs sm:text-sm text-gray-600 mb-1">حالة العربون</p>
            <p className={`font-semibold text-sm sm:text-base ${request.deposit_paid ? 'text-green-600' : 'text-red-600'}`}>
              {request.deposit_paid ? '✓ مدفوع' : '✗ غير مدفوع'}
            </p>
          </div>
          {request.deposit_amount && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">مبلغ العربون</p>
              <p className="font-semibold text-sm sm:text-base">{request.deposit_amount} د.أ</p>
            </div>
          )}
          {request.total_amount && (
            <div>
              <p className="text-xs sm:text-sm text-gray-600 mb-1">المبلغ الإجمالي</p>
              <p className="font-semibold text-sm sm:text-base">{request.total_amount} د.أ</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}




