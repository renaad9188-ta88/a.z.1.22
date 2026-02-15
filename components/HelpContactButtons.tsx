'use client'

import { MessageCircle, Phone, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupervisorContactForCustomer, getSupervisorWhatsAppNumber, getSupervisorCallNumber } from '@/lib/supervisor-utils'

type Props = {
  title?: string
  message?: string
  waNumber?: string // digits only, e.g. "962798905595"
  callNumber?: string // can include leading 00/+ digits
  className?: string
  userId?: string // معرف المستخدم للبحث عن المشرف المخصص
}

const DEFAULT_WA = '962798905595'
const DEFAULT_CALL = '00962798905595'

export default function HelpContactButtons({
  title = 'مساعدة؟ تواصل معنا',
  message,
  waNumber = DEFAULT_WA,
  callNumber = DEFAULT_CALL,
  className = '',
  userId,
}: Props) {
  const [supervisorContact, setSupervisorContact] = useState<{ contact_phone: string | null; whatsapp_phone: string | null; supervisor_name: string } | null>(null)
  const [loadingSupervisor, setLoadingSupervisor] = useState(false)

  useEffect(() => {
    if (userId) {
      setLoadingSupervisor(true)
      getSupervisorContactForCustomer(userId).then((contact) => {
        if (contact) {
          setSupervisorContact({
            contact_phone: getSupervisorCallNumber(contact),
            whatsapp_phone: getSupervisorWhatsAppNumber(contact),
            supervisor_name: contact.supervisor_name,
          })
        }
        setLoadingSupervisor(false)
      }).catch(() => {
        setLoadingSupervisor(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // استخدام رقم المشرف إذا كان متاحاً، وإلا استخدام الرقم الافتراضي
  const finalWaNumber = supervisorContact?.whatsapp_phone || waNumber
  const finalCallNumber = supervisorContact?.contact_phone || callNumber

  const waDigits = String(finalWaNumber).replace(/[^\d]/g, '')
  const callDigits = String(finalCallNumber).replace(/[^\d+]/g, '')
  const waHref = message
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${waDigits}`

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-4 h-4 text-blue-600" />
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
      </div>
      {supervisorContact && (
        <div className="mb-2 text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded">
          المشرف المخصص: {supervisorContact.supervisor_name}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
          title={supervisorContact ? `واتساب المشرف: ${supervisorContact.supervisor_name}` : undefined}
        >
          <MessageCircle className="w-4 h-4" />
          واتساب للمساعدة
        </a>
        <a
          href={`tel:${callDigits}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          title={supervisorContact ? `اتصال بالمشرف: ${supervisorContact.supervisor_name}` : undefined}
        >
          <Phone className="w-4 h-4" />
          اتصال للمساعدة
        </a>
      </div>
      <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
        {supervisorContact 
          ? `تواصل مع مشرفك المخصص: ${supervisorContact.supervisor_name}`
          : 'إذا واجهت أي مشكلة، تواصل معنا وسنساعدك خطوة بخطوة.'}
      </p>
    </div>
  )
}


