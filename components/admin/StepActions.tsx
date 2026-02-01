'use client'

import { Clock, MessageCircle, Phone, DollarSign } from 'lucide-react'
import DepositPaymentImages from './DepositPaymentImages'
import RemainingPaymentImage from './RemainingPaymentImage'

interface StepActionsProps {
  activeStep: number
  request: {
    status: string
    admin_notes: string | null
    deposit_paid?: boolean | null
    payment_verified: boolean | null
    remaining_amount: number | null
  }
  saving: boolean
  depositPaymentImageUrls: string[]
  remainingPaymentImageUrl: string | null
  adminInfo: any
  waDigits: string
  callDigits: string
  onReceive: () => void
  onRequestClearerPassport: () => void
  onRequestCompleteData: () => void
  onApprove: () => void
  onReject: () => void
  onVerifyPayment: () => void
  onUnverifyPayment: () => void
}

export default function StepActions({
  activeStep,
  request,
  saving,
  depositPaymentImageUrls,
  remainingPaymentImageUrl,
  adminInfo,
  waDigits,
  callDigits,
  onReceive,
  onRequestClearerPassport,
  onRequestCompleteData,
  onApprove,
  onReject,
  onVerifyPayment,
  onUnverifyPayment,
}: StepActionsProps) {
  if (activeStep === 1) {
    const notes = (request?.admin_notes || '') as string
    const isDraft = notes.startsWith('[DRAFT]')
    const isPending = request?.status === 'pending'
    const depositPaid = Boolean(request?.deposit_paid)
    
    const canReceive = isPending && !isDraft && depositPaid
    
    if (!canReceive) {
      return (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="font-extrabold text-amber-900 text-sm">
              {isDraft
                ? 'المستخدم رفع الجواز - بانتظار دفع الرسوم وإرسال الطلب'
                : !depositPaid
                ? 'المستخدم رفع الجواز - بانتظار دفع الرسوم'
                : 'بانتظار إرسال الطلب من المستخدم'}
            </p>
          </div>
          <p className="text-sm text-amber-800">
            {isDraft
              ? 'المستخدم قام برفع الجواز لكن لم يدفع الرسوم ولم يرسل الطلب بعد. سيتم تفعيل زر "استلام الطلب" بعد دفع الرسوم وإرسال الطلب.'
              : !depositPaid
              ? 'المستخدم قام برفع الجواز لكن لم يدفع الرسوم بعد. سيتم تفعيل زر "استلام الطلب" بعد دفع الرسوم وإرسال الطلب.'
              : 'المستخدم لم يرسل الطلب بعد. سيتم تفعيل زر "استلام الطلب" بعد إرسال الطلب.'}
          </p>
          <div className="bg-white border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-gray-700">
              <strong>ملاحظة:</strong> لا يمكنك استلام الطلب أو الموافقة عليه قبل أن يدفع المستخدم الرسوم ويرسل الطلب.
            </p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <p className="font-extrabold text-gray-900 text-sm">المستخدم أرسل الطلب - جاهز للاستلام</p>
            <p className="text-xs text-gray-600 mt-1">اضغط &quot;تم استلام الطلب&quot; لإرسال رد تلقائي للمستخدم وتسجيل الاستلام.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {waDigits && (
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-semibold inline-flex items-center gap-2"
                title="واتساب"
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </a>
            )}
            {callDigits && (
              <a
                href={`tel:${callDigits}`}
                className="px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition text-xs font-semibold inline-flex items-center gap-2"
                title="اتصال"
              >
                <Phone className="w-4 h-4" />
                اتصال
              </a>
            )}
          </div>
        </div>

        <DepositPaymentImages
          imageUrls={depositPaymentImageUrls}
          originalUrls={adminInfo?.paymentImages}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onReceive}
            disabled={saving}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تم استلام الطلب
          </button>
          <button
            type="button"
            onClick={onRequestClearerPassport}
            disabled={saving}
            className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            طلب صورة أوضح للجواز
          </button>
          <button
            type="button"
            onClick={onRequestCompleteData}
            disabled={saving}
            className="px-4 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-black transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            طلب إكمال النواقص
          </button>
        </div>
      </div>
    )
  }

  if (activeStep === 2) {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={saving || request.status === 'approved'}
          className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
        >
          قبول الطلب
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={saving || request.status === 'rejected'}
          className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold disabled:opacity-50"
        >
          رفض الطلب
        </button>
      </div>
    )
  }

  if (activeStep === 3) {
    const remaining = request.remaining_amount ?? 20
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <p className="font-extrabold text-gray-900 text-sm">تأكيد دفع المبلغ المتبقي</p>
        </div>
        
        <RemainingPaymentImage
          imageUrl={remainingPaymentImageUrl}
          loading={(() => {
            const notes = (request?.admin_notes || '') as string
            const match = notes.match(/صورة الدفع المتبقي:\s*([^\n]+)/)
            return Boolean(match?.[1]?.trim() && !remainingPaymentImageUrl)
          })()}
          remaining={remaining}
          paymentVerified={request.payment_verified}
          saving={saving}
          onVerify={onVerifyPayment}
          onUnverify={onUnverifyPayment}
        />
      </div>
    )
  }

  return null
}

