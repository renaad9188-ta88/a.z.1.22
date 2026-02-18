'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle, X, MessageCircle, Phone, BookOpen, MapPin, Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getSupervisorContactForCustomer, getSupervisorForService, getSupervisorWhatsAppNumber, getSupervisorCallNumber, getSupervisorWithFullPermissions } from '@/lib/supervisor-utils'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import SupervisorGuide from './SupervisorGuide'

export default function HelpFloatingButton() {
  const pathname = usePathname()
  const [showHelp, setShowHelp] = useState(false)
  const [showSupervisorGuide, setShowSupervisorGuide] = useState(false)
  const [isSupervisor, setIsSupervisor] = useState(false)
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

    // Check if user is supervisor
    const checkSupervisor = async () => {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle()
          
          const userRole = (profile?.role || '').toLowerCase()
          setIsSupervisor(userRole === 'supervisor')
        } else {
          setIsSupervisor(false)
        }
      } catch (error) {
        console.error('Error checking supervisor:', error)
        setIsSupervisor(false)
      }
    }
    
    checkSupervisor()
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
        className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-40 w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label="مركز المساعدة"
      >
        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
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
          <div className="fixed bottom-16 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 z-50 bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl">
              <h3 className="font-bold text-sm sm:text-base md:text-lg">مركز المساعدة</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition flex-shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {/* Supervisor Guide Button - Only for Supervisors */}
            {isSupervisor && (
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <button
                  onClick={() => {
                    setShowHelp(false)
                    setShowSupervisorGuide(true)
                  }}
                  className="w-full flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition shadow-md hover:shadow-lg"
                >
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <div className="flex-1 text-right">
                    <p className="font-bold text-sm sm:text-base">دليل المشرف الشامل</p>
                    <p className="text-xs text-white/90">تعلم طريقة العمل والصلاحيات</p>
                  </div>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                </button>
              </div>
            )}

            {/* Supervisor Info - Only for regular users */}
            {!isSupervisor && supervisorContact && (
              <div className="p-3 sm:p-4 border-b border-gray-200 bg-blue-50">
                <p className="text-[10px] sm:text-xs text-blue-700 font-semibold mb-1">
                  {supervisorContact.display_type === 'office' ? 'المكتب المخصص' : 'المشرف المخصص'}:
                </p>
                <p className="text-xs sm:text-sm font-bold text-gray-800 truncate">{supervisorContact.display_name}</p>
              </div>
            )}
            
            {/* Quick Actions Icons */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3 font-medium">وصول سريع:</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/services/jordan-visit"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-800">طلب زيارة</span>
                </Link>
                
                <Link
                  href="/map"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-800">تتبع رحلة</span>
                </Link>
                
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
                >
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-800">واتساب</span>
                </a>
                
                <a
                  href={`tel:${callDigits}`}
                  onClick={() => setShowHelp(false)}
                  className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-800">اتصال</span>
                </a>
              </div>
            </div>
            
            {/* Detailed Links */}
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <Link
                href="/services/jordan-visit"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-gray-800">كيف أقدم طلب زيارة؟</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">دليل خطوة بخطوة</p>
                </div>
              </Link>
              
              <Link
                href="/map"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-gray-800">تتبع رحلتي</p>
                  <p className="text-[10px] sm:text-xs text-gray-600">عرض الخريطة والتتبع</p>
                </div>
              </Link>
              
              <a
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-50 hover:bg-green-100 rounded-lg transition"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-gray-800">واتساب للمساعدة</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                    {supervisorContact ? `تواصل مع ${supervisorContact.display_type === 'office' ? 'المكتب' : 'المشرف'}` : 'تواصل مباشر'}
                  </p>
                </div>
              </a>
              
              <a
                href={`tel:${callDigits}`}
                onClick={() => setShowHelp(false)}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs sm:text-sm text-gray-800">اتصال للمساعدة</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">{callNumber}</p>
                </div>
              </a>
            </div>
          </div>
        </>
      )}

      {/* Supervisor Guide Modal - Only for Supervisors */}
      {showSupervisorGuide && isSupervisor && (
        <SupervisorGuide onClose={() => setShowSupervisorGuide(false)} />
      )}
    </>
  )
}

