'use client'

import { MessageCircle, Phone, HelpCircle } from 'lucide-react'

type Props = {
  title?: string
  message?: string
  waNumber?: string // digits only, e.g. "962798905595"
  callNumber?: string // can include leading 00/+ digits
  className?: string
}

const DEFAULT_WA = '962798905595'
const DEFAULT_CALL = '00962798905595'

export default function HelpContactButtons({
  title = 'مساعدة؟ تواصل معنا',
  message,
  waNumber = DEFAULT_WA,
  callNumber = DEFAULT_CALL,
  className = '',
}: Props) {
  const waDigits = String(waNumber).replace(/[^\d]/g, '')
  const callDigits = String(callNumber).replace(/[^\d+]/g, '')
  const waHref = message
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${waDigits}`

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
        >
          <MessageCircle className="w-4 h-4" />
          واتساب للمساعدة
        </a>
        <a
          href={`tel:${callDigits}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
        >
          <Phone className="w-4 h-4" />
          اتصال للمساعدة
        </a>
      </div>
      <p className="mt-2 text-[11px] sm:text-xs text-gray-600">إذا واجهت أي مشكلة، تواصل معنا وسنساعدك خطوة بخطوة.</p>
    </div>
  )
}


