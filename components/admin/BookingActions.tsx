'use client'

import { Calendar, MessageCircle, Phone } from 'lucide-react'
import { formatDate } from '@/lib/date-utils'

interface BookingActionsProps {
  request: {
    id: string
    user_id: string
    status: string
    admin_notes: string | null
    arrival_date: string | null
    trip_id?: string | null
  }
  userProfile: {
    whatsapp_phone?: string | null
    phone?: string | null
    jordan_phone?: string | null
  } | null
  saving: boolean
  isBookingConfirmed: boolean
  onEditSchedule: () => void
  onConfirmBooking: () => Promise<void>
}

export default function BookingActions({
  request,
  userProfile,
  saving,
  isBookingConfirmed,
  onEditSchedule,
  onConfirmBooking,
}: BookingActionsProps) {
  if (isBookingConfirmed) {
    const contactRaw = String(userProfile?.whatsapp_phone || userProfile?.phone || '')
    const waDigits = contactRaw.replace(/[^\d]/g, '')
    const callDigits = String(userProfile?.phone || userProfile?.jordan_phone || '').replace(/[^\d+]/g, '')
    
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        {request.trip_id && (
          <button
            type="button"
            onClick={onEditSchedule}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            تعديل الحجز
          </button>
        )}
        {waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            واتساب
          </a>
        )}
        {callDigits && (
          <a
            href={`tel:${callDigits}`}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            اتصال
          </a>
        )}
        {!waDigits && !callDigits && (
          <div className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
            لا يوجد رقم هاتف متاح
          </div>
        )}
      </div>
    )
  }
  
  return (
    <>
      <button
        type="button"
        onClick={onEditSchedule}
        disabled={saving || request.status !== 'approved'}
        className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-semibold disabled:opacity-50"
      >
        {request.arrival_date ? 'تعديل موعد القدوم' : 'تحديد موعد القدوم'}
      </button>
      <button
        type="button"
        onClick={onConfirmBooking}
        disabled={saving}
        className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50"
        title="يرسل للمستخدم رسالة تأكيد الحجز"
      >
        تأكيد الحجز
      </button>
      {request.arrival_date && (
        <div className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">
          الموعد: <span className="font-bold">{formatDate(request.arrival_date)}</span>
        </div>
      )}
    </>
  )
}

