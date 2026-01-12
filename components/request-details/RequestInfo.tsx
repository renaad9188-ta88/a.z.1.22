'use client'

import { User, Calendar, Phone, MessageCircle, DollarSign } from 'lucide-react'
import { VisitRequest, AdminInfo } from './types'
import { getVisitTypeText } from './utils'

interface RequestInfoProps {
  request: VisitRequest
  adminInfo: AdminInfo | null
}

export default function RequestInfo({ request, adminInfo }: RequestInfoProps) {
  return (
    <>
      {/* سبب الرفض */}
      {request.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-semibold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">سبب الرفض:</h3>
          <p className="text-red-700 text-xs sm:text-sm">{request.rejection_reason}</p>
        </div>
      )}

      {/* معلومات التواصل */}
      {adminInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base flex items-center gap-2">
            <Phone className="w-4 h-4" />
            معلومات التواصل
          </h3>
          <div className="space-y-2 text-xs sm:text-sm">
            {adminInfo.jordanPhone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">الهاتف الأردني:</span>
                <a href={`tel:${adminInfo.jordanPhone}`} className="text-blue-600 hover:underline font-semibold">
                  {adminInfo.jordanPhone}
                </a>
              </div>
            )}
            {adminInfo.syrianPhone && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">الهاتف السوري / واتساب:</span>
                <a 
                  href={`https://wa.me/${adminInfo.syrianPhone.replace(/[^\d]/g, '')}`} 
                  target="_blank"
                  className="text-green-600 hover:underline font-semibold flex items-center gap-1"
                >
                  {adminInfo.syrianPhone}
                  <MessageCircle className="w-3 h-3" />
                </a>
              </div>
            )}
            {adminInfo.purpose && (
              <div>
                <span className="text-gray-600">الغرض من الزيارة:</span>
                <span className="text-gray-800 font-semibold mr-2">{adminInfo.purpose}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* البيانات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* بيانات الزائر */}
        <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg">
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
        <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg">
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
      <div className="bg-gray-50 p-4 sm:p-5 md:p-6 rounded-lg mb-4 sm:mb-6">
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


