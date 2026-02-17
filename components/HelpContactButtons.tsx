'use client'

import { MessageCircle, Phone, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSupervisorContactForCustomer, getSupervisorForService, getSupervisorWhatsAppNumber, getSupervisorCallNumber, getSupervisorWithFullPermissions } from '@/lib/supervisor-utils'

type Props = {
  title?: string
  message?: string
  waNumber?: string // digits only, e.g. "962798905595"
  callNumber?: string // can include leading 00/+ digits
  className?: string
  userId?: string // معرف المستخدم للبحث عن المشرف المخصص
  visitType?: 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa' | null // نوع الخدمة
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
  visitType,
}: Props) {
  const [supervisorContact, setSupervisorContact] = useState<{ 
    contact_phone: string | null
    whatsapp_phone: string | null
    supervisor_name: string
    office_name: string | null
    display_type: 'office' | 'supervisor'
    display_name: string
  } | null>(null)
  const [loadingSupervisor, setLoadingSupervisor] = useState(false)

  useEffect(() => {
    if (!userId || !visitType) {
      setLoadingSupervisor(false)
      return
    }

    setLoadingSupervisor(true)

    // للزيارات (visit): البحث عن المشرف المخصص للمستخدم
    if (visitType === 'visit') {
      getSupervisorContactForCustomer(userId).then((contact) => {
        if (contact) {
          const displayName = contact.display_type === 'office' && contact.office_name
            ? contact.office_name
            : contact.supervisor_name
          
          setSupervisorContact({
            contact_phone: getSupervisorCallNumber(contact),
            whatsapp_phone: getSupervisorWhatsAppNumber(contact),
            supervisor_name: contact.supervisor_name,
            office_name: contact.office_name,
            display_type: contact.display_type,
            display_name: displayName,
          })
          setLoadingSupervisor(false)
        } else {
          // إذا لم يكن له مشرف مخصص، ابحث عن مشرف له صلاحيات كاملة
          getSupervisorWithFullPermissions().then((fullPermsContact) => {
            if (fullPermsContact) {
              const displayName = fullPermsContact.display_type === 'office' && fullPermsContact.office_name
                ? fullPermsContact.office_name
                : fullPermsContact.supervisor_name
              
              setSupervisorContact({
                contact_phone: getSupervisorCallNumber(fullPermsContact),
                whatsapp_phone: getSupervisorWhatsAppNumber(fullPermsContact),
                supervisor_name: fullPermsContact.supervisor_name,
                office_name: fullPermsContact.office_name,
                display_type: fullPermsContact.display_type,
                display_name: displayName,
              })
            }
            setLoadingSupervisor(false)
          }).catch(() => {
            setLoadingSupervisor(false)
          })
        }
      }).catch(() => {
        setLoadingSupervisor(false)
      })
    } else {
      // للخدمات الأخرى: البحث عن المشرف المخصص لهذه الخدمة حسب الصلاحيات
      getSupervisorForService(visitType).then((contact) => {
        if (contact) {
          const displayName = contact.display_type === 'office' && contact.office_name
            ? contact.office_name
            : contact.supervisor_name
          
          setSupervisorContact({
            contact_phone: getSupervisorCallNumber(contact),
            whatsapp_phone: getSupervisorWhatsAppNumber(contact),
            supervisor_name: contact.supervisor_name,
            office_name: contact.office_name,
            display_type: contact.display_type,
            display_name: displayName,
          })
        }
        setLoadingSupervisor(false)
      }).catch(() => {
        setLoadingSupervisor(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, visitType])

  // استخدام رقم المشرف إذا كان موجوداً (لجميع أنواع الخدمات)، وإلا استخدام الرقم الافتراضي (الإدمن)
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
          {supervisorContact.display_type === 'office' ? 'المكتب المخصص' : 'المشرف المخصص'}: {supervisorContact.display_name}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
          title={supervisorContact ? `واتساب ${supervisorContact.display_type === 'office' ? 'المكتب' : 'المشرف'}: ${supervisorContact.display_name}` : undefined}
        >
          <MessageCircle className="w-4 h-4" />
          واتساب للمساعدة
        </a>
        <a
          href={`tel:${callDigits}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          title={supervisorContact ? `اتصال ${supervisorContact.display_type === 'office' ? 'بالمكتب' : 'بالمشرف'}: ${supervisorContact.display_name}` : undefined}
        >
          <Phone className="w-4 h-4" />
          اتصال للمساعدة
        </a>
      </div>
      <p className="mt-2 text-[11px] sm:text-xs text-gray-600">
        {supervisorContact 
          ? `تواصل مع ${supervisorContact.display_type === 'office' ? 'مكتبك المخصص' : 'مشرفك المخصص'}: ${supervisorContact.display_name}`
          : 'إذا واجهت أي مشكلة، تواصل معنا وسنساعدك خطوة بخطوة.'}
      </p>
    </div>
  )
}


