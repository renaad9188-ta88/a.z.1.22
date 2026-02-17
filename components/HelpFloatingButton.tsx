'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle, X, MessageCircle, Phone, BookOpen, MapPin } from 'lucide-react'
import Link from 'next/link'
import { getSupervisorContactForCustomer, getSupervisorForService, getSupervisorWhatsAppNumber, getSupervisorCallNumber, getSupervisorWithFullPermissions } from '@/lib/supervisor-utils'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function HelpFloatingButton() {
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)
  const [supervisorContact, setSupervisorContact] = useState<{
    contact_phone: string | null
    whatsapp_phone: string | null
    display_name: string
    display_type: 'office' | 'supervisor'
  } | null>(null)

  useEffect(() => {
    // تحديد نوع الخدمة من URL
    const determineServiceType = (): 'visit' | 'umrah' | 'tourism' | 'goethe' | 'embassy' | 'visa' | 'other' | null => {
      if (!pathname) return null
      if (pathname.includes('/services/jordan-visit')) return 'visit'
      if (pathname.includes('/services/visa-services')) return 'visa'
      if (pathname.includes('/services/embassy-appointment')) return 'embassy'
      if (pathname.includes('/services/goethe-exam')) return 'goethe'
      if (pathname.includes('/services/other')) return 'other'
      return null
    }

    const serviceType = determineServiceType()

    // تحميل معلومات المشرف
    const loadSupervisorContact = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setSupervisorContact(null)
          return
        }

        let contact = null

        // للزيارات: البحث عن المشرف المخصص للمستخدم
        if (serviceType === 'visit') {
          contact = await getSupervisorContactForCustomer(user.id)
          if (!contact) {
            // إذا لم يكن له مشرف مخصص، ابحث عن مشرف له صلاحيات كاملة
            contact = await getSupervisorWithFullPermissions()
          }
        } else if (serviceType) {
          // للخدمات الأخرى: البحث عن المشرف المخصص لهذه الخدمة حسب الصلاحيات
          contact = await getSupervisorForService(serviceType)
        }

        if (contact) {
          const displayName = contact.display_type === 'office' && contact.office_name
            ? contact.office_name
            : contact.supervisor_name
          
          setSupervisorContact({
            contact_phone: getSupervisorCallNumber(contact),
            whatsapp_phone: getSupervisorWhatsAppNumber(contact),
            display_name: displayName,
            display_type: contact.display_type,
          })
        } else {
          setSupervisorContact(null)
        }
      } catch (error) {
        console.error('Error loading supervisor contact:', error)
        setSupervisorContact(null)
      }
    }

    loadSupervisorContact()
  }, [pathname])

  // استخدام رقم المشرف إذا كان موجوداً، وإلا الرقم الافتراضي
  const waNumber = supervisorContact?.whatsapp_phone || '962798905595'
  const callNumber = supervisorContact?.contact_phone || '00962798905595'
  
  const waDigits = String(waNumber).replace(/[^\d]/g, '')
  const callDigits = String(callNumber).replace(/[^\d+]/g, '')

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="مركز المساعدة"
      >
        <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Help Panel - Modal */}
      {showHelp && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={() => setShowHelp(false)}
          />
          
          {/* Panel - يظهر من الأسفل */}
          <div className="fixed bottom-20 left-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-base sm:text-lg">مركز المساعدة</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Supervisor Info */}
            {supervisorContact && (
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <p className="text-xs text-blue-700 font-semibold mb-1">
                  {supervisorContact.display_type === 'office' ? 'المكتب المخصص' : 'المشرف المخصص'}:
                </p>
                <p className="text-sm font-bold text-gray-800">{supervisorContact.display_name}</p>
              </div>
            )}
            
            {/* Quick Actions Icons */}
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs text-gray-600 mb-3 font-medium">وصول سريع:</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/services/jordan-visit"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-800">طلب زيارة</span>
                </Link>
                
                <Link
                  href="/map"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MapPin className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold text-gray-800">تتبع رحلة</span>
                </Link>
                
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-semibold text-gray-800">واتساب</span>
                </a>
                
                <a
                  href={`tel:${callDigits}`}
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-800">اتصال</span>
                </a>
              </div>
            </div>
            
            {/* Detailed Links */}
            <div className="p-4 space-y-3">
              <Link
                href="/services/jordan-visit"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">كيف أقدم طلب زيارة؟</p>
                  <p className="text-xs text-gray-600">دليل خطوة بخطوة</p>
                </div>
              </Link>
              
              <Link
                href="/map"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">تتبع رحلتي</p>
                  <p className="text-xs text-gray-600">عرض الخريطة والتتبع</p>
                </div>
              </Link>
              
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">واتساب للمساعدة</p>
                  <p className="text-xs text-gray-600">
                    {supervisorContact ? `تواصل مع ${supervisorContact.display_type === 'office' ? 'المكتب' : 'المشرف'}` : 'تواصل مباشر'}
                  </p>
                </div>
              </a>
              
              <a
                href={`tel:${callDigits}`}
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-gray-800">اتصال للمساعدة</p>
                  <p className="text-xs text-gray-600">{callNumber}</p>
                </div>
              </a>
            </div>
          </div>
        </>
      )}
    </>
  )
}

