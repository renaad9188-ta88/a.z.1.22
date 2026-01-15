'use client'

import { User, Calendar, Phone, MessageCircle, DollarSign, Building2, Truck, StickyNote, Share2 } from 'lucide-react'
import { VisitRequest, AdminInfo } from './types'
import { getVisitTypeText } from './utils'

interface RequestInfoProps {
  request: VisitRequest
  adminInfo: AdminInfo | null
}

export default function RequestInfo({ request, adminInfo }: RequestInfoProps) {
  const supportPhoneLocal = '0798905595'
  const supportPhoneIntl = '+962798905595'
  const supportWaDigits = '962798905595'

  const buildShareText = () => {
    const lines: string[] = []
    lines.push('ملخص طلب منصة خدمات السوريين')
    lines.push(`رقم الطلب: ${request.id.slice(0, 8).toUpperCase()}`)
    lines.push(`الحالة: ${request.status}`)
    lines.push(`الزائر الرئيسي: ${request.visitor_name}`)
    lines.push(`المدينة: ${request.city}`)
    lines.push(`نوع الزيارة: ${getVisitTypeText(request.visit_type)}`)
    lines.push(`عدد الأيام: ${request.days_count}`)
    if (adminInfo?.jordanPhone) lines.push(`هاتف أردني: ${adminInfo.jordanPhone}`)
    if (adminInfo?.syrianPhone) lines.push(`واتساب/هاتف سوري: ${adminInfo.syrianPhone}`)
    if (adminInfo?.tourismCompany) lines.push(`الشركة المقدّم لها: ${adminInfo.tourismCompany}`)
    if (adminInfo?.transportCompany) lines.push(`شركة النقل: ${adminInfo.transportCompany}`)
    if (adminInfo?.note) lines.push(`ملاحظة: ${adminInfo.note}`)
    if (request.deposit_paid) lines.push('الدفع: مدفوع ✅')
    if (request.total_amount) lines.push(`المبلغ الإجمالي: ${request.total_amount} د.أ`)
    lines.push('')
    lines.push('للتنسيق: سيتم إرسال أرقام الهواتف والواتساب للتنسيق وفتح مجموعات القدوم والتتبع.')
    return lines.join('\n')
  }

  const handleShare = async () => {
    const text = buildShareText()
    const url = typeof window !== 'undefined' ? window.location.href : undefined
    try {
      // مشاركة نظامية (موبايل)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav: any = navigator
      if (nav?.share) {
        await nav.share({ text, url })
        return
      }
    } catch {
      // ignore and fallback
    }
    // fallback: واتساب نص فقط
    const encoded = encodeURIComponent(text + (url ? `\n\n${url}` : ''))
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer')
  }

  const handleSendToSupportWhatsApp = () => {
    const text = buildShareText()
    const url = typeof window !== 'undefined' ? window.location.href : undefined
    const encoded = encodeURIComponent(text + (url ? `\n\n${url}` : ''))
    window.open(`https://wa.me/${supportWaDigits}?text=${encoded}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* سبب الرفض */}
      {request.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <h3 className="font-semibold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">سبب الرفض:</h3>
          <p className="text-red-700 text-xs sm:text-sm">{request.rejection_reason}</p>
        </div>
      )}

      {/* شريط مشاركة سريع */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-3 sm:mb-4">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition text-sm font-semibold"
        >
          <Share2 className="w-4 h-4" />
          مشاركة التفاصيل
        </button>
        <button
          type="button"
          onClick={handleSendToSupportWhatsApp}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition text-sm font-semibold"
        >
          <MessageCircle className="w-4 h-4" />
          إرسال للدعم عبر واتساب
        </button>
      </div>

      {/* ملخص اختيارات الطلب (خصوصاً خدمة الأردن) */}
      {adminInfo && (adminInfo.tourismCompany || adminInfo.transportCompany || adminInfo.note || adminInfo.purpose) && (
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
            {adminInfo.transportCompany && (
              <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-2">
                <Truck className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-gray-600">شركة النقل</p>
                  <p className="font-semibold text-gray-800 break-words">{adminInfo.transportCompany}</p>
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
                <span className="font-semibold text-gray-800 mr-2 break-words">{adminInfo.purpose}</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
            سيتم إرسال أرقام الهواتف والواتساب للتنسيق وفتح مجموعات القدوم والتتبع.
          </p>
        </div>
      )}

      {/* معلومات التواصل (بيانات المستخدم + تواصل معنا) */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
        <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base flex items-center gap-2">
          <Phone className="w-4 h-4" />
          معلومات التواصل
        </h3>

        {adminInfo && (adminInfo.jordanPhone || adminInfo.syrianPhone) && (
          <div className="space-y-2 text-xs sm:text-sm mb-3">
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
        )}

        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">التواصل معنا</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <a
              href={`tel:${supportPhoneLocal}`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-sm font-semibold text-gray-800"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              {supportPhoneLocal}
            </a>
            <a
              href={`https://wa.me/${supportWaDigits}`}
              target="_blank"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition text-sm font-semibold text-white"
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </a>
          </div>
          <p className="mt-2 text-[11px] sm:text-xs text-gray-500">
            بديل دولي: <span className="font-mono">{supportPhoneIntl}</span>
          </p>
        </div>
      </div>

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




